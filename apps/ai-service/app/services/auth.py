from __future__ import annotations

import logging
import os
import secrets

import jwt
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.errors import AppError

logger = logging.getLogger("auth")

JWT_ALGORITHM = "HS256"
INTERNAL_SERVICE_HEADER = "X-CampusFit-Service-Token"

security_scheme = HTTPBearer(auto_error=False)


def _get_jwt_secret() -> str:
    secret = os.environ.get("JWT_SECRET", "").strip()
    if not secret:
        raise AppError(
            code="INTERNAL_ERROR",
            message="服务配置错误",
            status_code=500,
        )
    return secret


def _get_optional_jwt_secret() -> str | None:
    secret = os.environ.get("JWT_SECRET", "").strip()
    return secret or None


def _has_internal_service_token(request: Request, secret: str | None) -> bool:
    if not secret:
        return False

    service_token = request.headers.get(INTERNAL_SERVICE_HEADER, "").strip()
    if not service_token:
        return False

    return secrets.compare_digest(service_token, secret)


def _set_request_identity(request: Request, *, user_id: str, role: str) -> None:
    request.state.user_id = user_id
    request.state.user_role = role


async def require_auth(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
) -> dict[str, object]:
    secret = _get_optional_jwt_secret()

    if _has_internal_service_token(request, secret):
        _set_request_identity(request, user_id="internal-service", role="service")
        return {"sub": "internal-service", "role": "service"}

    if not secret:
        _set_request_identity(request, user_id="unauthenticated", role="user")
        return {"sub": "unauthenticated", "role": "user"}

    if not credentials:
        raise AppError(
            code="UNAUTHORIZED",
            message="缺少认证令牌",
            status_code=401,
        )

    token = credentials.credentials
    try:
        payload = jwt.decode(token, secret, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise AppError(
            code="UNAUTHORIZED",
            message="认证令牌已过期",
            status_code=401,
        ) from None
    except jwt.InvalidTokenError:
        raise AppError(
            code="UNAUTHORIZED",
            message="认证令牌无效",
            status_code=401,
        ) from None

    _set_request_identity(
        request,
        user_id=payload.get("sub", ""),
        role=payload.get("role", "user"),
    )
    return payload


async def optional_auth(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
) -> dict[str, object] | None:
    secret = _get_optional_jwt_secret()

    if _has_internal_service_token(request, secret):
        _set_request_identity(request, user_id="internal-service", role="service")
        return {"sub": "internal-service", "role": "service"}

    if not secret or not credentials:
        _set_request_identity(request, user_id="", role="anonymous")
        return None

    token = credentials.credentials
    try:
        payload = jwt.decode(token, secret, algorithms=[JWT_ALGORITHM])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        _set_request_identity(request, user_id="", role="anonymous")
        return None

    _set_request_identity(
        request,
        user_id=payload.get("sub", ""),
        role=payload.get("role", "user"),
    )
    return payload
