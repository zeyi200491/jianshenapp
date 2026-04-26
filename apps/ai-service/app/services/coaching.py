from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field

from app.services.rag import KnowledgeHit


class QuestionIntent(str, Enum):
    diet_substitution = "diet_substitution"
    training_execution = "training_execution"
    supplement_guidance = "supplement_guidance"
    recovery_guidance = "recovery_guidance"
    general_knowledge = "general_knowledge"


class PlanFocus(str, Enum):
    diet = "diet"
    training = "training"
    general = "general"


class QuestionProfile(BaseModel):
    intent: QuestionIntent
    plan_focus: PlanFocus
    confidence: float = Field(default=0.5, ge=0, le=1)
    rationale: str


class AnswerStrategy(BaseModel):
    response_style: str
    weak_evidence: bool = False
    fallback_notice: str | None = None
    direct_focus: str
    plan_relation_focus: str
    next_step_focus: str


class CoachStrategyService:
    def classify(
        self,
        *,
        question: str,
        has_diet_plan: bool,
        has_training_plan: bool,
    ) -> QuestionProfile:
        normalized = question.lower()

        if any(keyword in normalized for keyword in ("补剂", "蛋白粉", "肌酸", "咖啡因")):
            return QuestionProfile(
                intent=QuestionIntent.supplement_guidance,
                plan_focus=PlanFocus.diet if has_diet_plan else PlanFocus.general,
                confidence=0.9,
                rationale="命中补剂相关关键词",
            )

        if any(keyword in normalized for keyword in ("酸痛", "恢复", "睡眠", "疲劳", "休息")):
            return QuestionProfile(
                intent=QuestionIntent.recovery_guidance,
                plan_focus=PlanFocus.training if has_training_plan else PlanFocus.general,
                confidence=0.82,
                rationale="命中恢复与疲劳相关关键词",
            )

        if any(
            keyword in normalized
            for keyword in (
                "食堂",
                "宿舍",
                "替换",
                "替代",
                "吃什么",
                "蛋白质来源",
                "没得吃",
                "外卖",
                "怎么点",
                "点单",
                "预算",
                "学生党",
                "主食",
                "夜训",
                "训练后吃",
            )
        ):
            return QuestionProfile(
                intent=QuestionIntent.diet_substitution,
                plan_focus=PlanFocus.diet if has_diet_plan else PlanFocus.general,
                confidence=0.88,
                rationale="命中饮食替代与执行场景关键词",
            )

        if any(
            keyword in normalized
            for keyword in (
                "动作",
                "没时间",
                "做不完",
                "压缩",
                "器械",
                "健身房",
                "热身",
                "练不完",
                "缩短",
                "训练怎么做",
                "出差",
                "酒店",
                "哑铃",
                "跑步机",
            )
        ):
            return QuestionProfile(
                intent=QuestionIntent.training_execution,
                plan_focus=PlanFocus.training if has_training_plan else PlanFocus.general,
                confidence=0.86,
                rationale="命中训练执行相关关键词",
            )

        return QuestionProfile(
            intent=QuestionIntent.general_knowledge,
            plan_focus=PlanFocus.general,
            confidence=0.55,
            rationale="未命中特定强规则，按通用知识处理",
        )

    def build_strategy(
        self,
        *,
        question: str,
        profile: QuestionProfile,
        hits: list[KnowledgeHit],
        has_diet_plan: bool,
        has_training_plan: bool,
    ) -> AnswerStrategy:
        top_score = hits[0].score if hits else 0.0
        max_keyword_hits = max((len(hit.matched_keywords) for hit in hits), default=0)
        weak_evidence = top_score < 2.2 or (
            profile.intent == QuestionIntent.general_knowledge and max_keyword_hits <= 1 and len(question) >= 8
        )

        if weak_evidence:
            return AnswerStrategy(
                response_style="balanced_fallback",
                weak_evidence=True,
                fallback_notice="现有知识库里没有足够直接依据，以下建议属于基于现有计划与常见训练原则的近似建议。",
                direct_focus="先给低风险、可执行的近似判断，不把结论说满。",
                plan_relation_focus="如果存在今日计划，只做轻量关联，不强行拉回。",
                next_step_focus="提示用户补充场景、训练时间点或目标，方便下一轮更准。",
            )

        if profile.intent == QuestionIntent.diet_substitution:
            return AnswerStrategy(
                response_style="diet_substitution",
                direct_focus="先给替代原则，再给 2-3 个食物替代方向。",
                plan_relation_focus="轻量关联当天蛋白目标和饮食场景。",
                next_step_focus="给出本餐立刻可执行的选择顺序。",
            )

        if profile.intent == QuestionIntent.training_execution:
            return AnswerStrategy(
                response_style="training_execution",
                direct_focus="先回答今天这次训练怎么做，不先讲大而泛的理论。",
                plan_relation_focus="围绕当前训练标题、时长和主动作做轻量关联。",
                next_step_focus="给出压缩训练、保主动作或调整顺序的动作建议。",
            )

        if profile.intent == QuestionIntent.supplement_guidance:
            return AnswerStrategy(
                response_style="supplement_guidance",
                direct_focus="先给是否值得用的原则判断，再补充使用边界。",
                plan_relation_focus="如果有饮食计划，提醒优先靠正常饮食完成目标。",
                next_step_focus="给出是否需要马上买、先补什么、观察什么。",
            )

        if profile.intent == QuestionIntent.recovery_guidance:
            return AnswerStrategy(
                response_style="recovery_guidance",
                direct_focus="先判断今天该保留训练、减量还是恢复优先。",
                plan_relation_focus="轻量关联今日训练完成度和恢复成本。",
                next_step_focus="给出睡眠、训练量、动作选择上的下一步。",
            )

        return AnswerStrategy(
            response_style="general_knowledge",
            direct_focus="先正常回答问题，再在结尾顺带提醒与今日计划的关系。",
            plan_relation_focus="如果已有计划，只做一层轻提醒。",
            next_step_focus="给出 1-2 个可执行动作，不把内容拉成百科。",
        )
