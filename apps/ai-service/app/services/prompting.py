from __future__ import annotations

import json
from pathlib import Path
from string import Template
from typing import Any

from pydantic import BaseModel


TASK_FILE_MAP = {
    "diet_explanation": "diet_explanation_task.txt",
    "training_explanation": "training_explanation_task.txt",
    "plan_adjustment": "plan_adjustment_task.txt",
    "rag_answer": "rag_answer_task.txt",
}


def _json_default(value: Any) -> Any:
    if isinstance(value, BaseModel):
        return value.model_dump()
    if hasattr(value, "value"):
        return value.value
    raise TypeError(f"Object of type {value.__class__.__name__} is not JSON serializable")


class PromptManager:
    def __init__(self, prompt_dir: Path) -> None:
        self._system_template = (prompt_dir / "system.txt").read_text(encoding="utf-8")
        self._prompt_dir = prompt_dir

    def render(self, task_name: str, context: dict[str, object]) -> tuple[str, str]:
        task_file = TASK_FILE_MAP[task_name]
        task_template = (self._prompt_dir / task_file).read_text(encoding="utf-8")
        user_prompt = Template(task_template).safe_substitute(
            context_json=json.dumps(context, ensure_ascii=False, indent=2, default=_json_default)
        )
        return self._system_template, user_prompt