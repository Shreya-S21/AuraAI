"""API v1 router aggregator.

Versioning decision: every public route is mounted under /api/v1 so we
can introduce a /api/v2 with breaking changes without disrupting clients.
"""

from fastapi import APIRouter

from app.api.v1 import products, engagement, recommendations, analytics

api_router = APIRouter()
api_router.include_router(products.router)
api_router.include_router(engagement.router)
api_router.include_router(recommendations.router)
api_router.include_router(analytics.router)
