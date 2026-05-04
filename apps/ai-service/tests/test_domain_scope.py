import asyncio
import json
from pathlib import Path

from app.services.llm import MockLLMClient
from app.services.prompting import PromptManager


def _build_prompt_manager() -> PromptManager:
    prompt_dir = Path(__file__).resolve().parents[1] / "app" / "prompts"
    return PromptManager(prompt_dir)


def test_prompt_manager_renders_scope_classification() -> None:
    manager = _build_prompt_manager()

    system_prompt, user_prompt = manager.render(
        "scope_classification",
        {
            "question": "晚上训练后吃什么更利于减脂？",
        },
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


def test_mock_llm_client_returns_scope_classification_json() -> None:
    result = asyncio.run(
        MockLLMClient().complete(
            task_name="scope_classification",
            system_prompt="system",
            user_prompt='''上下文如下：\n```json\n{"question": "蛋白粉要不要喝？"}\n```''',
        )
    )

    payload = json.loads(result)

    assert payload["label"] == "in_scope"
    assert payload["reason"]


def test_mock_llm_client_returns_out_of_scope_reply_json() -> None:
    result = asyncio.run(
        MockLLMClient().complete(
            task_name="out_of_scope_reply",
            system_prompt="system",
            user_prompt='''上下文如下：\n```json\n{"question": "帮我写离婚协议", "scope_reason": "这是法律问题"}\n```''',
        )
    )

    payload = json.loads(result)

    assert payload["answer"]
    assert len(payload["tips"]) == 3
    assert all(payload["tips"])
