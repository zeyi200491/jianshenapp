from __future__ import annotations

import abc
import json
from typing import Any

import httpx

from app.core.config import Settings


class BaseLLMClient(abc.ABC):
    @abc.abstractmethod
    async def complete(self, *, task_name: str, system_prompt: str, user_prompt: str) -> str:
        raise NotImplementedError


class MockLLMClient(BaseLLMClient):
    async def complete(self, *, task_name: str, system_prompt: str, user_prompt: str) -> str:
        context = _extract_context(user_prompt)

        if task_name == "diet_explanation":
            diet_plan = context["diet_plan"]
            user_profile = context["user_profile"]
            question = context["question"]
            answer = (
                f"这份饮食安排围绕“{user_profile['goal']}”目标展开，"
                f"并结合你当前的“{user_profile['diet_scene']}”场景设计。"
                f"针对“{question}”，重点不是推翻目标热量，而是让你更容易把 {diet_plan['targets']['protein_g']}g 蛋白和总热量执行到位。"
            )
            tips = [
                "先守住蛋白质来源，再微调主食和烹饪方式。",
                "食堂优先选清蒸、白灼、炖煮类菜品，减少额外油脂。",
                "如果当天训练安排较晚，可把一部分主食放到训练前后。",
            ]
            if "补剂" in question:
                tips[0] = "先用正常饮食补足蛋白，补剂只作为补充。"
            return json.dumps(
                {"answer": answer, "tips": tips[:3], "riskNote": ""},
                ensure_ascii=False,
            )

        if task_name == "training_explanation":
            training_plan = context["training_plan"]
            question = context["question"]
            answer = (
                f"这份训练计划采用“{training_plan['split_type']}”安排，"
                f"目标是在 {training_plan.get('duration_min') or 45} 分钟内完成主要刺激。"
                f"针对“{question}”，你要优先保证动作顺序和完成度，而不是盲目加量。"
            )
            tips = [
                "先做最耗体力的主动作，再处理辅助动作。",
                "每组保留 1-2 次余力，动作质量优先于追求更大重量。",
                "训练后用 5 分钟做简单拉伸和呼吸放松。",
            ]
            return json.dumps(
                {"answer": answer, "tips": tips, "riskNote": ""},
                ensure_ascii=False,
            )

        if task_name == "plan_adjustment":
            action = context["action"]
            question = context["question"]
            rule_notes = context["rule_notes"]
            answer = (
                f"已按“{action}”场景把计划改成更容易执行的版本。"
                f"这次改动由规则引擎完成结构化调整，模型只负责解释。"
                f"针对“{question}”，你现在直接照着新版计划执行即可。"
            )
            tips = [
                "先按新版计划完整执行 1 天，再看是否需要继续细调。",
                "如果执行阻力来自时间或场地，优先保住主任务，不追求完美。",
                f"本次改动重点：{rule_notes[0]}",
            ]
            return json.dumps(
                {"answer": answer, "tips": tips, "riskNote": ""},
                ensure_ascii=False,
            )

        if task_name == "rag_answer":
            return json.dumps(_build_mock_rag_answer(context), ensure_ascii=False)

        return json.dumps(
            {
                "answer": "当前场景已收到，但没有匹配到对应模板，建议走静态兜底。",
                "tips": ["保持结构化上下文输入。"],
                "riskNote": "",
            },
            ensure_ascii=False,
        )


class OpenAICompatibleLLMClient(BaseLLMClient):
    def __init__(self, settings: Settings) -> None:
        if not settings.ai_openai_base_url or not settings.ai_openai_api_key:
            raise ValueError("openai_compatible 提供方缺少必要配置")
        self._settings = settings

    async def complete(self, *, task_name: str, system_prompt: str, user_prompt: str) -> str:
        payload = {
            "model": self._settings.ai_model,
            "temperature": 0.2,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        }
        headers = {
            "Authorization": f"Bearer {self._settings.ai_openai_api_key}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=self._settings.ai_timeout_seconds) as client:
            response = await client.post(
                f"{self._settings.ai_openai_base_url.rstrip('/')}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


def _extract_context(user_prompt: str) -> dict[str, Any]:
    marker = "```json"
    if marker not in user_prompt:
        return {}
    start = user_prompt.index(marker) + len(marker)
    end = user_prompt.rindex("```")
    return json.loads(user_prompt[start:end].strip())


def _build_mock_rag_answer(context: dict[str, Any]) -> dict[str, Any]:
    question = context["question"]
    snippets = context.get("knowledge_snippets", [])
    user_profile = context.get("user_profile") or {}
    diet_plan = context.get("diet_plan") or {}
    training_plan = context.get("training_plan") or {}
    profile = context.get("question_profile") or {}
    strategy = context.get("answer_strategy") or {}

    if _should_force_balanced_fallback(question=question, profile=profile, snippets=snippets):
        strategy = {
            **strategy,
            "weak_evidence": True,
            "fallback_notice": "现有知识库里没有足够直接依据，以下建议属于基于现有计划与常见训练原则的近似建议。",
        }

    if strategy.get("weak_evidence"):
        relation = "和你今天的关系：如果你今天主要关注训练执行，就先保证训练前后别出现明显不适；如果只是日常习惯问题，可以先按低风险方式观察反应。"
        if diet_plan:
            relation = "和你今天的关系：这件事和你今天的饮食计划关联不强，优先级低于把总热量和蛋白质目标执行到位。"
        answer = "\n".join(
            [
                f"直接回答：{strategy['fallback_notice']}",
                "为什么这么建议：这个问题不属于当前知识库里的高覆盖主题，我先不给过度确定的判断，避免把个体差异很大的问题说成固定结论。",
                relation,
                "下一步：先按低风险做法处理；如果你更在意训练表现，请补充是在训练前多久、是否空腹、是否伴随胃部不适，我再按你的场景细化。",
            ]
        )
        return {
            "answer": answer,
            "tips": [
                "先把高优先级问题放在训练执行、饮食完成度和恢复安排上。",
                "遇到知识覆盖弱的问题，优先采用低风险、小范围试错。",
                "补充更多场景后，我可以把建议收得更窄。",
            ],
            "riskNote": "",
        }

    top_points = _collect_answer_points(snippets)
    direct = _build_direct_answer(
        question=question,
        profile=profile,
        diet_plan=diet_plan,
        training_plan=training_plan,
        top_points=top_points,
        snippets=snippets,
    )
    why = _build_reason_answer(profile=profile, top_points=top_points, snippets=snippets)
    plan_relation = _build_plan_relation(profile=profile, user_profile=user_profile, diet_plan=diet_plan, training_plan=training_plan)
    next_step = _build_next_step(profile=profile, top_points=top_points, diet_plan=diet_plan, training_plan=training_plan)

    answer = "\n".join(
        [
            f"直接回答：{direct}",
            f"为什么这么建议：{why}",
            f"和你今天的关系：{plan_relation}",
            f"下一步：{next_step}",
        ]
    )

    tips = _build_tips(profile=profile, top_points=top_points)
    return {"answer": answer, "tips": tips, "riskNote": ""}


def _collect_answer_points(snippets: list[dict[str, Any]]) -> list[str]:
    points: list[str] = []
    for snippet in snippets:
        snippet_points = snippet.get("answer_points") or []
        if snippet_points:
            points.extend(snippet_points[:2])
            continue
        content = snippet.get("content", "")
        if content:
            points.append(content)
    return points[:3]


def _build_direct_answer(
    *,
    question: str,
    profile: dict[str, Any],
    diet_plan: dict[str, Any],
    training_plan: dict[str, Any],
    top_points: list[str],
    snippets: list[dict[str, Any]],
) -> str:
    intent = profile.get("intent")

    if intent == "diet_substitution":
        protein_target = ((diet_plan.get("targets") or {}).get("protein_g")) or "今天"
        base = top_points[0] if top_points else "先守住蛋白质来源，再找最容易执行的替代食物。"
        return f"先保蛋白，不必执着于单一食材。{base} 优先目标是把你今天约 {protein_target}g 的蛋白目标尽量守住。"

    if intent == "training_execution":
        duration = training_plan.get("duration_min") or 45
        base = top_points[0] if top_points else "先保留主动作和大肌群刺激，再压缩辅助动作。"
        return f"今天这次训练可以压缩，但不要把主动作全部砍掉。{base} 目标是把训练控制在约 {duration} 分钟内仍然完成主要刺激。"

    if intent == "supplement_guidance":
        base = top_points[0] if top_points else "补剂不是第一优先级，先看正常饮食是否已经能覆盖需求。"
        return f"先看饮食，再决定要不要上补剂。{base}"

    if intent == "recovery_guidance":
        base = top_points[0] if top_points else "恢复状态差时先保质量，不追求硬顶训练量。"
        return f"先判断今天该保留多少训练刺激，再决定要不要减量。{base}"

    base = top_points[0] if top_points else (snippets[0]["content"] if snippets else "先按低风险、可执行的原则处理。")
    return f"{base} 我先回答你的核心问题，再顺带告诉你怎么放回今天的计划里。"


def _build_reason_answer(*, profile: dict[str, Any], top_points: list[str], snippets: list[dict[str, Any]]) -> str:
    if len(top_points) >= 2:
        return f"当前命中的知识重点有两层：第一，{top_points[0]} 第二，{top_points[1]}"
    if top_points:
        return f"当前命中的主要依据是：{top_points[0]}"
    if snippets:
        return f"当前主要依据来自知识条目《{snippets[0]['title']}》的执行原则。"
    return "当前依据以低风险通用训练与饮食原则为主。"


def _build_plan_relation(
    *,
    profile: dict[str, Any],
    user_profile: dict[str, Any],
    diet_plan: dict[str, Any],
    training_plan: dict[str, Any],
) -> str:
    intent = profile.get("intent")
    goal = user_profile.get("goal", "当前")
    scene = user_profile.get("diet_scene", "当前")

    if intent == "diet_substitution" and diet_plan:
        protein_target = ((diet_plan.get("targets") or {}).get("protein_g")) or "当天"
        return f"你现在是“{goal}”目标、且处在“{scene}”场景，今天更重要的是把蛋白和总热量大方向执行住，而不是纠结食材是否完美；蛋白目标可以先盯住约 {protein_target}g。"

    if intent == "training_execution" and training_plan:
        return f"你今天这次训练是“{training_plan.get('title', '当前训练')}”，重点是保住主动作顺序和完成度，辅助动作可以后移或缩减。"

    if intent == "supplement_guidance" and diet_plan:
        return "如果你今天的正餐和蛋白目标还没执行稳，补剂优先级要排在后面，先把正常饮食补齐更划算。"

    if intent == "recovery_guidance" and training_plan:
        return "如果你今天还有训练安排，恢复建议的目标不是完全摆烂，而是让你保住最低有效训练刺激。"

    if diet_plan or training_plan:
        return "这类通用知识不用强行拉回计划，但如果你今天正在执行训练或饮食目标，优先级还是放在最影响执行结果的那一件事上。"
    return "这类问题和今天计划的关联不算强，我先按通用健身原则回答你。"


def _build_next_step(
    *,
    profile: dict[str, Any],
    top_points: list[str],
    diet_plan: dict[str, Any],
    training_plan: dict[str, Any],
) -> str:
    intent = profile.get("intent")

    if intent == "diet_substitution":
        return "本餐先从高蛋白选项里挑 1-2 个最容易拿到的，再正常保留一份主食；如果晚上还有训练，别为了“吃得干净”把总摄入压得太低。"

    if intent == "training_execution":
        duration = training_plan.get("duration_min") or 45
        return f"先保留前 3-4 个最关键动作，把组间休息压到 45-60 秒；如果总时长还超出，就先砍最后面的辅助动作，把训练收进约 {duration} 分钟内。"

    if intent == "supplement_guidance":
        return "先看你今天正常饮食能不能把核心目标补齐；只有明显补不上时，再考虑用最基础、证据最稳定的补剂。"

    if intent == "recovery_guidance":
        return "先决定今天是减量、缩短还是保主动作；同时优先补睡眠和进食，不把恢复问题完全留给下一次训练。"

    if top_points:
        return "先按上面的低风险建议执行 1 次，再根据你今天的训练、饮食完成度或身体反馈继续细化。"
    return "先把你更关心的目标、场景和时间点补充给我，我再把建议收得更窄。"


def _build_tips(*, profile: dict[str, Any], top_points: list[str]) -> list[str]:
    intent = profile.get("intent")
    tips = [
        "先执行最影响结果的 1 件事，不要一次改太多变量。",
        "如果你是围绕今天计划提问，优先看能不能把蛋白、主动作和恢复底线守住。",
        "遇到不确定问题时，先用低风险、可持续的做法。",
    ]

    if intent == "supplement_guidance":
        tips[1] = "补剂优先级排在正常饮食、训练完成度和睡眠之后。"
    elif intent == "training_execution":
        tips[0] = "主动作优先，辅助动作和花哨变化往后排。"
    elif intent == "diet_substitution":
        tips[0] = "先守蛋白，再决定主食和烹饪方式怎么微调。"

    if top_points:
        tips[2] = f"这次回答主要参考了：{top_points[0]}"

    return tips[:3]


def _should_force_balanced_fallback(*, question: str, profile: dict[str, Any], snippets: list[dict[str, Any]]) -> bool:
    if profile.get("intent") != "general_knowledge":
        return False

    if not snippets:
        return True

    if any(keyword in question for keyword in ("口香糖", "咀嚼", "嚼")):
        return True

    strongest_hit = snippets[0]
    return len(strongest_hit.get("matched_keywords") or []) <= 1
