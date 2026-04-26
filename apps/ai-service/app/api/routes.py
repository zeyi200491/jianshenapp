from fastapi import APIRouter, Request

from app.core.responses import success_response
from app.models.schemas import (
    DietPlanExplainRequest,
    PlanAdjustRequest,
    RagAskRequest,
    TrainingPlanExplainRequest,
)
from app.services.container import get_ai_orchestrator, get_boundary_policy


router = APIRouter(prefix="/api/v1")


@router.get("/boundary")
async def get_boundary(request: Request) -> dict[str, object]:
    policy = get_boundary_policy()
    return success_response(
        data=policy.describe(),
        request_id=request.state.request_id,
    )


@router.post("/diet-plans/explain")
async def explain_diet_plan(
    payload: DietPlanExplainRequest,
    request: Request,
) -> dict[str, object]:
    result = await get_ai_orchestrator().explain_diet_plan(payload)
    return success_response(result.model_dump(), request_id=request.state.request_id)


@router.post("/training-plans/explain")
async def explain_training_plan(
    payload: TrainingPlanExplainRequest,
    request: Request,
) -> dict[str, object]:
    result = await get_ai_orchestrator().explain_training_plan(payload)
    return success_response(result.model_dump(), request_id=request.state.request_id)


@router.post("/plans/adjust")
async def adjust_plan(
    payload: PlanAdjustRequest,
    request: Request,
) -> dict[str, object]:
    result = await get_ai_orchestrator().adjust_plan(payload)
    return success_response(result.model_dump(), request_id=request.state.request_id)


@router.post("/rag/ask")
async def rag_ask(
    payload: RagAskRequest,
    request: Request,
) -> dict[str, object]:
    result = await get_ai_orchestrator().rag_ask(payload)
    return success_response(result.model_dump(), request_id=request.state.request_id)
