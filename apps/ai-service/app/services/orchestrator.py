from __future__ import annotations

import json
from typing import Any

from app.core.errors import AppError
from app.models.schemas import (
    AdjustedPlanPayload,
    DietPlanExplainRequest,
    ExplainResult,
    KnowledgeCitation,
    PlanAdjustRequest,
    RagAnswerPayload,
    RagAskRequest,
    TraceStep,
    TrainingPlanExplainRequest,
)
from app.services.boundary import BoundaryPolicy
from app.services.coaching import CoachStrategyService
from app.services.llm import BaseLLMClient
from app.services.prompting import PromptManager
from app.services.rag import BasicRagService
from app.services.rule_engine import RuleEngineService
from app.services.safety import SafetyService


class AIOrchestrator:
    def __init__(
        self,
        *,
        llm_client: BaseLLMClient,
        prompt_manager: PromptManager,
        rag_service: BasicRagService,
        safety_service: SafetyService,
        rule_engine: RuleEngineService,
        boundary_policy: BoundaryPolicy,
        coaching_service: CoachStrategyService | None = None,
    ) -> None:
        self._llm_client = llm_client
        self._prompt_manager = prompt_manager
        self._rag_service = rag_service
        self._safety_service = safety_service
        self._rule_engine = rule_engine
        self._boundary_policy = boundary_policy
        self._coaching_service = coaching_service or CoachStrategyService()

    async def explain_diet_plan(self, payload: DietPlanExplainRequest) -> ExplainResult:
        safety = self._safety_service.evaluate_text(payload.question)
        if safety.blocked:
            raise AppError(
                code="AI_SAFETY_BLOCKED",
                message=safety.message,
                status_code=400,
                data=safety.model_dump(),
            )

        hits = self._rag_service.search(payload.question, top_k=2)
        content = await self._generate_json(
            task_name="diet_explanation",
            context={
                "question": payload.question,
                "user_profile": payload.user_profile.model_dump(),
                "diet_plan": payload.diet_plan.model_dump(),
                "training_plan": payload.training_plan.model_dump() if payload.training_plan else None,
                "knowledge_snippets": [hit.model_dump() for hit in hits],
                "boundary": self._boundary_policy.describe(),
            },
        )
        output_safety = self._safety_service.evaluate_text(content.get("answer", ""))
        if output_safety.blocked:
            raise AppError(
                code="AI_SAFETY_BLOCKED",
                message=output_safety.message,
                status_code=400,
                data=output_safety.model_dump(),
            )

        return ExplainResult(
            answer=content["answer"],
            tips=content.get("tips", []),
            risk_note=content.get("riskNote", safety.risk_note),
            citations=_citations_from_hits(hits),
            trace=[
                TraceStep(step="input_safety", owner="service", summary=safety.summary),
                TraceStep(step="knowledge_retrieval", owner="service", summary=f"召回 {len(hits)} 条知识片段"),
                TraceStep(step="llm_generation", owner="llm", summary="基于模板生成饮食解释"),
                TraceStep(step="output_safety", owner="service", summary=output_safety.summary),
            ],
        )

    async def explain_training_plan(self, payload: TrainingPlanExplainRequest) -> ExplainResult:
        safety = self._safety_service.evaluate_text(payload.question)
        if safety.blocked:
            raise AppError(
                code="AI_SAFETY_BLOCKED",
                message=safety.message,
                status_code=400,
                data=safety.model_dump(),
            )

        hits = self._rag_service.search(payload.question, top_k=2)
        content = await self._generate_json(
            task_name="training_explanation",
            context={
                "question": payload.question,
                "user_profile": payload.user_profile.model_dump(),
                "training_plan": payload.training_plan.model_dump(),
                "diet_plan": payload.diet_plan.model_dump() if payload.diet_plan else None,
                "knowledge_snippets": [hit.model_dump() for hit in hits],
                "boundary": self._boundary_policy.describe(),
            },
        )
        output_safety = self._safety_service.evaluate_text(content.get("answer", ""))
        if output_safety.blocked:
            raise AppError(
                code="AI_SAFETY_BLOCKED",
                message=output_safety.message,
                status_code=400,
                data=output_safety.model_dump(),
            )

        return ExplainResult(
            answer=content["answer"],
            tips=content.get("tips", []),
            risk_note=content.get("riskNote", safety.risk_note),
            citations=_citations_from_hits(hits),
            trace=[
                TraceStep(step="input_safety", owner="service", summary=safety.summary),
                TraceStep(step="knowledge_retrieval", owner="service", summary=f"召回 {len(hits)} 条知识片段"),
                TraceStep(step="llm_generation", owner="llm", summary="基于模板生成训练解释"),
                TraceStep(step="output_safety", owner="service", summary=output_safety.summary),
            ],
        )

    async def adjust_plan(self, payload: PlanAdjustRequest) -> AdjustedPlanPayload:
        safety = self._safety_service.evaluate_text(payload.question)
        if safety.blocked:
            raise AppError(
                code="AI_SAFETY_BLOCKED",
                message=safety.message,
                status_code=400,
                data=safety.model_dump(),
            )

        adjusted_plan, rule_notes = self._rule_engine.adjust(payload)
        content = await self._generate_json(
            task_name="plan_adjustment",
            context={
                "question": payload.question,
                "action": payload.action.value,
                "user_profile": payload.user_profile.model_dump(),
                "adjusted_plan": adjusted_plan,
                "rule_notes": rule_notes,
                "boundary": self._boundary_policy.describe(),
            },
        )
        output_safety = self._safety_service.evaluate_text(content.get("answer", ""))
        if output_safety.blocked:
            raise AppError(
                code="AI_SAFETY_BLOCKED",
                message=output_safety.message,
                status_code=400,
                data=output_safety.model_dump(),
            )

        return AdjustedPlanPayload(
            plan_type=payload.plan_type,
            action=payload.action,
            adjusted_diet_plan=adjusted_plan.get("diet_plan"),
            adjusted_training_plan=adjusted_plan.get("training_plan"),
            explanation=content["answer"],
            execution_tips=content.get("tips", []),
            rule_notes=rule_notes,
            trace=[
                TraceStep(step="input_safety", owner="service", summary=safety.summary),
                TraceStep(step="rule_engine_adjust", owner="rule_engine", summary="按预设动作完成结构化改计划"),
                TraceStep(step="llm_generation", owner="llm", summary="基于调整结果生成解释"),
                TraceStep(step="output_safety", owner="service", summary=output_safety.summary),
            ],
        )

    async def rag_ask(self, payload: RagAskRequest) -> RagAnswerPayload:
        safety = self._safety_service.evaluate_text(payload.question)
        if safety.blocked:
            raise AppError(
                code="AI_SAFETY_BLOCKED",
                message=safety.message,
                status_code=400,
                data=safety.model_dump(),
            )

        question_profile = self._coaching_service.classify(
            question=payload.question,
            has_diet_plan=payload.diet_plan is not None,
            has_training_plan=payload.training_plan is not None,
        )
        hits = self._rag_service.search(
            payload.question,
            top_k=payload.top_k,
            intent=question_profile.intent.value,
            user_profile=payload.user_profile,
            diet_plan=payload.diet_plan,
            training_plan=payload.training_plan,
        )
        answer_strategy = self._coaching_service.build_strategy(
            question=payload.question,
            profile=question_profile,
            hits=hits,
            has_diet_plan=payload.diet_plan is not None,
            has_training_plan=payload.training_plan is not None,
        )
        content = await self._generate_json(
            task_name="rag_answer",
            context={
                "question": payload.question,
                "user_profile": payload.user_profile.model_dump() if payload.user_profile else None,
                "diet_plan": payload.diet_plan.model_dump() if payload.diet_plan else None,
                "training_plan": payload.training_plan.model_dump() if payload.training_plan else None,
                "knowledge_snippets": [hit.model_dump() for hit in hits],
                "question_profile": question_profile.model_dump(),
                "answer_strategy": answer_strategy.model_dump(),
                "boundary": self._boundary_policy.describe(),
            },
        )
        output_safety = self._safety_service.evaluate_text(content.get("answer", ""))
        if output_safety.blocked:
            raise AppError(
                code="AI_SAFETY_BLOCKED",
                message=output_safety.message,
                status_code=400,
                data=output_safety.model_dump(),
            )

        trace = [
            TraceStep(step="input_safety", owner="service", summary=safety.summary),
            TraceStep(
                step="question_classification",
                owner="service",
                summary=f"识别为 {question_profile.intent.value}，理由：{question_profile.rationale}",
            ),
            TraceStep(step="knowledge_retrieval", owner="service", summary=f"召回 {len(hits)} 条知识片段"),
            TraceStep(
                step="answer_strategy",
                owner="service",
                summary=f"采用 {answer_strategy.response_style} 回答策略",
            ),
        ]
        used_fallback = answer_strategy.weak_evidence or "现有知识库里没有足够直接依据" in content.get("answer", "")
        if used_fallback:
            trace.append(
                TraceStep(
                    step="fallback_notice",
                    owner="service",
                    summary="命中弱证据兜底，先给保守近似建议并提醒适用范围",
                )
            )
        trace.extend(
            [
                TraceStep(step="llm_generation", owner="llm", summary="基于分类、检索和模板生成回答"),
                TraceStep(step="output_safety", owner="service", summary=output_safety.summary),
            ]
        )

        return RagAnswerPayload(
            answer=content["answer"],
            tips=content.get("tips", []),
            risk_note=content.get("riskNote", safety.risk_note),
            citations=_citations_from_hits(hits),
            trace=trace,
        )

    async def _generate_json(self, *, task_name: str, context: dict[str, Any]) -> dict[str, Any]:
        system_prompt, user_prompt = self._prompt_manager.render(task_name, context)
        raw = await self._llm_client.complete(
            task_name=task_name,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
        )
        parsed = _parse_json(raw)
        if parsed:
            return parsed

        repaired = _repair_json(raw)
        if repaired:
            return repaired

        raise AppError(
            code="AI_RESPONSE_INVALID",
            message="模型输出结构化解析失败",
            status_code=500,
            data={"taskName": task_name, "rawResponse": raw},
        )


def _parse_json(raw: str) -> dict[str, Any] | None:
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


def _repair_json(raw: str) -> dict[str, Any] | None:
    if "{" not in raw or "}" not in raw:
        return None
    candidate = raw[raw.index("{") : raw.rindex("}") + 1]
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        return None


def _citations_from_hits(hits) -> list[KnowledgeCitation]:
    return [
        KnowledgeCitation(
            document_id=hit.document_id,
            title=hit.title,
            source=hit.source,
            score=hit.score,
        )
        for hit in hits
    ]
