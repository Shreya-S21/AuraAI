"""
JWT auth dependency for Clerk / Auth0.

We verify RS256 tokens against the provider's JWKS endpoint. The
decoded `sub` claim is the stable user identifier we map to our
`users` table. In DEBUG mode auth can be bypassed for local dev.
"""

from __future__ import annotations
import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt

from app.core.config import settings

bearer = HTTPBearer(auto_error=False)
_jwks_cache: dict | None = None


async def _get_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache is None and settings.AUTH_JWKS_URL:
        async with httpx.AsyncClient() as client:
            resp = await client.get(settings.AUTH_JWKS_URL)
            _jwks_cache = resp.json()
    return _jwks_cache or {"keys": []}


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> dict:
    """Return the verified token claims, or a dev user in DEBUG mode."""
    if settings.DEBUG and creds is None:
        return {"sub": "dev-user", "email": "dev@auraai.local"}

    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing token")

    try:
        jwks = await _get_jwks()
        claims = jwt.decode(
            creds.credentials,
            jwks,
            algorithms=["RS256"],
            audience=settings.AUTH_AUDIENCE or None,
            issuer=settings.AUTH_ISSUER or None,
            options={"verify_aud": bool(settings.AUTH_AUDIENCE)},
        )
        return claims
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status.HTTP_401_UNAUTHORIZED,
                            f"Invalid token: {exc}") from exc
