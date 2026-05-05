from __future__ import annotations

import json
from typing import Literal

from pydantic import BaseModel, ValidationError

from app.core.errors import AppError
from app.services.llm import BaseLLMClient
from app.services.prompting import PromptManager


ScopeLabel = Literal["in_scope", "out_of_scope", "uncertain"]
DecisionSource = Literal["rule", "model"]


class DomainScopeDecision(BaseModel):
    label: ScopeLabel
    reason: str
    source: DecisionSource


class _ModelScopeDecision(BaseModel):
    label: ScopeLabel
    reason: str


class DomainScopeService:
    def __init__(
        self,
        *,
        llm_client: BaseLLMClient,
        prompt_manager: PromptManager,
        scope_model: str,
    ) -> None:
        self._llm_client = llm_client
        self._prompt_manager = prompt_manager
        self._scope_model = scope_model

    async def evaluate(
        self,
        question: str,
        *,
        has_diet_plan: bool = False,
        has_training_plan: bool = False,
    ) -> DomainScopeDecision:
        rule_decision = _classify_by_rules(
            question,
            has_diet_plan=has_diet_plan,
            has_training_plan=has_training_plan,
        )
        if rule_decision.label != "uncertain":
            return rule_decision

        system_prompt, user_prompt = self._prompt_manager.render(
            "scope_classification",
            {"question": question},
        )
        raw = await self._llm_client.complete(
            task_name="scope_classification",
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            model=self._scope_model,
        )
        parsed = _parse_model_decision(raw)
        return DomainScopeDecision(
            label=parsed.label,
            reason=parsed.reason,
            source="model",
        )


def _classify_by_rules(
    question: str,
    *,
    has_diet_plan: bool = False,
    has_training_plan: bool = False,
) -> DomainScopeDecision:
    normalized_question = question.lower()

    high_risk_markers = (
        "急救",
        "急诊",
        "胸痛",
        "呼吸困难",
        "昏迷",
        "骨折",
        "脱臼",
        "大出血",
        "处方药",
        "抗生素",
        "激素药",
        "心梗",
        "中风",
        "诊断",
        "确诊",
        "自杀",
        "自残",
        "剧痛",
        "严重",
        "无法站立",
        "站不起来",
        "突出",
        "撕裂",
        "断裂",
    )
    unrelated_markers = (
        "python",
        "java",
        "代码",
        "编程",
        "法律",
        "律师",
        "起诉",
        "合同",
        "离婚",
        "理财",
        "股票",
        "基金",
        "投资",
        "八卦",
        "明星",
        "旅游",
        "机票",
        "酒店",
        "作业",
        "论文",
        "代写",
    )
    boundary_markers = (
        "疼",
        "痛",
        "酸痛",
        "拉伤",
        "扭伤",
        "受伤",
        "不适",
        "康复",
        "恢复训练",
        "能不能练",
        "还能练",
        "继续练",
        "训练调整",
        "膝盖",
        "腰",
        "肩",
        "手腕",
        "脚踝",
        "下背",
    )
    fitness_markers = (
        "训练",
        "动作",
        "深蹲",
        "硬拉",
        "卧推",
        "跑步",
        "有氧",
        "力量",
        "增肌",
        "减脂",
        "体重",
        "体脂",
        "热量",
        "蛋白",
        "碳水",
        "脂肪",
        "饮食",
        "晚餐",
        "食材",
        "外卖",
        "补剂",
        "蛋白粉",
        "肌酸",
        "睡眠",
        "恢复",
        "拉伸",
    )

    if any(marker in normalized_question for marker in high_risk_markers):
        return DomainScopeDecision(
            label="out_of_scope",
            reason="问题涉及医疗高风险、严重伤病或诊断用药，不属于当前支持范围。",
            source="rule",
        )

    if any(marker in normalized_question for marker in unrelated_markers):
        return DomainScopeDecision(
            label="out_of_scope",
            reason="问题主题明显不属于训练、饮食、恢复或体重管理场景。",
            source="rule",
        )

    has_boundary = any(marker in normalized_question for marker in boundary_markers)
    has_fitness = any(marker in normalized_question for marker in fitness_markers)
    has_plan_context = has_diet_plan or has_training_plan

    if has_fitness and not has_boundary:
        return DomainScopeDecision(
            label="in_scope",
            reason="问题聚焦训练、饮食、恢复、补剂或体重管理等支持范围。",
            source="rule",
        )

    if has_plan_context and not has_boundary:
        return DomainScopeDecision(
            label="in_scope",
            reason="问题直接围绕已提供的训练或饮食计划展开，属于当前支持范围。",
            source="rule",
        )

    return DomainScopeDecision(
        label="uncertain",
        reason="问题涉及疼痛康复边界或语义不够明确，需要模型进一步判断。",
        source="rule",
    )


def _parse_model_decision(raw: str) -> _ModelScopeDecision:
    payload = _parse_json(raw)
    if payload is None:
        raise _invalid_response_error(raw)

    try:
        decision = _ModelScopeDecision.model_validate(payload)
    except ValidationError as exc:
        raise _invalid_response_error(raw, extra={"validationError": exc.errors()}) from exc

    if not decision.reason.strip():
        raise _invalid_response_error(raw, extra={"validationError": "reason must be non-empty"})

    return decision


def _parse_json(raw: str) -> dict[str, object] | None:
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        payload = _repair_json(raw)
        if payload is None:
            return None

    if not isinstance(payload, dict):
        return None
    return payload


def _repair_json(raw: str) -> dict[str, object] | None:
    if "{" not in raw or "}" not in raw:
        return None
    candidate = raw[raw.index("{") : raw.rindex("}") + 1]
    try:
        payload = json.loads(candidate)
    except json.JSONDecodeError:
        return None
    return payload if isinstance(payload, dict) else None


def _invalid_response_error(raw: str, *, extra: object | None = None) -> AppError:
    data = {"taskName": "scope_classification", "rawResponse": raw}
    if extra is not None:
        data["details"] = extra
    return AppError(
        code="AI_RESPONSE_INVALID",
        message="模型输出结构化解析失败",
        status_code=500,
        data=data,
    )
