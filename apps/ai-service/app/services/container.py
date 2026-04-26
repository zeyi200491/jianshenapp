from __future__ import annotations

from functools import lru_cache

from app.core.config import get_settings
from app.services.boundary import BoundaryPolicy
from app.services.llm import BaseLLMClient, MockLLMClient, OpenAICompatibleLLMClient
from app.services.orchestrator import AIOrchestrator
from app.services.prompting import PromptManager
from app.services.rag import BasicRagService
from app.services.rule_engine import RuleEngineService
from app.services.safety import SafetyService


@lru_cache(maxsize=1)
def get_llm_client() -> BaseLLMClient:
    settings = get_settings()
    if settings.ai_provider == "openai_compatible":
        return OpenAICompatibleLLMClient(settings)
    return MockLLMClient()


@lru_cache(maxsize=1)
def get_boundary_policy() -> BoundaryPolicy:
    return BoundaryPolicy()


@lru_cache(maxsize=1)
def get_ai_orchestrator() -> AIOrchestrator:
    settings = get_settings()
    return AIOrchestrator(
        llm_client=get_llm_client(),
        prompt_manager=PromptManager(settings.prompt_dir),
        rag_service=BasicRagService(settings.knowledge_path),
        safety_service=SafetyService(),
        rule_engine=RuleEngineService(),
        boundary_policy=get_boundary_policy(),
    )
