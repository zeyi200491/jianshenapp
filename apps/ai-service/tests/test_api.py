import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app
from app.services.container import get_ai_orchestrator, get_boundary_policy, get_llm_client


@pytest.fixture(autouse=True)
def reset_service_caches() -> None:
    get_settings.cache_clear()
    get_llm_client.cache_clear()
    get_boundary_policy.cache_clear()
    get_ai_orchestrator.cache_clear()
    yield
    get_settings.cache_clear()
    get_llm_client.cache_clear()
    get_boundary_policy.cache_clear()
    get_ai_orchestrator.cache_clear()


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


def _diet_payload() -> dict:
    return {
        "question": "今天食堂没有鸡胸肉怎么办？",
        "user_profile": {
            "goal": "减脂",
            "diet_scene": "canteen",
            "training_level": "beginner",
            "supplement_opt_in": False,
        },
        "diet_plan": {
            "title": "食堂减脂日方案",
            "summary": "控制热量并优先保证蛋白质",
            "targets": {
                "calories": 2100,
                "protein_g": 140,
                "carb_g": 220,
                "fat_g": 60,
            },
            "meals": [
                {"meal_name": "午餐", "foods": ["鸡胸肉", "米饭", "西兰花"], "note": ""}
            ],
        },
    }


def _training_payload() -> dict:
    return {
        "question": "今天没时间，能缩短吗？",
        "user_profile": {
            "goal": "增肌",
            "diet_scene": "dorm",
            "training_level": "intermediate",
            "supplement_opt_in": True,
        },
        "training_plan": {
            "title": "全身训练 A",
            "split_type": "full_body",
            "duration_min": 50,
            "summary": "全身训练主打基础复合动作",
            "items": [
                {"name": "杠铃深蹲", "sets": 4, "reps": "6-8", "equipment": "杠铃", "note": ""},
                {"name": "杠铃卧推", "sets": 4, "reps": "6-8", "equipment": "杠铃", "note": ""},
                {"name": "高位下拉", "sets": 4, "reps": "8-10", "equipment": "器械", "note": ""},
                {"name": "哑铃肩推", "sets": 3, "reps": "8-10", "equipment": "哑铃", "note": ""},
                {"name": "平板支撑", "sets": 3, "reps": "40秒", "equipment": "自重", "note": ""},
            ],
        },
    }


def test_diet_explanation(client: TestClient) -> None:
    response = client.post("/api/v1/diet-plans/explain", json=_diet_payload())
    body = response.json()

    assert response.status_code == 200
    assert body["code"] == "OK"
    assert "蛋白" in body["data"]["answer"]
    assert len(body["data"]["tips"]) >= 1


def test_plan_adjust_by_rule_engine(client: TestClient) -> None:
    response = client.post(
        "/api/v1/plans/adjust",
        json={
            "plan_type": "training",
            "action": "only_20_minutes",
            "question": "今天只能练 20 分钟。",
            "user_profile": _training_payload()["user_profile"],
            "training_plan": _training_payload()["training_plan"],
        },
    )
    body = response.json()

    assert response.status_code == 200
    assert body["data"]["adjusted_training_plan"]["duration_min"] == 20
    assert body["data"]["trace"][1]["owner"] == "rule_engine"


def test_rag_high_risk_blocked(client: TestClient) -> None:
    response = client.post(
        "/api/v1/rag/ask",
        json={"question": "我想断食加泻药，怎么瘦更快？", "top_k": 2},
    )
    body = response.json()

    assert response.status_code == 400
    assert body["code"] == "AI_SAFETY_BLOCKED"


def test_rag_answer_is_structured_and_lightly_links_back_to_today_plan(client: TestClient) -> None:
    payload = _diet_payload()
    payload["question"] = "如果食堂没有合适蛋白质来源，我该怎么替换？"
    response = client.post("/api/v1/rag/ask", json=payload)
    body = response.json()

    assert response.status_code == 200
    assert body["code"] == "OK"
    answer = body["data"]["answer"]
    assert "直接回答：" in answer
    assert "为什么这么建议：" in answer
    assert "和你今天的关系：" in answer
    assert "下一步：" in answer
    assert "蛋白" in answer
    assert len(body["data"]["citations"]) >= 1
    trace_steps = [step["step"] for step in body["data"]["trace"]]
    assert "question_classification" in trace_steps
    assert "answer_strategy" in trace_steps


def test_rag_answer_uses_different_strategy_for_training_execution_question(client: TestClient) -> None:
    payload = _training_payload()
    payload["top_k"] = 3
    response = client.post("/api/v1/rag/ask", json=payload)
    body = response.json()

    assert response.status_code == 200
    assert body["code"] == "OK"
    answer = body["data"]["answer"]
    assert "直接回答：" in answer
    assert "今天这次训练" in answer
    assert "主动作" in answer or "训练顺序" in answer
    assert "20" in answer or "50" in answer


def test_rag_answer_with_weak_match_returns_balanced_fallback(client: TestClient) -> None:
    response = client.post(
        "/api/v1/rag/ask",
        json={
            "question": "训练前嚼口香糖会影响状态吗？",
            "top_k": 2,
            "user_profile": {
                "goal": "减脂",
                "diet_scene": "canteen",
                "training_level": "beginner",
                "supplement_opt_in": False,
            },
        },
    )
    body = response.json()

    assert response.status_code == 200
    assert body["code"] == "OK"
    answer = body["data"]["answer"]
    assert "现有知识库里没有足够直接依据" in answer
    assert "近似建议" in answer
    assert "补充" in answer
    trace_steps = [step["step"] for step in body["data"]["trace"]]
    assert "fallback_notice" in trace_steps


def test_rag_answer_covers_takeout_cutting_scene(client: TestClient) -> None:
    response = client.post(
        "/api/v1/rag/ask",
        json={
            "question": "减脂期点外卖怎么点更稳？",
            "top_k": 3,
            "user_profile": {
                "goal": "减脂",
                "diet_scene": "takeout",
                "training_level": "beginner",
                "supplement_opt_in": False,
            },
            "diet_plan": {
                "title": "工作日减脂饮食",
                "summary": "优先蛋白质和总热量控制",
                "targets": {"calories": 2100, "protein_g": 140, "carb_g": 220, "fat_g": 60},
                "meals": [{"meal_name": "晚餐", "foods": [], "note": ""}],
            },
        },
    )
    body = response.json()

    assert response.status_code == 200
    assert body["code"] == "OK"
    answer = body["data"]["answer"]
    assert "外卖" in answer
    assert "酱料" in answer or "分开" in answer
    assert "蛋白" in answer


def test_rag_answer_covers_budget_protein_scene(client: TestClient) -> None:
    response = client.post(
        "/api/v1/rag/ask",
        json={
            "question": "学生党预算不高，怎么把蛋白质吃够？",
            "top_k": 3,
            "user_profile": {
                "goal": "增肌",
                "diet_scene": "dorm",
                "training_level": "beginner",
                "supplement_opt_in": False,
            },
        },
    )
    body = response.json()

    assert response.status_code == 200
    assert body["code"] == "OK"
    answer = body["data"]["answer"]
    assert "鸡蛋" in answer
    assert "豆腐" in answer or "牛奶" in answer
    assert "预算" in answer or "便宜" in answer


def test_rag_answer_covers_weight_plateau_scene(client: TestClient) -> None:
    response = client.post(
        "/api/v1/rag/ask",
        json={
            "question": "减脂一周体重没掉，是不是要继续降热量？",
            "top_k": 3,
            "user_profile": {
                "goal": "减脂",
                "diet_scene": "canteen",
                "training_level": "intermediate",
                "supplement_opt_in": False,
            },
        },
    )
    body = response.json()

    assert response.status_code == 200
    assert body["code"] == "OK"
    answer = body["data"]["answer"]
    assert "7-14天" in answer or "一到两周" in answer
    assert "热量" in answer
    assert "体重" in answer


def test_rag_answer_covers_hotel_training_scene(client: TestClient) -> None:
    response = client.post(
        "/api/v1/rag/ask",
        json={
            "question": "出差住酒店，只有哑铃和跑步机，今天训练怎么做？",
            "top_k": 3,
            "user_profile": {
                "goal": "维持",
                "diet_scene": "hotel",
                "training_level": "intermediate",
                "supplement_opt_in": False,
            },
            "training_plan": {
                "title": "上肢训练 B",
                "split_type": "upper",
                "duration_min": 45,
                "summary": "以推拉动作为主",
                "items": [
                    {"name": "杠铃卧推", "sets": 4, "reps": "6-8", "equipment": "杠铃", "note": ""},
                    {"name": "坐姿划船", "sets": 4, "reps": "8-10", "equipment": "器械", "note": ""},
                ],
            },
        },
    )
    body = response.json()

    assert response.status_code == 200
    assert body["code"] == "OK"
    answer = body["data"]["answer"]
    assert "哑铃" in answer
    assert "跑步机" in answer or "热身" in answer
    assert "训练" in answer
