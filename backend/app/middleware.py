"""Custom middleware: request timing + correlation logging."""

import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from loguru import logger


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Attach a request id, log latency, and surface it in a header."""

    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())[:8]
        start = time.perf_counter()
        response = await call_next(request)
        elapsed = (time.perf_counter() - start) * 1000
        logger.info(f"[{request_id}] {request.method} {request.url.path} "
                    f"-> {response.status_code} ({elapsed:.1f}ms)")
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time-ms"] = f"{elapsed:.1f}"
        return response
