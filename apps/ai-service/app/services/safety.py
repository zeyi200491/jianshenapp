from __future__ import annotations

import re
from typing import Iterable

from pydantic import BaseModel


SAFETY_MESSAGE = (
    "这个问题超出 CampusFit AI 当前可安全提供的范围。"
    "我可以继续帮你调整饮食和训练执行方案，但涉及医疗或高风险情况，建议及时咨询医生或持证专业人士。"
)


class SafetyResult(BaseModel):
    blocked: bool
    level: str
    matched_categories: list[str]
    summary: str
    message: str = SAFETY_MESSAGE
    risk_note: str = ""


class SafetyService:
    def __init__(self) -> None:
        self._rules = {
            "medical": [
                r"诊断",
                r"处方",
                r"甲状腺",
                r"抑郁",
                r"糖尿病",
                r"用药",
                r"激素",
            ],
            "extreme_weight_loss": [
                r"断食",
                r"催吐",
                r"泻药",
                r"脱水",
                r"极端减脂",
                r"几天瘦",
                r"不吃饭",
                r"厌食",
            ],
            "self_harm": [
                r"自杀",
                r"伤害自己",
                r"不想活",
            ],
            "steroid": [
                r"类固醇",
                r"兴奋剂",
                r"违禁",
            ],
        }

    def evaluate_text(self, text: str) -> SafetyResult:
        matched_categories = [
            category
            for category, patterns in self._rules.items()
            if _matches_any(text, patterns)
        ]
        blocked = bool(matched_categories)
        if blocked:
            return SafetyResult(
                blocked=True,
                level="blocked",
                matched_categories=matched_categories,
                summary=f"命中高风险类别：{', '.join(matched_categories)}",
                risk_note="涉及医疗或高风险内容，已触发安全拦截。",
            )

        risk_note = ""
        if "补剂" in text or "蛋白粉" in text:
            risk_note = "补剂只作为补充，优先通过正常饮食满足需求。"
        return SafetyResult(
            blocked=False,
            level="none",
            matched_categories=[],
            summary="未命中高风险规则",
            risk_note=risk_note,
        )


def _matches_any(text: str, patterns: Iterable[str]) -> bool:
    return any(re.search(pattern, text, re.IGNORECASE) for pattern in patterns)
