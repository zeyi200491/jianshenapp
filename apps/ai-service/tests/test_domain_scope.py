import asyncio
import json
from pathlib import Path
from typing import Any

import pytest

from app.core.errors import AppError
from app.services.domain_scope import DomainScopeService
from app.services.llm import MockLLMClient
from app.services.prompting import PromptManager, TASK_FILE_MAP


ALLOWED_SCOPE_LABELS = {"in_scope", "out_of_scope", "uncertain"}
MOCK_SCOPE_TASKS = {"scope_classification", "out_of_scope_reply"}


def _build_prompt_manager() -> PromptManager:
    prompt_dir = Path(__file__).resolve().parents[1] / "app" / "prompts"
    return PromptManager(prompt_dir)


def _complete_mock(*, task_name: str, context: dict[str, object]) -> dict[str, object]:
    result = asyncio.run(
        MockLLMClient().complete(
            task_name=task_name,
            system_prompt="system",
            user_prompt=f"上下文如下：\n```json\n{json.dumps(context, ensure_ascii=False)}\n```",
        )
    )
    return json.loads(result)


def test_prompt_manager_renders_scope_classification() -> None:
    manager = _build_prompt_manager()

    system_prompt, user_prompt = manager.render(
        "scope_classification",
        {"question": "晚上训练后吃什么更利于减脂？"},
    )

    assert system_prompt
    assert "只做分类" in user_prompt
    assert "晚上训练后吃什么更利于减脂" in user_prompt


def test_prompt_manager_renders_out_of_scope_reply() -> None:
    manager = _build_prompt_manager()

    system_prompt, user_prompt = manager.render(
        "out_of_scope_reply",
        {
            "question": "帮我写一段 Python 排序代码。",
            "scope_reason": "这是编程问题，不属于健身助手支持范围。",
        },
    )

    assert system_prompt
    assert "统一软拒绝文案" in user_prompt
    assert "Python 排序代码" in user_prompt
    assert "编程问题" in user_prompt


@pytest.mark.parametrize(
    ("question", "expected_label"),
    [
        ("减脂期晚餐怎么安排蛋白质和主食？", "in_scope"),
        ("下背轻微不适，今天训练怎么低风险调整？", "in_scope"),
        ("轻微肩部不适，可以继续练吗？", "uncertain"),
        ("膝盖有点疼还能不能练深蹲？", "uncertain"),
        ("腰有点痛，今天还能继续练硬拉吗？", "uncertain"),
        ("膝盖剧痛还要不要继续练？", "out_of_scope"),
        ("严重腰痛怎么判断是不是椎间盘突出？", "out_of_scope"),
        ("胸痛时要不要马上吃处方药，顺便判断是不是心梗？", "out_of_scope"),
        ("帮我写一段 Python 排序代码。", "out_of_scope"),
    ],
)
def test_mock_llm_client_returns_scope_classification_json(question: str, expected_label: str) -> None:
    payload = _complete_mock(
        task_name="scope_classification",
        context={"question": question},
    )

    assert set(payload.keys()) == {"label", "reason"}
    assert payload["label"] in ALLOWED_SCOPE_LABELS
    assert payload["label"] == expected_label
    assert isinstance(payload["reason"], str)
    assert payload["reason"].strip()


def test_mock_llm_client_returns_out_of_scope_reply_json() -> None:
    payload = _complete_mock(
        task_name="out_of_scope_reply",
        context={
            "question": "帮我写离婚协议。",
            "scope_reason": "这是法律问题",
        },
    )

    answer = str(payload["answer"])
    tips = payload["tips"]

    assert payload["riskNote"] == ""
    assert "只支持训练、饮食、恢复、补剂、体重管理和轻度运动康复" in answer
    assert "离婚协议" in answer
    assert "法律条款" not in answer
    assert "帮你把问题改写到" in answer
    assert len(tips) == 3
    assert all(isinstance(tip, str) and tip for tip in tips)
    assert all(any(keyword in tip for keyword in ("训练", "饮食", "恢复", "减脂", "热量")) for tip in tips)


def test_mock_llm_client_supported_scope_tasks_match_prompt_manager_registration() -> None:
    assert MOCK_SCOPE_TASKS.issubset(TASK_FILE_MAP.keys())


def test_mock_llm_client_raises_for_unknown_task() -> None:
    with pytest.raises(ValueError, match="unknown_task"):
        asyncio.run(
            MockLLMClient().complete(
                task_name="unknown_task",
                system_prompt="system",
                user_prompt='''上下文如下：
```json
{"question": "test"}
```''',
            )
        )


class _RecordingLLMClient:
    def __init__(self, responses: list[str]) -> None:
        self._responses = responses
        self.calls: list[dict[str, Any]] = []

    async def complete(
        self,
        *,
        task_name: str,
        system_prompt: str,
        user_prompt: str,
        model: str | None = None,
    ) -> str:
        self.calls.append(
            {
                "task_name": task_name,
                "system_prompt": system_prompt,
                "user_prompt": user_prompt,
                "model": model,
            }
        )
        return self._responses.pop(0)


def test_domain_scope_service_allows_clear_fitness_question_without_llm() -> None:
    llm_client = _RecordingLLMClient([])
    service = DomainScopeService(
        llm_client=llm_client,
        prompt_manager=_build_prompt_manager(),
        scope_model="scope-model",
    )

    decision = asyncio.run(service.evaluate("减脂期晚餐怎么安排蛋白质和主食？"))

    assert decision.label == "in_scope"
    assert decision.source == "rule"
    assert llm_client.calls == []


def test_domain_scope_service_blocks_clear_unrelated_question_without_llm() -> None:
    llm_client = _RecordingLLMClient([])
    service = DomainScopeService(
        llm_client=llm_client,
        prompt_manager=_build_prompt_manager(),
        scope_model="scope-model",
    )

    decision = asyncio.run(service.evaluate("帮我写一段 Python 排序代码。"))

    assert decision.label == "out_of_scope"
    assert decision.source == "rule"
    assert llm_client.calls == []


@pytest.mark.parametrize("model_label", ["in_scope", "out_of_scope", "uncertain"])
def test_domain_scope_service_uses_scope_model_for_boundary_question(model_label: str) -> None:
    llm_client = _RecordingLLMClient(
        [json.dumps({"label": model_label, "reason": "模型二判结果"}, ensure_ascii=False)]
    )
    service = DomainScopeService(
        llm_client=llm_client,
        prompt_manager=_build_prompt_manager(),
        scope_model="gpt-4.1-nano",
    )

    decision = asyncio.run(service.evaluate("膝盖有点疼还能不能练深蹲？"))

    assert decision.label == model_label
    assert decision.reason == "模型二判结果"
    assert decision.source == "model"
    assert len(llm_client.calls) == 1
    assert llm_client.calls[0]["task_name"] == "scope_classification"
    assert llm_client.calls[0]["model"] == "gpt-4.1-nano"
    assert "膝盖有点疼还能不能练深蹲" in llm_client.calls[0]["user_prompt"]


def test_domain_scope_service_raises_when_model_returns_invalid_json() -> None:
    llm_client = _RecordingLLMClient(["not json"])
    service = DomainScopeService(
        llm_client=llm_client,
        prompt_manager=_build_prompt_manager(),
        scope_model="gpt-4.1-nano",
    )

    with pytest.raises(AppError, match="模型输出结构化解析失败"):
        asyncio.run(service.evaluate("膝盖有点疼还能不能练深蹲？"))


def test_domain_scope_service_raises_when_model_returns_invalid_label() -> None:
    llm_client = _RecordingLLMClient(
        [json.dumps({"label": "maybe", "reason": "不合法标签"}, ensure_ascii=False)]
    )
    service = DomainScopeService(
        llm_client=llm_client,
        prompt_manager=_build_prompt_manager(),
        scope_model="gpt-4.1-nano",
    )

    with pytest.raises(AppError, match="模型输出结构化解析失败"):
        asyncio.run(service.evaluate("膝盖有点疼还能不能练深蹲？"))
