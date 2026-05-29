"""Recommendation endpoints (API v1)."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Product, Embedding, EngagementEvent
from app.schemas.schemas import RecommendationOut, ProductOut
from app.services.recommendation_service import recommendation_service
from app.services.vector_search import vector_search

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("", response_model=list[RecommendationOut])
async def get_recommendations(
    limit: int = 4,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Generate recommendations from the user's behavioral session:
    build taste vector -> FAISS search -> explainable reasons.
    """
    # 1) Gather engaged products + their embeddings & weights.
    events = (await db.execute(select(EngagementEvent))).scalars().all()
    engaged: list[dict] = []
    weight_by_product: dict[str, int] = {}
    for e in events:
        weight_by_product[e.product_id] = max(
            weight_by_product.get(e.product_id, 0), e.engagement_score)

    # Collect engaged products' tags/categories so explanations are meaningful.
    tag_weight: dict[str, int] = {}
    cat_weight: dict[str, int] = {}
    for pid, weight in weight_by_product.items():
        emb = (await db.execute(
            select(Embedding).where(Embedding.product_id == pid)
        )).scalar_one_or_none()
        prod = (await db.execute(
            select(Product).where(Product.id == pid)
        )).scalar_one_or_none()
        if emb:
            engaged.append({"vector": emb.vector, "weight": weight})
        if prod:
            for t in (prod.tags or []):
                tag_weight[t] = tag_weight.get(t, 0) + weight
            cat_weight[prod.category] = cat_weight.get(prod.category, 0) + weight

    top_tags = sorted(tag_weight, key=tag_weight.get, reverse=True)[:3]
    top_category = max(cat_weight, key=cat_weight.get) if cat_weight else None

    taste = recommendation_service.build_taste_vector(engaged)
    if taste is None:
        return []

    # 2a) Self-heal: if the in-memory FAISS index is empty (e.g. after a
    #     container restart before lifespan finished), rebuild it from the DB.
    if not vector_search.is_ready:
        import numpy as np
        rows = (await db.execute(select(Embedding))).scalars().all()
        if rows:
            vector_search.build(
                [r.product_id for r in rows],
                np.array([r.vector for r in rows], dtype="float32"),
            )

    # 2b) FAISS nearest neighbours.
    hits = vector_search.search(taste, k=limit + len(weight_by_product))

    # 3) Resolve + explain (skip already heavily-engaged items).
    out: list[RecommendationOut] = []
    for pid, sim in hits:
        if pid in weight_by_product:
            continue
        product = (await db.execute(
            select(Product).where(Product.id == pid))).scalar_one_or_none()
        if not product:
            continue
        reasons = recommendation_service.explain(
            product.tags or [], top_tags, product.category, top_category, sim)
        out.append(RecommendationOut(
            product=ProductOut.model_validate(product),
            match_score=round(sim * 100),
            explanation=reasons,
        ))
        if len(out) >= limit:
            break
    return out
