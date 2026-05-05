import json

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from app.core.limiter import limiter
from app.core.responses import success_response
from app.models.schemas import (
    DietPlanExplainRequest,
    PlanAdjustRequest,
    RagAskRequest,
    TrainingPlanExplainRequest,
)
from app.services.auth import require_auth
from app.services.container import get_ai_orchestrator, get_boundary_policy


router = APIRouter(prefix="/api/v1")


@router.get("/boundary")
@limiter.limit("30/minute")
async def get_boundary(request: Request) -> dict[str, object]:
    policy = get_boundary_policy()
    return success_response(
        data=policy.describe(),
        request_id=request.state.request_id,
    )


@router.post("/diet-plans/explain")
@limiter.limit("10/minute")
async def explain_diet_plan(
    payload: DietPlanExplainRequest,
    request: Request,
    _auth: dict[str, object] = Depends(require_auth),
) -> dict[str, object]:
    result = await get_ai_orchestrator().explain_diet_plan(payload)
    return success_response(result.model_dump(), request_id=request.state.request_id)


@router.post("/training-plans/explain")
@limiter.limit("10/minute")
async def explain_training_plan(
    payload: TrainingPlanExplainRequest,
    request: Request,
    _auth: dict[str, object] = Depends(require_auth),
) -> dict[str, object]:
    result = await get_ai_orchestrator().explain_training_plan(payload)
    return success_response(result.model_dump(), request_id=request.state.request_id)


@router.post("/plans/adjust")
@limiter.limit("10/minute")
async def adjust_plan(
    payload: PlanAdjustRequest,
    request: Request,
    _auth: dict[str, object] = Depends(require_auth),
) -> dict[str, object]:
    result = await get_ai_orchestrator().adjust_plan(payload)
    return success_response(result.model_dump(), request_id=request.state.request_id)


@router.post("/rag/ask")
@limiter.limit("10/minute")
async def rag_ask(
    payload: RagAskRequest,
    request: Request,
    _auth: dict[str, object] = Depends(require_auth),
) -> dict[str, object]:
    result = await get_ai_orchestrator().rag_ask(payload)
    return success_response(result.model_dump(), request_id=request.state.request_id)


@router.post("/rag/ask/stream")
@limiter.limit("10/minute")
async def rag_ask_stream(
    payload: RagAskRequest,
    request: Request,
    _auth: dict[str, object] = Depends(require_auth),
) -> StreamingResponse:
    async def event_generator():
        async for event in get_ai_orchestrator().rag_ask_stream(payload):
            yield f"event: {event['event']}\n".encode("utf-8")
            yield f"data: {json.dumps(event['data'], ensure_ascii=False)}\n\n".encode("utf-8")

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Request-Id": request.state.request_id,
        },
    )
