from __future__ import annotations

import asyncio
from collections.abc import Iterator
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path

import pytest
from alembic.config import Config
from fastapi import FastAPI
from fastapi.testclient import TestClient

from alembic import command
from app.core.config import Settings
from app.core.database import (
    build_async_engine,
    build_session_factory,
    get_session,
    get_session_from_factory,
)
from app.main import create_app


@dataclass(frozen=True)
class BudgetApiContext:
    client: TestClient
    database_url: str


def build_alembic_config(database_url: str) -> Config:
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def budget_test_app(database_url: str) -> FastAPI:
    return create_app(
        Settings(
            app_name="PFM Test API",
            app_env="test",
            debug=False,
            cors_origins=["http://testserver"],
            database_url=database_url,
            access_token_secret_key="budget-test-secret-with-at-least-32-bytes",
        ),
    )


@pytest.fixture
def budget_context(disposable_postgres_url: str) -> Iterator[BudgetApiContext]:
    command.upgrade(build_alembic_config(disposable_postgres_url), "head")
    engine = build_async_engine(disposable_postgres_url)
    session_factory = build_session_factory(engine)
    app = budget_test_app(disposable_postgres_url)

    async def test_session() -> object:
        async for session in get_session_from_factory(session_factory):
            yield session

    app.dependency_overrides[get_session] = test_session

    try:
        with TestClient(app) as client:
            yield BudgetApiContext(
                client=client,
                database_url=disposable_postgres_url,
            )
    finally:
        asyncio.run(engine.dispose())


def test_budget_crud_progress_and_period_boundaries(
    budget_context: BudgetApiContext,
) -> None:
    context = budget_context
    headers = auth_headers(context, "budget-progress@example.com")
    account = create_account(context, headers, "Budget Checking", "bank", "0")
    foreign_account = create_account(
        context,
        headers,
        "Foreign Budget Account",
        "bank",
        "0",
        currency="BDT",
    )
    food_category = create_category(context, headers, "Food", "expense", "utensils")
    rent_category = create_category(context, headers, "Rent", "expense", "home")
    income_category = create_category(context, headers, "Salary", "income", "briefcase")

    global_budget = create_budget(
        context,
        headers,
        category_id=None,
        period_type="monthly",
        period_start="2026-01-01",
        period_end="2026-02-01",
        limit_amount="100.0000",
    )
    assert global_budget["category_id"] is None
    assert Decimal(global_budget["progress"]["spent_amount"]) == Decimal("0")

    food_budget = create_budget(
        context,
        headers,
        category_id=food_category["id"],
        period_type="monthly",
        period_start="2026-01-01",
        period_end="2026-02-01",
        limit_amount="25.0000",
    )
    assert food_budget["category_name"] == "Food"

    create_transaction(
        context,
        headers,
        account["id"],
        food_category["id"],
        "expense",
        "20.0000",
        "2026-01-01T00:00:00+00:00",
    )
    create_transaction(
        context,
        headers,
        account["id"],
        rent_category["id"],
        "expense",
        "30.0000",
        "2026-01-31T23:59:59+00:00",
    )
    create_transaction(
        context,
        headers,
        account["id"],
        food_category["id"],
        "expense",
        "40.0000",
        "2026-02-01T00:00:00+00:00",
    )
    create_transaction(
        context,
        headers,
        account["id"],
        income_category["id"],
        "income",
        "500.0000",
        "2026-01-15T00:00:00+00:00",
    )
    create_transaction(
        context,
        headers,
        foreign_account["id"],
        food_category["id"],
        "expense",
        "99.0000",
        "2026-01-20T00:00:00+00:00",
    )

    detail_response = context.client.get(
        f"/api/v1/budgets/{global_budget['id']}",
        headers=headers,
    )
    assert detail_response.status_code == 200
    global_detail = detail_response.json()
    assert Decimal(global_detail["progress"]["spent_amount"]) == Decimal("50.0000")
    assert Decimal(global_detail["progress"]["remaining_amount"]) == Decimal("50.0000")
    assert Decimal(global_detail["progress"]["percent_used"]) == Decimal("50")
    assert global_detail["progress"]["status"] == "on_track"

    food_detail_response = context.client.get(
        f"/api/v1/budgets/{food_budget['id']}",
        headers=headers,
    )
    assert food_detail_response.status_code == 200
    food_detail = food_detail_response.json()
    assert Decimal(food_detail["progress"]["spent_amount"]) == Decimal("20.0000")
    assert Decimal(food_detail["progress"]["remaining_amount"]) == Decimal("5.0000")

    update_response = context.client.patch(
        f"/api/v1/budgets/{food_budget['id']}",
        headers=headers,
        json={"limit_amount": "15.0000"},
    )
    assert update_response.status_code == 200
    updated_food = update_response.json()
    assert Decimal(updated_food["progress"]["remaining_amount"]) == Decimal("-5.0000")
    assert updated_food["progress"]["status"] == "over_budget"

    list_response = context.client.get(
        "/api/v1/budgets",
        headers=headers,
        params={"month": "2026-01"},
    )
    assert list_response.status_code == 200
    assert {item["id"] for item in list_response.json()["items"]} == {
        global_budget["id"],
        food_budget["id"],
    }

    filter_response = context.client.get(
        "/api/v1/budgets",
        headers=headers,
        params={"category_id": food_category["id"], "month": "2026-01"},
    )
    assert filter_response.status_code == 200
    assert [item["id"] for item in filter_response.json()["items"]] == [
        food_budget["id"]
    ]


def test_budget_overlap_rules_and_archive_behavior(
    budget_context: BudgetApiContext,
) -> None:
    context = budget_context
    headers = auth_headers(context, "budget-overlap@example.com")
    food_category = create_category(context, headers, "Overlap Food", "expense", "food")
    rent_category = create_category(context, headers, "Overlap Rent", "expense", "home")

    global_budget = create_budget(
        context,
        headers,
        category_id=None,
        period_type="monthly",
        period_start="2026-03-01",
        period_end="2026-04-01",
        limit_amount="100.0000",
    )
    food_budget = create_budget(
        context,
        headers,
        category_id=food_category["id"],
        period_type="monthly",
        period_start="2026-03-01",
        period_end="2026-04-01",
        limit_amount="25.0000",
    )
    rent_budget = create_budget(
        context,
        headers,
        category_id=rent_category["id"],
        period_type="monthly",
        period_start="2026-03-01",
        period_end="2026-04-01",
        limit_amount="50.0000",
    )
    assert {global_budget["id"], food_budget["id"], rent_budget["id"]}

    duplicate_global_response = context.client.post(
        "/api/v1/budgets",
        headers=headers,
        json={
            "period_type": "monthly",
            "period_start": "2026-03-01",
            "period_end": "2026-04-01",
            "limit_amount": "90.0000",
        },
    )
    assert duplicate_global_response.status_code == 409

    overlapping_food_response = context.client.post(
        "/api/v1/budgets",
        headers=headers,
        json={
            "category_id": food_category["id"],
            "period_type": "custom",
            "period_start": "2026-03-15",
            "period_end": "2026-04-15",
            "limit_amount": "30.0000",
        },
    )
    assert overlapping_food_response.status_code == 409

    archive_response = context.client.delete(
        f"/api/v1/budgets/{food_budget['id']}",
        headers=headers,
    )
    assert archive_response.status_code == 200
    assert archive_response.json()["is_archived"] is True
    assert archive_response.json()["archived_at"] is not None

    recreated_food_response = context.client.post(
        "/api/v1/budgets",
        headers=headers,
        json={
            "category_id": food_category["id"],
            "period_type": "monthly",
            "period_start": "2026-03-01",
            "period_end": "2026-04-01",
            "limit_amount": "35.0000",
        },
    )
    assert recreated_food_response.status_code == 201

    active_response = context.client.get(
        "/api/v1/budgets",
        headers=headers,
        params={"month": "2026-03"},
    )
    assert active_response.status_code == 200
    active_ids = {item["id"] for item in active_response.json()["items"]}
    assert food_budget["id"] not in active_ids
    assert recreated_food_response.json()["id"] in active_ids

    archived_response = context.client.get(
        "/api/v1/budgets",
        headers=headers,
        params={"month": "2026-03", "include_archived": True},
    )
    assert archived_response.status_code == 200
    archived_ids = {item["id"] for item in archived_response.json()["items"]}
    assert food_budget["id"] in archived_ids


def test_budget_validation_ownership_and_openapi(
    budget_context: BudgetApiContext,
) -> None:
    context = budget_context
    owner_headers = auth_headers(context, "budget-owner@example.com")
    other_headers = auth_headers(context, "budget-other@example.com")
    expense_category = create_category(
        context, owner_headers, "Owner Expense", "expense", "cart"
    )
    income_category = create_category(
        context, owner_headers, "Owner Income", "income", "wallet"
    )
    other_category = create_category(
        context, other_headers, "Other Expense", "expense", "box"
    )

    budget = create_budget(
        context,
        owner_headers,
        category_id=expense_category["id"],
        period_type="monthly",
        period_start="2026-05-01",
        period_end="2026-06-01",
        limit_amount="75.0000",
    )

    invalid_income_category_response = context.client.post(
        "/api/v1/budgets",
        headers=owner_headers,
        json={
            "category_id": income_category["id"],
            "period_type": "monthly",
            "period_start": "2026-06-01",
            "period_end": "2026-07-01",
            "limit_amount": "10.0000",
        },
    )
    assert invalid_income_category_response.status_code == 422

    cross_user_category_response = context.client.post(
        "/api/v1/budgets",
        headers=owner_headers,
        json={
            "category_id": other_category["id"],
            "period_type": "monthly",
            "period_start": "2026-06-01",
            "period_end": "2026-07-01",
            "limit_amount": "10.0000",
        },
    )
    assert cross_user_category_response.status_code == 422

    archive_category_response = context.client.delete(
        f"/api/v1/categories/{expense_category['id']}",
        headers=owner_headers,
    )
    assert archive_category_response.status_code == 200

    archived_category_response = context.client.post(
        "/api/v1/budgets",
        headers=owner_headers,
        json={
            "category_id": expense_category["id"],
            "period_type": "monthly",
            "period_start": "2026-06-01",
            "period_end": "2026-07-01",
            "limit_amount": "10.0000",
        },
    )
    assert archived_category_response.status_code == 422

    bad_month_response = context.client.post(
        "/api/v1/budgets",
        headers=owner_headers,
        json={
            "period_type": "monthly",
            "period_start": "2026-05-02",
            "period_end": "2026-06-01",
            "limit_amount": "10.0000",
        },
    )
    assert bad_month_response.status_code == 422

    float_amount_response = context.client.post(
        "/api/v1/budgets",
        headers=owner_headers,
        json={
            "period_type": "monthly",
            "period_start": "2026-06-01",
            "period_end": "2026-07-01",
            "limit_amount": 1.2,
        },
    )
    assert float_amount_response.status_code == 422

    assert (
        context.client.get(
            f"/api/v1/budgets/{budget['id']}",
            headers=other_headers,
        ).status_code
        == 404
    )
    assert (
        context.client.patch(
            f"/api/v1/budgets/{budget['id']}",
            headers=other_headers,
            json={"limit_amount": "80.0000"},
        ).status_code
        == 404
    )
    assert (
        context.client.delete(
            f"/api/v1/budgets/{budget['id']}",
            headers=other_headers,
        ).status_code
        == 404
    )

    invalid_filter_response = context.client.get(
        "/api/v1/budgets",
        headers=owner_headers,
        params={"category_id": other_category["id"]},
    )
    assert invalid_filter_response.status_code == 422

    openapi = context.client.get("/openapi.json").json()
    assert "/api/v1/budgets" in openapi["paths"]
    assert "/api/v1/budgets/{budget_id}" in openapi["paths"]
    assert openapi["paths"]["/api/v1/budgets"]["post"]["security"] == [
        {"HTTPBearer": []}
    ]
    assert (
        openapi["paths"]["/api/v1/budgets"]["get"]["responses"]["200"]["content"][
            "application/json"
        ]["schema"]["$ref"]
        == "#/components/schemas/BudgetListResponse"
    )


def test_budget_utc_boundaries_and_cursor_errors(
    budget_context: BudgetApiContext,
) -> None:
    context = budget_context
    headers = auth_headers(context, "budget-boundaries@example.com")
    account = create_account(context, headers, "Boundary Checking", "bank", "0")
    category = create_category(context, headers, "Boundary Food", "expense", "food")

    january_budget = create_budget(
        context,
        headers,
        category_id=None,
        period_type="monthly",
        period_start="2026-01-01",
        period_end="2026-02-01",
        limit_amount="100.0000",
    )
    february_budget = create_budget(
        context,
        headers,
        category_id=None,
        period_type="monthly",
        period_start="2026-02-01",
        period_end="2026-03-01",
        limit_amount="100.0000",
    )
    create_budget(
        context,
        headers,
        category_id=None,
        period_type="monthly",
        period_start="2026-03-01",
        period_end="2026-04-01",
        limit_amount="100.0000",
    )

    create_transaction(
        context,
        headers,
        account["id"],
        category["id"],
        "expense",
        "25.0000",
        "2026-01-01T00:30:00+02:00",
    )
    create_transaction(
        context,
        headers,
        account["id"],
        category["id"],
        "expense",
        "30.0000",
        "2026-02-01T01:30:00+02:00",
    )
    create_transaction(
        context,
        headers,
        account["id"],
        category["id"],
        "expense",
        "40.0000",
        "2025-12-31T23:30:00-02:00",
    )

    detail_response = context.client.get(
        f"/api/v1/budgets/{january_budget['id']}",
        headers=headers,
    )
    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert Decimal(detail["progress"]["spent_amount"]) == Decimal("70.0000")
    assert Decimal(detail["progress"]["remaining_amount"]) == Decimal("30.0000")

    first_page_response = context.client.get(
        "/api/v1/budgets",
        headers=headers,
        params={"limit": 1},
    )
    assert first_page_response.status_code == 200
    first_page = first_page_response.json()
    assert first_page["has_more"] is True
    assert first_page["next_cursor"] is not None

    second_page_response = context.client.get(
        "/api/v1/budgets",
        headers=headers,
        params={"limit": 1, "cursor": first_page["next_cursor"]},
    )
    assert second_page_response.status_code == 200
    assert second_page_response.json()["items"][0]["id"] == february_budget["id"]

    invalid_cursor_response = context.client.get(
        "/api/v1/budgets",
        headers=headers,
        params={"cursor": "not-a-valid-cursor"},
    )
    assert invalid_cursor_response.status_code == 422

    invalid_month_response = context.client.get(
        "/api/v1/budgets",
        headers=headers,
        params={"month": "2026-13"},
    )
    assert invalid_month_response.status_code == 422


def auth_headers(context: BudgetApiContext, email: str) -> dict[str, str]:
    register_response = context.client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "CorrectHorse42"},
    )
    assert register_response.status_code == 201

    login_response = context.client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "CorrectHorse42"},
    )
    assert login_response.status_code == 200
    return {"Authorization": f"Bearer {login_response.json()['access_token']}"}


def create_account(
    context: BudgetApiContext,
    headers: dict[str, str],
    name: str,
    account_type: str,
    opening_balance: str,
    currency: str = "USD",
) -> dict[str, object]:
    response = context.client.post(
        "/api/v1/accounts",
        headers=headers,
        json={
            "name": name,
            "type": account_type,
            "currency": currency,
            "opening_balance": opening_balance,
        },
    )
    assert response.status_code == 201
    return dict(response.json())


def create_category(
    context: BudgetApiContext,
    headers: dict[str, str],
    name: str,
    kind: str,
    icon_key: str,
) -> dict[str, object]:
    response = context.client.post(
        "/api/v1/categories",
        headers=headers,
        json={"name": name, "kind": kind, "icon_key": icon_key},
    )
    assert response.status_code == 201
    return dict(response.json())


def create_transaction(
    context: BudgetApiContext,
    headers: dict[str, str],
    account_id: object,
    category_id: object,
    transaction_type: str,
    amount: str,
    transaction_at: str,
) -> dict[str, object]:
    response = context.client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "account_id": account_id,
            "category_id": category_id,
            "type": transaction_type,
            "amount": amount,
            "transaction_at": transaction_at,
        },
    )
    assert response.status_code == 201
    return dict(response.json())


def create_budget(
    context: BudgetApiContext,
    headers: dict[str, str],
    *,
    category_id: object | None,
    period_type: str,
    period_start: str,
    period_end: str,
    limit_amount: str,
) -> dict[str, object]:
    payload: dict[str, object] = {
        "period_type": period_type,
        "period_start": period_start,
        "period_end": period_end,
        "limit_amount": limit_amount,
    }
    if category_id is not None:
        payload["category_id"] = category_id
    response = context.client.post(
        "/api/v1/budgets",
        headers=headers,
        json=payload,
    )
    assert response.status_code == 201
    return dict(response.json())
