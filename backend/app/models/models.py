"""
SQLAlchemy ORM models == the PostgreSQL database schema.

Tables:
  users                 - authenticated shoppers (Clerk/Auth0 subject id)
  products              - catalog
  embeddings            - CLIP vectors per product (1:1 with products)
  sessions              - a browsing session per user
  engagement_events     - raw behavioral signals (dwell/attention/views)
  recommendations       - generated recs + explanation + match score
  interaction_history   - normalized interaction log for analytics

Design note: embeddings are stored as a Postgres ARRAY(float). For
large catalogs use the `pgvector` extension (Vector column) — the
FAISS index is the hot-path search structure, Postgres is the source
of truth.
"""

from __future__ import annotations
import datetime as dt
import uuid

from sqlalchemy import (
    String, Integer, Float, ForeignKey, DateTime, JSON, Text, Boolean,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    auth_subject: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), index=True)
    display_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)

    sessions: Mapped[list[Session]] = relationship(back_populates="user")


class Product(Base):
    __tablename__ = "products"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(200), index=True)
    brand: Mapped[str] = mapped_column(String(120), index=True)
    category: Mapped[str] = mapped_column(String(80), index=True)
    price: Mapped[float] = mapped_column(Float)
    rating: Mapped[float] = mapped_column(Float, default=0.0)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)

    embedding: Mapped[Embedding] = relationship(back_populates="product", uselist=False)


class Embedding(Base):
    __tablename__ = "embeddings"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"), unique=True)
    vector: Mapped[list[float]] = mapped_column(ARRAY(Float))  # CLIP embedding
    model: Mapped[str] = mapped_column(String(60), default="ViT-B/32")

    product: Mapped[Product] = relationship(back_populates="embedding")


class Session(Base):
    __tablename__ = "sessions"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    started_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)
    ended_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    camera_enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped[User] = relationship(back_populates="sessions")
    events: Mapped[list[EngagementEvent]] = relationship(back_populates="session")


class EngagementEvent(Base):
    """Raw behavioral signal. NOT emotion — presence/attention/dwell only."""
    __tablename__ = "engagement_events"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), index=True)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"), index=True)
    dwell_ms: Mapped[int] = mapped_column(Integer, default=0)
    attention: Mapped[float] = mapped_column(Float, default=0.0)   # 0..1 proxy
    pose_stability: Mapped[float] = mapped_column(Float, default=0.0)
    engagement_score: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)

    session: Mapped[Session] = relationship(back_populates="events")


class Recommendation(Base):
    __tablename__ = "recommendations"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"))
    match_score: Mapped[int] = mapped_column(Integer)
    explanation: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)


class InteractionHistory(Base):
    __tablename__ = "interaction_history"
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"))
    action: Mapped[str] = mapped_column(String(40))  # view | like | add_to_bag
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)
