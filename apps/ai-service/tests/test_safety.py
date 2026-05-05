from app.services.safety import SafetyService


def test_prompt_injection_rule_does_not_block_normal_status_sentences() -> None:
    result = SafetyService().evaluate_text(
        "和你今天的关系：你现在是减脂目标，今天更重要的是把蛋白和总热量执行住。"
    )

    assert result.blocked is False
    assert result.matched_categories == []
