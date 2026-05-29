"""
AuraAI FastAPI application entrypoint.

Wires together: config, logging, CORS, custom middleware, global error
handling, API v1 router, and a startup hook that hydrates the FAISS
index from PostgreSQL.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger
import numpy as np
from sqlalchemy import select

from app.core.config import settings
from app.core.logging import setup_logging
from app.core.database import SessionLocal
from app.middleware import RequestContextMiddleware
from app.api.v1.router import api_router
from app.models.models import Embedding
from app.services.vector_search import vector_search


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Startup: load CLIP embeddings from DB into the FAISS index."""
    setup_logging()
    logger.info(f"Starting {settings.APP_NAME}")
    try:
        async with SessionLocal() as db:
            rows = (await db.execute(select(Embedding))).scalars().all()
            if rows:
                ids = [r.product_id for r in rows]
                vecs = np.array([r.vector for r in rows], dtype="float32")
                vector_search.build(ids, vecs)
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"FAISS hydrate skipped: {exc}")
    yield
    logger.info("Shutting down AuraAI")


app = FastAPI(
    title=f"{settings.APP_NAME} API",
    version="1.0.0",
    description="Behavioral recommendation intelligence — CLIP + FAISS + MediaPipe",
    lifespan=lifespan,
)

# --- Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestContextMiddleware)


# --- Global error handler ---
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled error on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "path": request.url.path},
    )


@app.get("/health", tags=["meta"])
async def health():
    return {"status": "ok", "app": settings.APP_NAME}


app.include_router(api_router, prefix=settings.API_V1_PREFIX)
