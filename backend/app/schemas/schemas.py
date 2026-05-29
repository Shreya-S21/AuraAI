"""Pydantic schemas (API contracts / DTOs).

We keep request/response models separate from ORM models so the
public API surface is decoupled from the DB representation.
"""

from __future__ import annotations
import datetime as dt
from pydantic import BaseModel, Field


# ---------- Products ----------
class ProductOut(BaseModel):
    id: str
    name: str
    brand: str
    category: str
    price: float
    rating: float
    tags: list[str]
    image_url: str | None = None

    class Config:
        from_attributes = True


# ---------- Engagement ----------
class EngagementIn(BaseModel):
    session_id: str
    product_id: str
    dwell_ms: int = Field(ge=0)
    attention: float = Field(ge=0, le=1)
    pose_stability: float = Field(ge=0, le=1, default=0.0)


class EngagementOut(EngagementIn):
    id: str
    engagement_score: int
    created_at: dt.datetime

    class Config:
        from_attributes = True


# ---------- Recommendations ----------
class RecommendationOut(BaseModel):
    product: ProductOut
    match_score: int
    explanation: list[str]


# ---------- Sessions ----------
class SessionCreate(BaseModel):
    camera_enabled: bool = False


class SessionOut(BaseModel):
    id: str
    started_at: dt.datetime
    camera_enabled: bool

    class Config:
        from_attributes = True


# ---------- Analytics ----------
class AnalyticsSummary(BaseModel):
    total_dwell_seconds: int
    total_views: int
    avg_engagement: int
    top_products: list[dict]
    category_affinity: dict[str, int]
