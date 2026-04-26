from __future__ import annotations

import json
import logging
import time
from uuid import uuid4

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


logger = logging.getLogger("audit")


class AuditLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-Id", f"req_{uuid4().hex}")
        request.state.request_id = request_id
        started = time.perf_counter()
        request_body = await request.body()

        try:
            response = await call_next(request)
            body = b""
            async for chunk in response.body_iterator:
                body += chunk

            elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
            payload = {
                "type": "http_access",
                "requestId": request_id,
                "method": request.method,
                "path": request.url.path,
                "query": str(request.url.query),
                "statusCode": response.status_code,
                "elapsedMs": elapsed_ms,
                "requestBody": _safe_decode(request_body),
                "responseBody": _safe_decode(body),
            }
            logger.info(json.dumps(payload, ensure_ascii=False))

            headers = dict(response.headers)
            headers["X-Request-Id"] = request_id
            return Response(
                content=body,
                status_code=response.status_code,
                headers=headers,
                media_type=response.media_type,
                background=response.background,
            )
        except Exception as exc:
            logger.error(
                json.dumps(
                    {
                        "type": "http_error",
                        "requestId": request_id,
                        "method": request.method,
                        "path": request.url.path,
                        "requestBody": _safe_decode(request_body),
                        "error": str(exc),
                    },
                    ensure_ascii=False,
                )
            )
            raise


def _safe_decode(data: bytes, limit: int = 4000) -> str:
    text = data.decode("utf-8", errors="ignore")
    return text[:limit]
