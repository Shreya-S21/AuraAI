"""
Centralized application configuration.

Architecture decision: all environment-driven settings live in one
typed Settings object (pydantic-settings) so the rest of the codebase
never reads os.environ directly. This makes config testable and the
12-factor "config in env" principle easy to follow.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- App ---
    APP_NAME: str = "AuraAI"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "https://auraai.vercel.app"]

    # --- Database ---
    DATABASE_URL: str = "postgresql+asyncpg://aura:aura@localhost:5432/auraai"

    # --- Auth (Clerk / Auth0) ---
    AUTH_ISSUER: str = ""          # e.g. https://your-tenant.clerk.accounts.dev
    AUTH_AUDIENCE: str = ""        # API identifier
    AUTH_JWKS_URL: str = ""        # JWKS endpoint for RS256 verification

    # --- AI ---
    CLIP_MODEL: str = "ViT-B/32"
    EMBEDDING_DIM: int = 512
    FAISS_INDEX_PATH: str = "data/faiss.index"


@lru_cache
def get_settings() -> Settings:
    """Cached singleton so we parse env exactly once per process."""
    s = Settings()
    # Railway/Heroku hand out `postgres://` or `postgresql://`; SQLAlchemy's
    # async engine needs the asyncpg driver. Normalize automatically so the
    # app doesn't crash on deploy with a "dialect not async" error.
    url = s.DATABASE_URL
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    s.DATABASE_URL = url
    return s


settings = get_settings()
