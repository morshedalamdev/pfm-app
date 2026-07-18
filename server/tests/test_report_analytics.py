from __future__ import annotations

import asyncio
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import date, timedelta
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
class ReportAnalyticsContext:
    client: TestClient
    database_url: str


def build_alembic_config(database_url: str) -> Config:
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def report_test_app(database_url: str) -> FastAPI:
    return create_app(
        Settings(
            app_name="PFM Test API",
            app_env="test",
            debug=False,
            cors_origins=["http://testserver"],
            database_url=database_url,
            access_token_secret_key="report-test-secret-with-at-least-32-bytes",
        ),
    )


@pytest.fixture
def report_context(
    disposable_postgres_url: str,
) -> Iterator[ReportAnalyticsContext]:
    command.upgrade(build_alembic_config(disposable_postgres_url), "head")
    engine = build_async_engine(disposable_postgres_url)
    session_factory = build_session_factory(engine)
    app = report_test_app(disposable_postgres_url)

    async def test_session() -> object:
        async for session in get_session_from_factory(session_factory):
            yield session

    app.dependency_overrides[get_session] = test_session

    try:
        with TestClient(app) as client:
            yield ReportAnalyticsContext(
                client=client,
                database_url=disposable_postgres_url,
            )
    finally:
        asyncio.run(engine.dispose())


def test_analytics_reports_return_deterministic_empty_shapes(
    report_context: ReportAnalyticsContext,
) -> None:
    headers = auth_headers(report_context, "empty-analytics@example.com")

    monthly_response = report_context.client.get(
        "/api/v1/reports/monthly-summary",
        headers=headers,
        params={"month": "2026-01"},
    )
    cash_flow_response = report_context.client.get(
        "/api/v1/reports/cash-flow",
        headers=headers,
        params={
            "date_from": "2026-01-01T00:00:00+00:00",
            "date_to": "2026-01-04T00:00:00+00:00",
            "interval": "day",
        },
    )
    spending_response = report_context.client.get(
        "/api/v1/reports/spending-by-category",
        headers=headers,
        params={
            "date_from": "2026-01-01T00:00:00+00:00",
            "date_to": "2026-02-01T00:00:00+00:00",
        },
    )

    assert monthly_response.status_code == 200
    monthly_payload = monthly_response.json()
    assert monthly_payload["range"] == {
        "start_at": "2026-01-01T00:00:00Z",
        "end_at": "2026-02-01T00:00:00Z",
        "timezone": "UTC",
    }
    assert Decimal(monthly_payload["savings_amount"]) == Decimal("0.0000")
    assert Decimal(monthly_payload["income_amount"]) == Decimal("0.0000")
    assert Decimal(monthly_payload["expense_amount"]) == Decimal("0.0000")
    assert monthly_payload["active_savings_goal_count"] == 0
    assert monthly_payload["budget_used_percent"] is None
    assert monthly_payload["top_expenses"] == []
    assert monthly_payload["trends"]["most_expensive_day"] is None

    assert cash_flow_response.status_code == 200
    cash_flow_payload = cash_flow_response.json()
    assert [bucket["label"] for bucket in cash_flow_payload["buckets"]] == [
        "Jan 1",
        "Jan 2",
        "Jan 3",
    ]
    assert all(
        Decimal(bucket["income_amount"]) == Decimal("0.0000")
        and Decimal(bucket["expense_amount"]) == Decimal("0.0000")
        and Decimal(bucket["net_flow_amount"]) == Decimal("0.0000")
        for bucket in cash_flow_payload["buckets"]
    )

    assert spending_response.status_code == 200
    spending_payload = spending_response.json()
    assert Decimal(spending_payload["total_amount"]) == Decimal("0.0000")
    assert spending_payload["items"] == []

    unauthorized_response = report_context.client.get(
        "/api/v1/reports/cash-flow",
        params={
            "date_from": "2026-01-01T00:00:00+00:00",
            "date_to": "2026-01-04T00:00:00+00:00",
            "interval": "day",
        },
    )
    assert unauthorized_response.status_code == 401


def test_analytics_reports_aggregate_source_records_and_isolate_users(
    report_context: ReportAnalyticsContext,
) -> None:
    context = report_context
    headers = auth_headers(context, "analytics-owner@example.com")
    other_headers = auth_headers(context, "analytics-other@example.com")
    account = create_account(context, headers, "Analytics Checking", "bank", "500")
    other_account = create_account(
        context, other_headers, "Other Checking", "bank", "1000"
    )
    food = create_category(context, headers, "Food", "expense", "utensils")
    rent = create_category(context, headers, "Rent", "expense", "home")
    salary = create_category(context, headers, "Salary", "income", "briefcase")
    other_food = create_category(
        context, other_headers, "Other Food", "expense", "food"
    )

    create_budget(
        context,
        headers,
        category_id=None,
        period_start="2026-01-01",
        period_end="2026-02-01",
        limit_amount="500.0000",
    )
    create_budget(
        context,
        headers,
        category_id=food["id"],
        period_start="2026-01-01",
        period_end="2026-02-01",
        limit_amount="100.0000",
    )
    goal = create_savings_goal(
        context,
        headers,
        name="Vacation",
        target_amount="1000.0000",
        target_date=(date.today() + timedelta(days=90)).isoformat(),
    )
    create_contribution(
        context,
        headers,
        goal["id"],
        amount="50.0000",
        contributed_at="2025-12-10T00:00:00+00:00",
    )
    create_contribution(
        context,
        headers,
        goal["id"],
        amount="150.0000",
        contributed_at="2026-01-10T00:00:00+00:00",
    )

    create_transaction(
        context,
        headers,
        account["id"],
        food["id"],
        "expense",
        "30.0000",
        "2026-01-01T00:00:00+00:00",
    )
    create_transaction(
        context,
        headers,
        account["id"],
        salary["id"],
        "income",
        "1000.0000",
        "2026-01-02T00:00:00+00:00",
    )
    create_transaction(
        context,
        headers,
        account["id"],
        food["id"],
        "expense",
        "20.1234",
        "2026-01-15T12:00:00+00:00",
    )
    create_transaction(
        context,
        headers,
        account["id"],
        rent["id"],
        "expense",
        "70.0000",
        "2026-01-31T23:59:59+00:00",
    )
    create_transaction(
        context,
        headers,
        account["id"],
        food["id"],
        "expense",
        "999.0000",
        "2026-02-01T00:00:00+00:00",
    )
    voided = create_transaction(
        context,
        headers,
        account["id"],
        food["id"],
        "expense",
        "200.0000",
        "2026-01-20T00:00:00+00:00",
    )
    assert (
        context.client.delete(
            f"/api/v1/transactions/{voided['id']}",
            headers=headers,
        ).status_code
        == 200
    )
    create_transaction(
        context,
        other_headers,
        other_account["id"],
        other_food["id"],
        "expense",
        "777.0000",
        "2026-01-01T00:00:00+00:00",
    )

    monthly_response = context.client.get(
        "/api/v1/reports/monthly-summary",
        headers=headers,
        params={"month": "2026-01"},
    )
    cash_flow_response = context.client.get(
        "/api/v1/reports/cash-flow",
        headers=headers,
        params={
            "date_from": "2026-01-01T06:00:00+06:00",
            "date_to": "2026-01-04T00:00:00+00:00",
            "interval": "day",
        },
    )
    spending_response = context.client.get(
        "/api/v1/reports/spending-by-category",
        headers=headers,
        params={
            "date_from": "2026-01-01T00:00:00+00:00",
            "date_to": "2026-02-01T00:00:00+00:00",
        },
    )

    assert monthly_response.status_code == 200
    monthly = monthly_response.json()
    assert Decimal(monthly["savings_amount"]) == Decimal("150.0000")
    assert Decimal(monthly["savings_month_over_month_percent"]) == Decimal("200")
    assert Decimal(monthly["income_amount"]) == Decimal("1000.0000")
    assert Decimal(monthly["expense_amount"]) == Decimal("120.1234")
    assert Decimal(monthly["net_flow_amount"]) == Decimal("879.8766")
    assert monthly["active_savings_goal_count"] == 1
    assert Decimal(monthly["budget_used_percent"]) == Decimal("24.0247")
    assert monthly["trends"]["most_expensive_day"] == {
        "date": "2026-01-31",
        "amount": "70.0000",
    }
    assert Decimal(monthly["trends"]["average_daily_spending"]) == Decimal("3.8749")
    assert [item["category_name"] for item in monthly["top_expenses"]] == [
        "Rent",
        "Food",
    ]
    food_expense = monthly["top_expenses"][1]
    assert Decimal(food_expense["amount"]) == Decimal("50.1234")
    assert food_expense["transaction_count"] == 2
    assert Decimal(food_expense["budget_limit_amount"]) == Decimal("100.0000")
    assert Decimal(food_expense["budget_percent_used"]) == Decimal("50.1234")

    assert cash_flow_response.status_code == 200
    cash_flow = cash_flow_response.json()
    assert cash_flow["range"]["start_at"] == "2026-01-01T00:00:00Z"
    assert [bucket["label"] for bucket in cash_flow["buckets"]] == [
        "Jan 1",
        "Jan 2",
        "Jan 3",
    ]
    assert Decimal(cash_flow["buckets"][0]["expense_amount"]) == Decimal("30.0000")
    assert Decimal(cash_flow["buckets"][1]["income_amount"]) == Decimal("1000.0000")
    assert Decimal(cash_flow["buckets"][1]["net_flow_amount"]) == Decimal("1000.0000")

    assert spending_response.status_code == 200
    spending = spending_response.json()
    assert Decimal(spending["total_amount"]) == Decimal("120.1234")
    assert [item["category_name"] for item in spending["items"]] == ["Rent", "Food"]
    assert Decimal(spending["items"][0]["amount"]) == Decimal("70.0000")
    assert Decimal(spending["items"][1]["amount"]) == Decimal("50.1234")
    assert sum(Decimal(item["percent"]) for item in spending["items"]) == Decimal(
        "100.0000"
    )


def test_analytics_reports_use_profile_currency_with_browser_datetime_shape(
    report_context: ReportAnalyticsContext,
) -> None:
    context = report_context
    headers = auth_headers(context, "analytics-currency@example.com")
    currency_response = context.client.patch(
        "/api/v1/users/me",
        headers=headers,
        json={"base_currency": "bdt"},
    )
    assert currency_response.status_code == 200

    account = create_account(context, headers, "BDT Checking", "bank", "0", "BDT")
    groceries = create_category(context, headers, "Groceries", "expense", "cart")
    salary = create_category(context, headers, "Salary", "income", "briefcase")

    create_budget(
        context,
        headers,
        category_id=groceries["id"],
        period_start="2026-07-01",
        period_end="2026-08-01",
        limit_amount="500.0000",
        currency="BDT",
    )
    goal_response = context.client.post(
        "/api/v1/savings-goals",
        headers=headers,
        json={
            "currency": "BDT",
            "monthly_target_amount": "200.0000",
            "name": "Emergency Fund",
            "note": "E2E goal",
            "target_amount": "1000.0000",
            "target_date": None,
        },
    )
    assert goal_response.status_code == 201
    contribution_response = context.client.post(
        f"/api/v1/savings-goals/{goal_response.json()['id']}/contributions",
        headers=headers,
        json={
            "amount": "150.0000",
            "contributed_at": "2026-07-03T00:00:00+00:00",
            "note": "E2E contribution",
        },
    )
    assert contribution_response.status_code == 201
    create_transaction(
        context,
        headers,
        account["id"],
        salary["id"],
        "income",
        "1200.0000",
        "2026-07-03T00:00:00+00:00",
    )
    create_transaction(
        context,
        headers,
        account["id"],
        groceries["id"],
        "expense",
        "125.5000",
        "2026-07-03T00:00:00+00:00",
    )

    monthly_response = context.client.get(
        "/api/v1/reports/monthly-summary",
        headers=headers,
        params={"month": "2026-07"},
    )
    cash_flow_response = context.client.get(
        "/api/v1/reports/cash-flow",
        headers=headers,
        params={
            "date_from": "2026-07-01T00:00:00.000Z",
            "date_to": "2026-08-01T00:00:00.000Z",
            "interval": "day",
        },
    )
    spending_response = context.client.get(
        "/api/v1/reports/spending-by-category",
        headers=headers,
        params={
            "date_from": "2026-07-01T00:00:00.000Z",
            "date_to": "2026-08-01T00:00:00.000Z",
        },
    )

    assert monthly_response.status_code == 200
    assert cash_flow_response.status_code == 200
    assert spending_response.status_code == 200
    assert monthly_response.json()["currency"] == "BDT"
    assert cash_flow_response.json()["currency"] == "BDT"
    assert spending_response.json()["currency"] == "BDT"


def test_cash_flow_week_and_month_groupings_respect_boundaries(
    report_context: ReportAnalyticsContext,
) -> None:
    context = report_context
    headers = auth_headers(context, "analytics-buckets@example.com")
    account = create_account(context, headers, "Bucket Checking", "bank", "0")
    income_category = create_category(context, headers, "Income", "income", "briefcase")
    expense_category = create_category(context, headers, "Expense", "expense", "cart")

    create_transaction(
        context,
        headers,
        account["id"],
        income_category["id"],
        "income",
        "10.0000",
        "2026-01-04T00:00:00+00:00",
    )
    create_transaction(
        context,
        headers,
        account["id"],
        expense_category["id"],
        "expense",
        "4.0000",
        "2026-02-01T00:00:00+00:00",
    )

    weekly_response = context.client.get(
        "/api/v1/reports/cash-flow",
        headers=headers,
        params={
            "date_from": "2026-01-01T00:00:00+00:00",
            "date_to": "2026-01-15T00:00:00+00:00",
            "interval": "week",
        },
    )
    monthly_response = context.client.get(
        "/api/v1/reports/cash-flow",
        headers=headers,
        params={
            "date_from": "2026-01-01T00:00:00+00:00",
            "date_to": "2026-03-01T00:00:00+00:00",
            "interval": "month",
        },
    )

    assert weekly_response.status_code == 200
    weekly = weekly_response.json()
    assert [bucket["label"] for bucket in weekly["buckets"]] == [
        "Week of Jan 1",
        "Week of Jan 4",
        "Week of Jan 11",
    ]
    assert Decimal(weekly["buckets"][0]["income_amount"]) == Decimal("0.0000")
    assert Decimal(weekly["buckets"][1]["income_amount"]) == Decimal("10.0000")

    assert monthly_response.status_code == 200
    monthly = monthly_response.json()
    assert [bucket["label"] for bucket in monthly["buckets"]] == [
        "Jan 2026",
        "Feb 2026",
    ]
    assert Decimal(monthly["buckets"][0]["income_amount"]) == Decimal("10.0000")
    assert Decimal(monthly["buckets"][1]["expense_amount"]) == Decimal("4.0000")


def test_analytics_reports_cover_multiple_accounts_categories_and_periods(
    report_context: ReportAnalyticsContext,
) -> None:
    context = report_context
    headers = auth_headers(context, "analytics-matrix-owner@example.com")
    other_headers = auth_headers(context, "analytics-matrix-other@example.com")

    checking = create_account(context, headers, "Checking", "bank", "1000")
    card = create_account(context, headers, "Rewards Card", "card", "50")
    other_account = create_account(
        context, other_headers, "Other Account", "bank", "1000"
    )

    groceries = create_category(context, headers, "Groceries", "expense", "cart")
    utilities = create_category(context, headers, "Utilities", "expense", "bolt")
    travel = create_category(context, headers, "Travel", "expense", "plane")
    salary = create_category(context, headers, "Salary", "income", "briefcase")
    other_category = create_category(
        context,
        other_headers,
        "Other Groceries",
        "expense",
        "cart",
    )

    create_budget(
        context,
        headers,
        category_id=None,
        period_start="2026-02-01",
        period_end="2026-03-01",
        limit_amount="100.0000",
    )
    create_budget(
        context,
        headers,
        category_id=groceries["id"],
        period_start="2026-02-01",
        period_end="2026-03-01",
        limit_amount="20.0000",
    )

    goal = create_savings_goal(
        context,
        headers,
        name="Emergency Fund",
        target_amount="1000.0000",
        target_date=(date.today() + timedelta(days=90)).isoformat(),
    )
    create_contribution(
        context,
        headers,
        goal["id"],
        amount="50.0000",
        contributed_at="2026-01-15T00:00:00+00:00",
    )
    create_contribution(
        context,
        headers,
        goal["id"],
        amount="25.0000",
        contributed_at="2026-02-15T00:00:00+00:00",
    )

    create_transaction(
        context,
        headers,
        checking["id"],
        groceries["id"],
        "expense",
        "99.0000",
        "2026-01-31T23:59:59+00:00",
    )
    create_transaction(
        context,
        headers,
        checking["id"],
        salary["id"],
        "income",
        "200.0000",
        "2026-02-01T09:00:00+00:00",
    )
    create_transaction(
        context,
        headers,
        checking["id"],
        groceries["id"],
        "expense",
        "30.0000",
        "2026-02-02T08:00:00+00:00",
    )
    create_transaction(
        context,
        headers,
        card["id"],
        utilities["id"],
        "expense",
        "25.0000",
        "2026-02-02T20:00:00+00:00",
    )
    create_transaction(
        context,
        headers,
        card["id"],
        travel["id"],
        "expense",
        "10.0000",
        "2026-02-03T10:00:00+00:00",
    )
    create_transaction(
        context,
        headers,
        card["id"],
        groceries["id"],
        "expense",
        "5.0000",
        "2026-02-28T23:59:59+00:00",
    )
    create_transaction(
        context,
        headers,
        checking["id"],
        groceries["id"],
        "expense",
        "999.0000",
        "2026-03-01T00:00:00+00:00",
    )
    create_transaction(
        context,
        other_headers,
        other_account["id"],
        other_category["id"],
        "expense",
        "777.0000",
        "2026-02-02T00:00:00+00:00",
    )

    monthly_response = context.client.get(
        "/api/v1/reports/monthly-summary",
        headers=headers,
        params={"month": "2026-02"},
    )
    cash_flow_response = context.client.get(
        "/api/v1/reports/cash-flow",
        headers=headers,
        params={
            "date_from": "2026-02-01T00:00:00+00:00",
            "date_to": "2026-03-01T00:00:00+00:00",
            "interval": "day",
        },
    )
    spending_response = context.client.get(
        "/api/v1/reports/spending-by-category",
        headers=headers,
        params={
            "date_from": "2026-02-01T00:00:00+00:00",
            "date_to": "2026-03-01T00:00:00+00:00",
        },
    )

    assert monthly_response.status_code == 200
    monthly = monthly_response.json()
    assert monthly["month"] == "2026-02"
    assert Decimal(monthly["savings_amount"]) == Decimal("25.0000")
    assert Decimal(monthly["savings_month_over_month_percent"]) == Decimal("-50.0000")
    assert Decimal(monthly["income_amount"]) == Decimal("200.0000")
    assert Decimal(monthly["expense_amount"]) == Decimal("70.0000")
    assert Decimal(monthly["net_flow_amount"]) == Decimal("130.0000")
    assert Decimal(monthly["budget_used_percent"]) == Decimal("70.0000")
    assert monthly["active_savings_goal_count"] == 1
    assert Decimal(monthly["trends"]["average_daily_spending"]) == Decimal("2.5000")
    assert monthly["trends"]["most_expensive_day"] == {
        "date": "2026-02-02",
        "amount": "55.0000",
    }
    assert [item["category_name"] for item in monthly["top_expenses"]] == [
        "Groceries",
        "Utilities",
        "Travel",
    ]
    assert Decimal(monthly["top_expenses"][0]["amount"]) == Decimal("35.0000")
    assert monthly["top_expenses"][0]["transaction_count"] == 2
    assert Decimal(monthly["top_expenses"][0]["budget_limit_amount"]) == Decimal(
        "20.0000"
    )
    assert Decimal(monthly["top_expenses"][0]["budget_percent_used"]) == Decimal(
        "175.0000"
    )

    assert cash_flow_response.status_code == 200
    cash_flow = cash_flow_response.json()
    assert len(cash_flow["buckets"]) == 28
    assert Decimal(cash_flow["buckets"][0]["income_amount"]) == Decimal("200.0000")
    assert Decimal(cash_flow["buckets"][1]["expense_amount"]) == Decimal("55.0000")
    assert Decimal(cash_flow["buckets"][2]["expense_amount"]) == Decimal("10.0000")
    assert Decimal(cash_flow["buckets"][27]["expense_amount"]) == Decimal("5.0000")
    assert all(
        set(bucket)
        == {
            "label",
            "start_at",
            "end_at",
            "income_amount",
            "expense_amount",
            "net_flow_amount",
        }
        for bucket in cash_flow["buckets"]
    )

    assert spending_response.status_code == 200
    spending = spending_response.json()
    assert Decimal(spending["total_amount"]) == Decimal("70.0000")
    assert [item["category_name"] for item in spending["items"]] == [
        "Groceries",
        "Utilities",
        "Travel",
    ]
    assert [item["icon_key"] for item in spending["items"]] == [
        "cart",
        "bolt",
        "plane",
    ]
    assert [Decimal(item["amount"]) for item in spending["items"]] == [
        Decimal("35.0000"),
        Decimal("25.0000"),
        Decimal("10.0000"),
    ]
    assert [Decimal(item["percent"]) for item in spending["items"]] == [
        Decimal("50.0000"),
        Decimal("35.7143"),
        Decimal("14.2857"),
    ]


def auth_headers(context: ReportAnalyticsContext, email: str) -> dict[str, str]:
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
    context: ReportAnalyticsContext,
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
    context: ReportAnalyticsContext,
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
    context: ReportAnalyticsContext,
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
    context: ReportAnalyticsContext,
    headers: dict[str, str],
    *,
    category_id: object | None,
    period_start: str,
    period_end: str,
    limit_amount: str,
    currency: str = "USD",
) -> dict[str, object]:
    payload: dict[str, object] = {
        "period_type": "monthly",
        "period_start": period_start,
        "period_end": period_end,
        "limit_amount": limit_amount,
        "currency": currency,
    }
    if category_id is not None:
        payload["category_id"] = category_id
    response = context.client.post("/api/v1/budgets", headers=headers, json=payload)
    assert response.status_code == 201
    return dict(response.json())


def create_savings_goal(
    context: ReportAnalyticsContext,
    headers: dict[str, str],
    *,
    name: str,
    target_amount: str,
    target_date: str,
) -> dict[str, object]:
    response = context.client.post(
        "/api/v1/savings-goals",
        headers=headers,
        json={
            "name": name,
            "target_amount": target_amount,
            "monthly_target_amount": "0.0000",
            "target_date": target_date,
        },
    )
    assert response.status_code == 201
    return dict(response.json())


def create_contribution(
    context: ReportAnalyticsContext,
    headers: dict[str, str],
    goal_id: object,
    *,
    amount: str,
    contributed_at: str,
) -> dict[str, object]:
    response = context.client.post(
        f"/api/v1/savings-goals/{goal_id}/contributions",
        headers=headers,
        json={"amount": amount, "contributed_at": contributed_at},
    )
    assert response.status_code == 201
    return dict(response.json())
