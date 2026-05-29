"""Product catalog + semantic search endpoints (API v1)."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.models import Product
from app.schemas.schemas import ProductOut

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[ProductOut])
async def list_products(
    category: str | None = Query(default=None),
    q: str | None = Query(default=None, description="text search"),
    db: AsyncSession = Depends(get_db),
):
    """List products with optional category filter and text search."""
    stmt = select(Product)
    if category:
        stmt = stmt.where(Product.category == category)
    if q:
        stmt = stmt.where(Product.name.ilike(f"%{q}%"))
    rows = (await db.execute(stmt)).scalars().all()
    return rows


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: str, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(
        select(Product).where(Product.id == product_id))).scalar_one_or_none()
    return row
