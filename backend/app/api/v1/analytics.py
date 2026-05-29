"""Analytics dashboard endpoints (API v1)."""

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import EngagementEvent, Product
from app.schemas.schemas import AnalyticsSummary

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
async def analytics_summary(
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """Aggregate behavioral KPIs for the analytics dashboard."""
    events = (await db.execute(select(EngagementEvent))).scalars().all()

    total_dwell = sum(e.dwell_ms for e in events) // 1000
    total_views = len(events)
    avg_eng = round(sum(e.engagement_score for e in events) / len(events)) if events else 0

    # Top engaged products
    by_product: dict[str, int] = {}
    for e in events:
        by_product[e.product_id] = max(by_product.get(e.product_id, 0), e.engagement_score)
    top_ids = sorted(by_product, key=by_product.get, reverse=True)[:6]
    top_products = []
    category_affinity: dict[str, int] = {}
    for pid in top_ids:
        p = (await db.execute(select(Product).where(Product.id == pid))).scalar_one_or_none()
        if p:
            top_products.append({"id": p.id, "name": p.name, "score": by_product[pid]})
            category_affinity[p.category] = category_affinity.get(p.category, 0) + by_product[pid]

    return AnalyticsSummary(
        total_dwell_seconds=total_dwell,
        total_views=total_views,
        avg_engagement=avg_eng,
        top_products=top_products,
        category_affinity=category_affinity,
    )
