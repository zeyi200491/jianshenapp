import asyncio
from pathlib import Path
import shutil
import uuid

import httpx

from app.core.config import Settings, build_settings
from app.services.llm import OpenAICompatibleLLMClient


def test_build_settings_supports_openai_alias_env_names() -> None:
    settings = build_settings(
        env={
            "AI_MODEL": "gpt-4.1-mini",
            "OPENAI_BASE_URL": "https://api.openai.com/v1",
            "OPENAI_API_KEY": "sk-test",
        },
        file_env={},
    )

    assert settings.ai_provider == "openai_compatible"
    assert settings.ai_model == "gpt-4.1-mini"
    assert settings.ai_openai_base_url == "https://api.openai.com/v1"
    assert settings.ai_openai_api_key == "sk-test"
    assert settings.provider_ready is True


def test_build_settings_reads_provider_and_credentials_from_env_file_values() -> None:
    settings = build_settings(
        env={},
        file_env={
            "AI_MODEL": "gpt-4.1-mini",
            "OPENAI_BASE_URL": "https://api.openai.com/v1",
            "OPENAI_API_KEY": "sk-from-file",
        },
    )

    assert settings.ai_provider == "openai_compatible"
    assert settings.ai_openai_base_url == "https://api.openai.com/v1"
    assert settings.ai_openai_api_key == "sk-from-file"
    assert settings.provider_ready is True


def test_build_settings_loads_root_env_file_values() -> None:
    workspace_root = Path(__file__).resolve().parents[3]
    temp_root = workspace_root / ".local" / f"test-config-{uuid.uuid4().hex}"
    service_dir = temp_root / "apps" / "ai-service"
    service_dir.mkdir(parents=True, exist_ok=True)
    try:
        (temp_root / ".env").write_text(
            "\n".join(
                [
                    "AI_MODEL=gpt-4.1-mini",
                    "OPENAI_BASE_URL=https://api.openai.com/v1",
                    "OPENAI_API_KEY=sk-from-root",
                ]
            ),
            encoding="utf-8",
        )

        settings = build_settings(env={}, base_dir=service_dir)

        assert settings.ai_provider == "openai_compatible"
        assert settings.ai_openai_base_url == "https://api.openai.com/v1"
        assert settings.ai_openai_api_key == "sk-from-root"
    finally:
        shutil.rmtree(temp_root, ignore_errors=True)


def test_build_settings_replaces_mock_model_when_real_provider_is_enabled() -> None:
    settings = build_settings(
        env={
            "AI_PROVIDER": "mock",
            "AI_MODEL": "campusfit-mock",
            "OPENAI_BASE_URL": "https://api.openai.com/v1",
            "OPENAI_API_KEY": "sk-real",
        },
        file_env={},
    )

    assert settings.ai_provider == "openai_compatible"
    assert settings.ai_model == "gpt-4.1-mini"


def test_build_settings_supports_scope_model_for_openai_compatible() -> None:
    settings = build_settings(
        env={
            "AI_MODEL": "gpt-4.1-mini",
            "AI_SCOPE_MODEL": "gpt-4.1-nano",
            "OPENAI_BASE_URL": "https://token-plan-cn.xiaomimimo.com/v1",
            "OPENAI_API_KEY": "test-compatible-key",
        },
        file_env={},
    )

    assert settings.ai_provider == "openai_compatible"
    assert settings.ai_model == "gpt-4.1-mini"
    assert settings.ai_scope_model == "gpt-4.1-nano"
    assert settings.resolved_ai_scope_model == "gpt-4.1-nano"


def test_build_settings_falls_back_to_ai_model_when_scope_model_is_missing() -> None:
    settings = build_settings(
        env={
            "AI_MODEL": "gpt-4.1-mini",
            "OPENAI_BASE_URL": "https://token-plan-cn.xiaomimimo.com/v1",
            "OPENAI_API_KEY": "test-compatible-key",
        },
        file_env={},
    )

    assert settings.ai_scope_model is None
    assert settings.resolved_ai_scope_model == "gpt-4.1-mini"


def test_build_settings_auto_enables_openai_compatible_without_explicit_provider() -> None:
    settings = build_settings(
        env={
            "AI_MODEL": "gpt-4.1-mini",
            "OPENAI_BASE_URL": "https://token-plan-cn.xiaomimimo.com/v1",
            "OPENAI_API_KEY": "test-compatible-key",
        },
        file_env={},
    )

    assert settings.ai_provider == "openai_compatible"
    assert settings.provider_ready is True


def test_build_settings_supports_custom_openai_compatible_gateway() -> None:
    settings = build_settings(
        env={
            "AI_PROVIDER": "openai_compatible",
            "AI_MODEL": "moonshot-v1-8k",
            "OPENAI_BASE_URL": "https://token-plan-cn.xiaomimimo.com/v1",
            "OPENAI_API_KEY": "test-compatible-key",
        },
        file_env={},
    )

    assert settings.ai_openai_base_url == "https://token-plan-cn.xiaomimimo.com/v1"
    assert settings.ai_openai_api_key == "test-compatible-key"
    assert settings.provider_ready is True


def test_build_settings_reports_clear_issue_when_openai_compatible_config_is_missing() -> None:
    settings = build_settings(
        env={
            "AI_PROVIDER": "openai_compatible",
            "AI_MODEL": "gpt-4.1-mini",
        },
        file_env={},
    )

    assert settings.provider_ready is False
    assert (
        settings.provider_issue
        == "缺少兼容接口配置：OPENAI_BASE_URL、OPENAI_API_KEY（或 AI_OPENAI_BASE_URL、AI_OPENAI_API_KEY）"
    )


def test_build_settings_uses_explicit_cors_origins() -> None:
    settings = build_settings(
        env={
            "AI_CORS_ORIGINS": "http://127.0.0.1:3200, https://fit.example.com ",
        },
        file_env={},
    )

    assert settings.cors_origins == ["http://127.0.0.1:3200", "https://fit.example.com"]


def test_build_settings_does_not_allow_wildcard_cors_with_credentials() -> None:
    settings = build_settings(
        env={
            "AI_CORS_ORIGINS": "*",
        },
        file_env={},
    )

    assert settings.cors_origins != ["*"]


def test_openai_compatible_client_prefers_override_model(monkeypatch) -> None:
    captured: dict[str, object] = {}

    class DummyResponse:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, object]:
            return {"choices": [{"message": {"content": "ok"}}]}

    class DummyAsyncClient:
        def __init__(self, *, timeout: int) -> None:
            captured["timeout"] = timeout

        async def __aenter__(self) -> "DummyAsyncClient":
            return self

        async def __aexit__(self, exc_type, exc, tb) -> None:
            return None

        async def post(self, url: str, *, headers: dict[str, str], json: dict[str, object]) -> DummyResponse:
            captured["url"] = url
            captured["headers"] = headers
            captured["json"] = json
            return DummyResponse()

    monkeypatch.setattr(httpx, "AsyncClient", DummyAsyncClient)
    settings = Settings(
        ai_provider="openai_compatible",
        ai_model="gpt-default",
        ai_openai_base_url="https://token-plan-cn.xiaomimimo.com/v1",
        ai_openai_api_key="test-compatible-key",
    )
    client = OpenAICompatibleLLMClient(settings)

    result = asyncio.run(
        client.complete(
            task_name="scope_classification",
            system_prompt="system",
            user_prompt="user",
            model="gpt-x",
        )
    )

    assert result == "ok"
    assert captured["url"] == "https://token-plan-cn.xiaomimimo.com/v1/chat/completions"
    assert captured["json"]["model"] == "gpt-x"


def test_openai_compatible_client_falls_back_to_settings_model_when_override_is_none(monkeypatch) -> None:
    captured: dict[str, object] = {}

    class DummyResponse:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, object]:
            return {"choices": [{"message": {"content": "ok"}}]}

    class DummyAsyncClient:
        def __init__(self, *, timeout: int) -> None:
            captured["timeout"] = timeout

        async def __aenter__(self) -> "DummyAsyncClient":
            return self

        async def __aexit__(self, exc_type, exc, tb) -> None:
            return None

        async def post(self, url: str, *, headers: dict[str, str], json: dict[str, object]) -> DummyResponse:
            captured["url"] = url
            captured["headers"] = headers
            captured["json"] = json
            return DummyResponse()

    monkeypatch.setattr(httpx, "AsyncClient", DummyAsyncClient)
    settings = Settings(
        ai_provider="openai_compatible",
        ai_model="gpt-default",
        ai_openai_base_url="https://token-plan-cn.xiaomimimo.com/v1",
        ai_openai_api_key="test-compatible-key",
    )
    client = OpenAICompatibleLLMClient(settings)

    result = asyncio.run(
        client.complete(
            task_name="scope_classification",
            system_prompt="system",
            user_prompt="user",
            model=None,
        )
    )

    assert result == "ok"
    assert captured["json"]["model"] == "gpt-default"
