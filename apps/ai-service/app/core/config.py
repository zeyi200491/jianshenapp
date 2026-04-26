from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Mapping

from pydantic import BaseModel, Field


class Settings(BaseModel):
    ai_env: str = Field(default="local")
    ai_provider: str = Field(default="mock")
    ai_model: str = Field(default="campusfit-mock")
    ai_timeout_seconds: int = Field(default=12)
    ai_openai_base_url: str | None = Field(default=None)
    ai_openai_api_key: str | None = Field(default=None)
    log_level: str = Field(default="INFO")
    log_dir: str = Field(default="logs")
    cors_origins: list[str] = Field(default_factory=lambda: ["http://127.0.0.1:3200", "http://localhost:3200"])

    @property
    def base_dir(self) -> Path:
        return Path(__file__).resolve().parents[2]

    @property
    def prompt_dir(self) -> Path:
        return self.base_dir / "app" / "prompts"

    @property
    def knowledge_path(self) -> Path:
        return self.base_dir / "app" / "knowledge" / "knowledge_base.json"

    @property
    def audit_log_path(self) -> Path:
        return self.base_dir / self.log_dir / "requests.log"

    @property
    def provider_ready(self) -> bool:
        return self.provider_issue is None

    @property
    def provider_issue(self) -> str | None:
        if self.ai_provider == "mock":
            return None
        if self.ai_provider == "openai_compatible":
            missing: list[str] = []
            if not self.ai_openai_base_url:
                missing.append("AI_OPENAI_BASE_URL")
            if not self.ai_openai_api_key:
                missing.append("AI_OPENAI_API_KEY")
            if missing:
                return f"缺少配置：{', '.join(missing)}"
            return None
        return f"未支持的 provider：{self.ai_provider}"


def _normalize_env_value(value: str | None) -> str | None:
    if value is None:
        return None

    normalized = value.strip()
    if not normalized:
        return None

    if (normalized.startswith('"') and normalized.endswith('"')) or (
        normalized.startswith("'") and normalized.endswith("'")
    ):
        normalized = normalized[1:-1].strip()

    return normalized or None


def _parse_env_file(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}

    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, raw_value = line.split("=", 1)
        value = _normalize_env_value(raw_value)
        if key.strip() and value is not None:
            values[key.strip()] = value

    return values


def _load_file_env(base_dir: Path) -> dict[str, str]:
    workspace_dir = base_dir.parents[1]
    values: dict[str, str] = {}

    for path in (workspace_dir / ".env", base_dir / ".env"):
        values.update(_parse_env_file(path))

    return values


def _pick_env(
    name: str,
    env: Mapping[str, str],
    file_env: Mapping[str, str],
    *,
    aliases: tuple[str, ...] = (),
) -> str | None:
    for key in (name, *aliases):
        value = _normalize_env_value(env.get(key))
        if value is not None:
            return value

    for key in (name, *aliases):
        value = _normalize_env_value(file_env.get(key))
        if value is not None:
            return value

    return None


def _parse_cors_origins(value: str | None) -> list[str]:
    if value is None:
        return ["http://127.0.0.1:3200", "http://localhost:3200"]

    origins = [item.strip() for item in value.split(",") if item.strip() and item.strip() != "*"]
    return origins or ["http://127.0.0.1:3200", "http://localhost:3200"]


def build_settings(
    *,
    env: Mapping[str, str] | None = None,
    file_env: Mapping[str, str] | None = None,
    base_dir: Path | None = None,
) -> Settings:
    resolved_env = env or os.environ
    resolved_base_dir = base_dir or Path(__file__).resolve().parents[2]
    resolved_file_env = file_env if file_env is not None else _load_file_env(resolved_base_dir)

    ai_openai_base_url = _pick_env(
        "AI_OPENAI_BASE_URL",
        resolved_env,
        resolved_file_env,
        aliases=("OPENAI_BASE_URL",),
    )
    ai_openai_api_key = _pick_env(
        "AI_OPENAI_API_KEY",
        resolved_env,
        resolved_file_env,
        aliases=("OPENAI_API_KEY",),
    )
    configured_model = _pick_env(
        "AI_MODEL",
        resolved_env,
        resolved_file_env,
        aliases=("OPENAI_MODEL",),
    )

    configured_provider = _pick_env("AI_PROVIDER", resolved_env, resolved_file_env)
    if configured_provider in (None, "mock"):
        ai_provider = "openai_compatible" if ai_openai_base_url and ai_openai_api_key else "mock"
    else:
        ai_provider = configured_provider

    if ai_provider == "openai_compatible" and configured_model in (None, "campusfit-mock"):
        ai_model = "gpt-4.1-mini"
    elif configured_model is not None:
        ai_model = configured_model
    else:
        ai_model = "campusfit-mock"

    ai_timeout_raw = _pick_env("AI_TIMEOUT_SECONDS", resolved_env, resolved_file_env) or "12"

    return Settings(
        ai_env=_pick_env("AI_ENV", resolved_env, resolved_file_env) or "local",
        ai_provider=ai_provider,
        ai_model=ai_model,
        ai_timeout_seconds=int(ai_timeout_raw),
        ai_openai_base_url=ai_openai_base_url,
        ai_openai_api_key=ai_openai_api_key,
        log_level=_pick_env("LOG_LEVEL", resolved_env, resolved_file_env) or "INFO",
        log_dir=_pick_env("LOG_DIR", resolved_env, resolved_file_env) or "logs",
        cors_origins=_parse_cors_origins(_pick_env("AI_CORS_ORIGINS", resolved_env, resolved_file_env)),
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return build_settings()
