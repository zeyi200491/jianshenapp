from __future__ import annotations

import json
import logging
import time
from uuid import uuid4

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


logger = logging.getLogger("audit")

_SENSITIVE_FIELDS = frozenset({
    "user_profile", "diet_plan", "training_plan", "question",
    "knowledge_snippets", "answer_strategy", "adjusted_plan",
    "answer", "tips", "content", "user_id",
})


def _redact_json_body(body_str: str) -> str:
    if not body_str:
        return body_str
    try:
        data = json.loads(body_str)
        if isinstance(data, dict):
            redacted = {
                k: ("[REDACTED]" if k in _SENSITIVE_FIELDS else v)
                for k, v in data.items()
            }
            return json.dumps(redacted, ensure_ascii=False)
        return "[REDACTED]"
    except (json.JSONDecodeError, TypeError):
        if len(body_str) > 200:
            return body_str[:200] + "..."
        return body_str


class AuditLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-Id", f"req_{uuid4().hex}")
        request.state.request_id = request_id
        started = time.perf_counter()

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
                        "error": "服务内部异常",
                    },
                    ensure_ascii=False,
                )
            )
            raise

