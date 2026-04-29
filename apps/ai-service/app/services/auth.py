from __future__ import annotations

import logging
import os

import jwt
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.errors import AppError

logger = logging.getLogger("auth")

JWT_ALGORITHM = "HS256"

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


async def require_auth(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
) -> dict[str, object]:
    secret = _get_optional_jwt_secret()
    if not secret:
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

    request.state.user_id = payload.get("sub", "")
    request.state.user_role = payload.get("role", "user")
    return payload


async def optional_auth(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
) -> dict[str, object] | None:
    secret = _get_optional_jwt_secret()
    if not secret or not credentials:
        request.state.user_id = ""
        request.state.user_role = "anonymous"
        return None

    token = credentials.credentials
    try:
        payload = jwt.decode(token, secret, algorithms=[JWT_ALGORITHM])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        request.state.user_id = ""
        request.state.user_role = "anonymous"
        return None

    request.state.user_id = payload.get("sub", "")
    request.state.user_role = payload.get("role", "user")
    return payload
