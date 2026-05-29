"""Engagement ingestion + webcam frame analysis endpoints (API v1)."""

from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.schemas import EngagementIn, EngagementOut
from app.models.models import EngagementEvent
from app.services.engagement_service import engagement_service

router = APIRouter(prefix="/engagement", tags=["engagement"])


@router.post("", response_model=EngagementOut)
async def record_engagement(
    payload: EngagementIn,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """Persist a behavioral engagement signal for a product."""
    score = engagement_service.engagement_score(
        payload.dwell_ms, payload.attention, views=1)
    event = EngagementEvent(
        session_id=payload.session_id,
        product_id=payload.product_id,
        dwell_ms=payload.dwell_ms,
        attention=payload.attention,
        pose_stability=payload.pose_stability,
        engagement_score=score,
    )
    db.add(event)
    await db.flush()
    return event


@router.post("/frame")
async def analyze_frame(
    frame: UploadFile = File(...),
    _user=Depends(get_current_user),
):
    """
    Analyze a single webcam frame and return behavioral signals.
    Runs the MediaPipe/OpenCV head-pose + attention pipeline.
    No image is stored — only derived numeric signals are returned.
    """
    data = await frame.read()
    return engagement_service.process_frame(data)
