from __future__ import annotations

from typing import Any

from app.main import create_app


def test_budget_savings_openapi_money_fields_are_decimal_strings() -> None:
    schemas = create_app().openapi()["components"]["schemas"]

    for schema_name, field_name in [
        ("BudgetCreateRequest", "limit_amount"),
        ("BudgetUpdateRequest", "limit_amount"),
        ("BudgetResponse", "limit_amount"),
        ("BudgetProgressResponse", "spent_amount"),
        ("BudgetProgressResponse", "remaining_amount"),
        ("BudgetProgressResponse", "percent_used"),
        ("SavingsGoalCreateRequest", "target_amount"),
        ("SavingsGoalCreateRequest", "monthly_target_amount"),
        ("SavingsGoalUpdateRequest", "target_amount"),
        ("SavingsGoalUpdateRequest", "monthly_target_amount"),
        ("SavingsGoalResponse", "target_amount"),
        ("SavingsGoalResponse", "monthly_target_amount"),
        ("SavingsGoalProgressResponse", "saved_amount"),
        ("SavingsGoalProgressResponse", "remaining_amount"),
        ("SavingsGoalProgressResponse", "percent_complete"),
        ("SavingsContributionCreateRequest", "amount"),
        ("SavingsContributionResponse", "amount"),
    ]:
        assert_decimal_string_schema(schemas[schema_name]["properties"][field_name])


def test_budget_openapi_list_contract() -> None:
    schema = create_app().openapi()
    list_schema = schema["components"]["schemas"]["BudgetListResponse"]
    progress_schema = schema["components"]["schemas"]["BudgetProgressResponse"]

    assert set(list_schema["properties"]) == {"items", "next_cursor", "has_more"}
    assert list_schema["properties"]["items"]["items"] == {
        "$ref": "#/components/schemas/BudgetResponse"
    }
    assert list_schema["properties"]["has_more"]["type"] == "boolean"
    assert progress_schema["properties"]["status"]["enum"] == [
        "on_track",
        "over_budget",
    ]

    parameters = {
        parameter["name"]: parameter
        for parameter in schema["paths"]["/api/v1/budgets"]["get"]["parameters"]
    }
    assert set(parameters) == {
        "category_id",
        "cursor",
        "include_archived",
        "limit",
        "month",
    }
    assert parameters["limit"]["schema"]["minimum"] == 1
    assert parameters["limit"]["schema"]["maximum"] == 100
    assert parameters["month"]["schema"]["anyOf"][0]["pattern"] == r"^\d{4}-\d{2}$"
    assert parameters["include_archived"]["schema"]["default"] is False


def test_savings_openapi_list_and_contribution_contracts() -> None:
    schema = create_app().openapi()
    goal_list_schema = schema["components"]["schemas"]["SavingsGoalListResponse"]
    contribution_list_schema = schema["components"]["schemas"][
        "SavingsContributionListResponse"
    ]
    goal_progress_schema = schema["components"]["schemas"][
        "SavingsGoalProgressResponse"
    ]

    assert set(goal_list_schema["properties"]) == {"items", "next_cursor", "has_more"}
    assert goal_list_schema["properties"]["items"]["items"] == {
        "$ref": "#/components/schemas/SavingsGoalResponse"
    }
    assert set(contribution_list_schema["properties"]) == {
        "items",
        "next_cursor",
        "has_more",
    }
    assert contribution_list_schema["properties"]["items"]["items"] == {
        "$ref": "#/components/schemas/SavingsContributionResponse"
    }
    assert goal_progress_schema["properties"]["is_target_met"]["type"] == "boolean"

    goal_parameters = {
        parameter["name"]: parameter
        for parameter in schema["paths"]["/api/v1/savings-goals"]["get"]["parameters"]
    }
    assert set(goal_parameters) == {"cursor", "limit", "status"}
    assert goal_parameters["status"]["schema"]["enum"] == [
        "all",
        "active",
        "completed",
        "archived",
    ]
    assert goal_parameters["status"]["schema"]["default"] == "all"
    assert goal_parameters["limit"]["schema"]["minimum"] == 1
    assert goal_parameters["limit"]["schema"]["maximum"] == 100

    contribution_parameters = {
        parameter["name"]: parameter
        for parameter in schema["paths"][
            "/api/v1/savings-goals/{goal_id}/contributions"
        ]["get"]["parameters"]
    }
    assert set(contribution_parameters) == {"cursor", "goal_id", "limit"}
    assert contribution_parameters["limit"]["schema"]["minimum"] == 1
    assert contribution_parameters["limit"]["schema"]["maximum"] == 100


def test_budget_savings_mutations_require_bearer_security() -> None:
    schema = create_app().openapi()

    for path, method in [
        ("/api/v1/budgets", "post"),
        ("/api/v1/budgets/{budget_id}", "patch"),
        ("/api/v1/budgets/{budget_id}", "delete"),
        ("/api/v1/savings-goals", "post"),
        ("/api/v1/savings-goals/{goal_id}", "patch"),
        ("/api/v1/savings-goals/{goal_id}", "delete"),
        ("/api/v1/savings-goals/{goal_id}/contributions", "post"),
    ]:
        assert schema["paths"][path][method]["security"] == [{"HTTPBearer": []}]


def assert_decimal_string_schema(field_schema: dict[str, Any]) -> None:
    if "anyOf" in field_schema:
        variants = field_schema["anyOf"]
        assert any(variant.get("type") == "string" for variant in variants)
        assert all(variant.get("type") != "number" for variant in variants)
        return

    assert field_schema["type"] == "string"
    assert "pattern" in field_schema
