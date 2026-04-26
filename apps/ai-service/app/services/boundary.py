from __future__ import annotations

from app.models.schemas import BoundaryDescription


class BoundaryPolicy:
    def describe(self) -> dict[str, object]:
        return BoundaryDescription(
            rule_engine_owned=[
                "热量、宏量营养和训练组次数值的核心计算",
                "一键改计划的结构化改写与动作替换",
                "高风险问题输入拦截",
                "Prompt 结构校验失败后的静态兜底",
            ],
            llm_owned=[
                "饮食计划解释",
                "训练计划解释",
                "改计划后的自然语言说明",
                "基于检索结果的基础问答生成",
            ],
            shared_pipeline=[
                {"step": "input_safety", "owner": "service", "summary": "先做高风险拦截"},
                {"step": "knowledge_retrieval", "owner": "service", "summary": "按关键词召回 FAQ"},
                {"step": "rule_engine", "owner": "rule_engine", "summary": "结构化计划由规则改写"},
                {"step": "prompt_render", "owner": "llm_orchestrator", "summary": "模板化拼装上下文"},
                {"step": "structured_output_check", "owner": "service", "summary": "解析 JSON 与兜底"},
                {"step": "output_safety", "owner": "service", "summary": "模型输出二次扫描"},
            ],
            supported_adjust_actions={
                "diet": [
                    "canteen_no_chicken_breast",
                    "dorm_simple_meal",
                ],
                "training": [
                    "no_gym_access",
                    "only_20_minutes",
                    "low_energy_day",
                ],
            },
        ).model_dump()
