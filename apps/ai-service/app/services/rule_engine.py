from __future__ import annotations

from copy import deepcopy

from app.core.errors import AppError
from app.models.schemas import (
    AdjustmentAction,
    DietMeal,
    PlanAdjustRequest,
    PlanType,
    TrainingItem,
)


class RuleEngineService:
    def adjust(self, payload: PlanAdjustRequest) -> tuple[dict[str, object], list[str]]:
        if payload.plan_type == PlanType.diet:
            if payload.action not in {
                AdjustmentAction.canteen_no_chicken_breast,
                AdjustmentAction.dorm_simple_meal,
            }:
                raise AppError(
                    code="VALIDATION_ERROR",
                    message="当前动作不支持饮食计划改写",
                    status_code=400,
                )
            if not payload.diet_plan:
                raise AppError(
                    code="VALIDATION_ERROR",
                    message="缺少 diet_plan",
                    status_code=400,
                )
            adjusted_plan, notes = self._adjust_diet_plan(payload)
            return {"diet_plan": adjusted_plan}, notes

        if payload.action not in {
            AdjustmentAction.no_gym_access,
            AdjustmentAction.only_20_minutes,
            AdjustmentAction.low_energy_day,
        }:
            raise AppError(
                code="VALIDATION_ERROR",
                message="当前动作不支持训练计划改写",
                status_code=400,
            )
        if not payload.training_plan:
            raise AppError(
                code="VALIDATION_ERROR",
                message="缺少 training_plan",
                status_code=400,
            )
        adjusted_plan, notes = self._adjust_training_plan(payload)
        return {"training_plan": adjusted_plan}, notes

    def _adjust_diet_plan(self, payload: PlanAdjustRequest) -> tuple[object, list[str]]:
        plan = deepcopy(payload.diet_plan)
        assert plan is not None
        notes: list[str] = []

        if payload.action == AdjustmentAction.canteen_no_chicken_breast:
            for meal in plan.meals:
                meal.foods = [
                    food.replace("鸡胸肉", "清蒸鱼 / 瘦牛肉 / 鸡蛋 / 豆腐")
                    for food in meal.foods
                ]
            plan.summary = f"{plan.summary}；已切换为食堂高蛋白替代版"
            notes.append("将鸡胸肉替换为同层级高蛋白食材，不改动总目标。")

        if payload.action == AdjustmentAction.dorm_simple_meal:
            plan.meals = [
                DietMeal(
                    meal_name="早餐",
                    foods=["无糖酸奶", "即食鸡蛋", "香蕉"],
                    note="5 分钟内解决，优先补蛋白和碳水",
                ),
                DietMeal(
                    meal_name="午餐",
                    foods=["即食鸡胸肉", "全麦面包", "小番茄"],
                    note="不具备烹饪条件时走即食组合",
                ),
                DietMeal(
                    meal_name="晚餐",
                    foods=["豆腐", "牛奶", "玉米"],
                    note="保持轻烹饪和高可执行性",
                ),
            ]
            plan.summary = f"{plan.summary}；已切换为宿舍简化执行版"
            notes.append("优先提升执行便利性，核心热量与蛋白目标保持不变。")

        return plan, notes

    def _adjust_training_plan(self, payload: PlanAdjustRequest) -> tuple[object, list[str]]:
        plan = deepcopy(payload.training_plan)
        assert plan is not None
        notes: list[str] = []

        if payload.action == AdjustmentAction.no_gym_access:
            equipment_map = {
                "杠铃深蹲": TrainingItem(name="徒手深蹲", sets=4, reps="15-20", equipment="自重", note="下放可稍慢"),
                "杠铃卧推": TrainingItem(name="俯卧撑", sets=4, reps="8-15", equipment="自重", note="不够可抬高手位"),
                "高位下拉": TrainingItem(name="门框划船", sets=4, reps="8-12", equipment="自重", note="动作全程收紧背部"),
                "哑铃肩推": TrainingItem(name="靠墙 Pike Push-up", sets=3, reps="6-10", equipment="自重", note="控制节奏"),
            }
            new_items: list[TrainingItem] = []
            for item in plan.items:
                new_items.append(equipment_map.get(item.name, item))
            plan.items = new_items
            plan.summary = f"{plan.summary}；已改为无器械可执行版"
            notes.append("将依赖器械的主动作替换为自重同模式动作。")

        if payload.action == AdjustmentAction.only_20_minutes:
            plan.items = plan.items[:4]
            for item in plan.items:
                item.sets = min(item.sets, 3)
                item.note = "组间休息控制在 45-60 秒"
            plan.duration_min = 20
            plan.summary = f"{plan.summary}；已压缩为 20 分钟版本"
            notes.append("保留前四个关键动作，减少总组数，优先完成核心刺激。")

        if payload.action == AdjustmentAction.low_energy_day:
            for item in plan.items:
                item.sets = max(2, item.sets - 1)
                item.note = "今天按中等强度执行，保留 2 次余力"
            plan.summary = f"{plan.summary}；已切换为低精力保完成版"
            notes.append("每个动作减少 1 组，优先保留训练节奏和动作质量。")

        return plan, notes
