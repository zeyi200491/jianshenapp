from pathlib import Path
import shutil
import uuid

from app.core.config import build_settings


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
