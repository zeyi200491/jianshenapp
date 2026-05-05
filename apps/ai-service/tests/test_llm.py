import httpx
import pytest

from app.core.config import Settings
from app.core.errors import AppError
from app.services.llm import OpenAICompatibleLLMClient


class _TimeoutClient:
    def __init__(self, *args, **kwargs) -> None:
        self.args = args
        self.kwargs = kwargs

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, *args, **kwargs):
        raise httpx.ReadTimeout("upstream timeout")


class _StreamResponse:
    def __init__(self, lines: list[str]) -> None:
        self._lines = lines

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    def raise_for_status(self) -> None:
        return None

    async def aiter_lines(self):
        for line in self._lines:
            yield line


class _StreamingClient:
    def __init__(self, *args, **kwargs) -> None:
        self.args = args
        self.kwargs = kwargs

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    def stream(self, method: str, url: str, *, headers: dict, json: dict):
        assert method == "POST"
        assert url.endswith("/chat/completions")
        assert json["stream"] is True
        return _StreamResponse(
            [
                'data: {"choices":[{"delta":{"content":"先保蛋白"}}]}',
                "",
                'data: {"choices":[{"delta":{"content":"，再补主食。"}}]}',
                "",
                "data: [DONE]",
            ]
        )


@pytest.mark.anyio
async def test_openai_compatible_client_maps_upstream_timeout_to_app_error(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(httpx, "AsyncClient", _TimeoutClient)
    client = OpenAICompatibleLLMClient(
        Settings(
            ai_provider="openai_compatible",
            ai_model="mimo-v2.5",
            ai_openai_base_url="https://token-plan-cn.xiaomimimo.com/v1",
            ai_openai_api_key="test-key",
            ai_timeout_seconds=12,
        )
    )

    with pytest.raises(AppError) as exc_info:
        await client.complete(
            task_name="rag_answer",
            system_prompt="你是健身饮食助手",
            user_prompt="请输出 JSON",
        )

    assert exc_info.value.code == "AI_TIMEOUT"
    assert exc_info.value.status_code == 504


@pytest.mark.anyio
async def test_openai_compatible_client_streams_incremental_text(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(httpx, "AsyncClient", _StreamingClient)
    client = OpenAICompatibleLLMClient(
        Settings(
            ai_provider="openai_compatible",
            ai_model="mimo-v2.5",
            ai_openai_base_url="https://token-plan-cn.xiaomimimo.com/v1",
            ai_openai_api_key="test-key",
            ai_timeout_seconds=12,
        )
    )

    chunks: list[str] = []
    async for chunk in client.stream_complete(
        task_name="rag_answer_stream",
        system_prompt="你是健身饮食助手",
        user_prompt="请直接回答",
    ):
        chunks.append(chunk)

    assert chunks == ["先保蛋白", "，再补主食。"]
