from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging
from app.services.middleware import AuditLoggingMiddleware


settings = get_settings()
configure_logging(settings)

app = FastAPI(
    title="CampusFit AI Service",
    version="0.1.0",
    description="CampusFit AI MVP 独立服务",
)

app.add_middleware(AuditLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
register_exception_handlers(app)
app.include_router(router)


@app.get("/health")
async def health() -> dict[str, object]:
    return {
        "code": "OK",
        "message": "success",
        "data": {
            "service": "ai-service",
            "env": settings.ai_env,
            "provider": settings.ai_provider,
            "model": settings.ai_model,
            "providerReady": settings.provider_ready,
            "providerIssue": settings.provider_issue,
        },
    }
