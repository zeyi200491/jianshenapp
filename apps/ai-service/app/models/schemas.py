from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class UserProfile(BaseModel):
    user_id: str | None = None
    goal: str
    diet_scene: str
    training_level: str | None = None
    supplement_opt_in: bool = False
    note: str | None = None


class NutritionTargets(BaseModel):
    calories: int
    protein_g: int
    carb_g: int
    fat_g: int


class DietMeal(BaseModel):
    meal_name: str
    foods: list[str]
    note: str | None = None


class DietPlan(BaseModel):
    plan_id: str | None = None
    title: str
    summary: str
    targets: NutritionTargets
    meals: list[DietMeal]


class TrainingItem(BaseModel):
    name: str
    sets: int
    reps: str
    equipment: str | None = None
    note: str | None = None


class TrainingPlan(BaseModel):
    plan_id: str | None = None
    title: str
    split_type: str
    duration_min: int | None = None
    summary: str
    items: list[TrainingItem]


class TraceStep(BaseModel):
    step: str
    owner: str
    summary: str


class KnowledgeCitation(BaseModel):
    document_id: str
    title: str
    source: str
    score: float


class ExplainResult(BaseModel):
    answer: str
    tips: list[str] = Field(default_factory=list)
    risk_note: str = ""
    citations: list[KnowledgeCitation] = Field(default_factory=list)
    trace: list[TraceStep] = Field(default_factory=list)


class DietPlanExplainRequest(BaseModel):
    question: str
    user_profile: UserProfile
    diet_plan: DietPlan
    training_plan: TrainingPlan | None = None


class TrainingPlanExplainRequest(BaseModel):
    question: str
    user_profile: UserProfile
    training_plan: TrainingPlan
    diet_plan: DietPlan | None = None


class AdjustmentAction(str, Enum):
    canteen_no_chicken_breast = "canteen_no_chicken_breast"
    dorm_simple_meal = "dorm_simple_meal"
    no_gym_access = "no_gym_access"
    only_20_minutes = "only_20_minutes"
    low_energy_day = "low_energy_day"


class PlanType(str, Enum):
    diet = "diet"
    training = "training"


class PlanAdjustRequest(BaseModel):
    plan_type: PlanType
    action: AdjustmentAction
    user_profile: UserProfile
    question: str = "请直接帮我改成更容易执行的版本。"
    diet_plan: DietPlan | None = None
    training_plan: TrainingPlan | None = None


class AdjustedPlanPayload(BaseModel):
    plan_type: PlanType
    action: AdjustmentAction
    adjusted_diet_plan: DietPlan | None = None
    adjusted_training_plan: TrainingPlan | None = None
    explanation: str
    execution_tips: list[str]
    rule_notes: list[str]
    trace: list[TraceStep] = Field(default_factory=list)


class RagAskRequest(BaseModel):
    question: str
    top_k: int = Field(default=3, ge=1, le=5)
    user_profile: UserProfile | None = None
    diet_plan: DietPlan | None = None
    training_plan: TrainingPlan | None = None


class RagAnswerPayload(BaseModel):
    answer: str
    tips: list[str] = Field(default_factory=list)
    risk_note: str = ""
    citations: list[KnowledgeCitation] = Field(default_factory=list)
    trace: list[TraceStep] = Field(default_factory=list)


class BoundaryDescription(BaseModel):
    rule_engine_owned: list[str]
    llm_owned: list[str]
    shared_pipeline: list[dict[str, Any]]
    supported_adjust_actions: dict[str, list[str]]
