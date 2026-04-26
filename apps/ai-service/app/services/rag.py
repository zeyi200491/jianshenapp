from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field


DOMAIN_TERMS = (
    "食堂",
    "宿舍",
    "鸡胸肉",
    "蛋白",
    "蛋白质",
    "补剂",
    "蛋白粉",
    "肌酸",
    "训练",
    "主动作",
    "没时间",
    "20分钟",
    "器械",
    "健身房",
    "疲劳",
    "恢复",
    "酸痛",
    "睡眠",
    "减脂",
    "增肌",
    "外卖",
    "预算",
    "学生党",
    "体重",
    "平台期",
    "热量",
    "出差",
    "酒店",
    "哑铃",
    "跑步机",
    "主食",
    "夜训",
)


class KnowledgeDocument(BaseModel):
    id: str
    title: str
    category: str
    source: str
    keywords: list[str] = Field(default_factory=list)
    content: str
    intent_tags: list[str] = Field(default_factory=list)
    scene_tags: list[str] = Field(default_factory=list)
    goal_tags: list[str] = Field(default_factory=list)
    plan_link_strength: str = "light"
    answer_points: list[str] = Field(default_factory=list)
    fallback_text: str | None = None


class KnowledgeHit(BaseModel):
    document_id: str
    title: str
    category: str
    source: str
    content: str
    score: float
    intent_tags: list[str] = Field(default_factory=list)
    scene_tags: list[str] = Field(default_factory=list)
    goal_tags: list[str] = Field(default_factory=list)
    plan_link_strength: str = "light"
    answer_points: list[str] = Field(default_factory=list)
    fallback_text: str | None = None
    matched_keywords: list[str] = Field(default_factory=list)


class BasicRagService:
    def __init__(self, knowledge_path: Path) -> None:
        data = json.loads(knowledge_path.read_text(encoding="utf-8"))
        self._documents = [KnowledgeDocument.model_validate(document) for document in data["documents"]]

    def search(
        self,
        query: str,
        *,
        top_k: int = 3,
        intent: str | None = None,
        user_profile: Any = None,
        diet_plan: Any = None,
        training_plan: Any = None,
    ) -> list[KnowledgeHit]:
        scored: list[KnowledgeHit] = []
        query_terms = _extract_query_terms(query)

        for document in self._documents:
            score, matched_keywords = self._score(
                query=query,
                query_terms=query_terms,
                document=document,
                intent=intent,
                user_profile=user_profile,
                diet_plan=diet_plan,
                training_plan=training_plan,
            )
            if score <= 0:
                continue
            scored.append(
                KnowledgeHit(
                    document_id=document.id,
                    title=document.title,
                    category=document.category,
                    source=document.source,
                    content=document.content,
                    score=round(score, 3),
                    intent_tags=document.intent_tags,
                    scene_tags=document.scene_tags,
                    goal_tags=document.goal_tags,
                    plan_link_strength=document.plan_link_strength,
                    answer_points=document.answer_points,
                    fallback_text=document.fallback_text,
                    matched_keywords=matched_keywords,
                )
            )

        scored.sort(key=lambda item: item.score, reverse=True)
        return self._diversify(scored[: max(top_k * 2, top_k)], top_k=top_k)

    def _score(
        self,
        *,
        query: str,
        query_terms: list[str],
        document: KnowledgeDocument,
        intent: str | None,
        user_profile: Any,
        diet_plan: Any,
        training_plan: Any,
    ) -> tuple[float, list[str]]:
        normalized_query = query.lower()
        score = 0.0
        matched_keywords: list[str] = []

        for keyword in document.keywords:
            normalized_keyword = keyword.lower()
            if normalized_keyword and normalized_keyword in normalized_query:
                matched_keywords.append(keyword)
                score += 2.4

        for term in query_terms:
            if term in document.content:
                score += 0.9

        if intent and intent in document.intent_tags:
            score += 1.8

        if user_profile is not None:
            if getattr(user_profile, "diet_scene", None) in document.scene_tags:
                score += 1.2
            if getattr(user_profile, "goal", None) in document.goal_tags:
                score += 0.9

        if diet_plan is not None and document.category == "diet":
            score += 0.4
        if training_plan is not None and document.category == "training":
            score += 0.4

        if not matched_keywords and not any(term in document.content for term in query_terms):
            return 0.0, []

        return score, matched_keywords

    def _diversify(self, hits: list[KnowledgeHit], *, top_k: int) -> list[KnowledgeHit]:
        diversified: list[KnowledgeHit] = []
        seen_categories: dict[str, int] = {}

        for hit in hits:
            category_count = seen_categories.get(hit.category, 0)
            if category_count >= 2 and len(diversified) < top_k:
                continue
            diversified.append(hit)
            seen_categories[hit.category] = category_count + 1
            if len(diversified) == top_k:
                break

        return diversified


def _extract_query_terms(query: str) -> list[str]:
    terms = [term for term in DOMAIN_TERMS if term in query]
    if terms:
        return terms

    return [segment for segment in _split_query(query) if len(segment) >= 2][:4]


def _split_query(query: str) -> list[str]:
    separators = "，。！？、】【；,.!?/ "
    fragments = [query]
    for separator in separators:
        next_fragments: list[str] = []
        for fragment in fragments:
            next_fragments.extend(fragment.split(separator))
        fragments = next_fragments

    return [fragment.strip() for fragment in fragments if fragment.strip()]
