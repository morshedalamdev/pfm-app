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
class ReportApiContext:
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
def report_context(disposable_postgres_url: str) -> Iterator[ReportApiContext]:
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
            yield ReportApiContext(
                client=client,
                database_url=disposable_postgres_url,
            )
    finally:
        asyncio.run(engine.dispose())


def test_dashboard_report_empty_week_is_deterministic(
    report_context: ReportApiContext,
) -> None:
    headers = auth_headers(report_context, "empty-dashboard@example.com")
    update_response = report_context.client.patch(
        "/api/v1/users/me",
        headers=headers,
        json={"base_currency": "bdt"},
    )
    assert update_response.status_code == 200

    response = report_context.client.get(
        "/api/v1/reports/dashboard",
        headers=headers,
        params={"period": "week", "type": "expense", "as_of": "2026-01-14"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["range"] == {
        "start_at": "2026-01-11T00:00:00Z",
        "end_at": "2026-01-18T00:00:00Z",
        "timezone": "UTC",
    }
    assert payload["currency"] == "BDT"
    assert Decimal(payload["available_balance"]) == Decimal("0.0000")
    assert Decimal(payload["income_amount"]) == Decimal("0.0000")
    assert Decimal(payload["expense_amount"]) == Decimal("0.0000")
    assert Decimal(payload["net_flow_amount"]) == Decimal("0.0000")
    assert [bucket["label"] for bucket in payload["buckets"]] == [
        "Sun",
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat",
    ]
    assert [bucket["is_current"] for bucket in payload["buckets"]].count(True) == 1
    assert all(
        Decimal(bucket["amount"]) == Decimal("0.0000") for bucket in payload["buckets"]
    )


def test_dashboard_report_aggregates_source_records_and_boundaries(
    report_context: ReportApiContext,
) -> None:
    context = report_context
    headers = auth_headers(context, "dashboard-owner@example.com")
    other_headers = auth_headers(context, "dashboard-other@example.com")

    checking = create_account(context, headers, "Checking", "bank", "100.0000")
    savings = create_account(context, headers, "Savings", "savings", "200.0000")
    archived = create_account(context, headers, "Closed Wallet", "cash", "999.0000")
    archive_response = context.client.delete(
        f"/api/v1/accounts/{archived['id']}",
        headers=headers,
    )
    assert archive_response.status_code == 200

    income_category = create_category(
        context,
        headers,
        "Salary",
        "income",
        "briefcase",
    )
    expense_category = create_category(
        context, headers, "Dining", "expense", "utensils"
    )
    other_account = create_account(context, other_headers, "Other", "bank", "500.0000")
    other_expense = create_category(
        context, other_headers, "Other Dining", "expense", "utensils"
    )

    create_transaction(
        context,
        headers,
        checking["id"],
        income_category["id"],
        "income",
        "500.0000",
        "2026-01-01T00:00:00+00:00",
    )
    create_transaction(
        context,
        headers,
        checking["id"],
        expense_category["id"],
        "expense",
        "120.2500",
        "2026-01-13T12:00:00+00:00",
    )
    create_transaction(
        context,
        headers,
        checking["id"],
        expense_category["id"],
        "expense",
        "10.0000",
        "2026-02-01T00:00:00+00:00",
    )
    voided_expense = create_transaction(
        context,
        headers,
        checking["id"],
        expense_category["id"],
        "expense",
        "999.0000",
        "2026-01-14T00:00:00+00:00",
    )
    delete_response = context.client.delete(
        f"/api/v1/transactions/{voided_expense['id']}",
        headers=headers,
    )
    assert delete_response.status_code == 200
    create_transfer(
        context,
        headers,
        checking["id"],
        savings["id"],
        "50.0000",
        "2026-01-15T00:00:00+00:00",
    )
    create_transaction(
        context,
        other_headers,
        other_account["id"],
        other_expense["id"],
        "expense",
        "777.0000",
        "2026-01-13T12:00:00+00:00",
    )

    response = context.client.get(
        "/api/v1/reports/dashboard",
        headers=headers,
        params={"period": "month", "type": "expense", "as_of": "2026-01-15"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["range"] == {
        "start_at": "2026-01-01T00:00:00Z",
        "end_at": "2026-02-01T00:00:00Z",
        "timezone": "UTC",
    }
    assert Decimal(payload["available_balance"]) == Decimal("669.7500")
    assert Decimal(payload["income_amount"]) == Decimal("500.0000")
    assert Decimal(payload["expense_amount"]) == Decimal("120.2500")
    assert Decimal(payload["net_flow_amount"]) == Decimal("379.7500")
    assert len(payload["buckets"]) == 31
    assert payload["buckets"][0]["label"] == "1"
    assert payload["buckets"][14]["is_current"] is True
    assert Decimal(payload["buckets"][12]["amount"]) == Decimal("120.2500")
    assert all(
        Decimal(bucket["amount"]) == Decimal("0.0000")
        for bucket in payload["buckets"]
        if bucket["label"] != "13"
    )


def test_dashboard_report_year_income_buckets_and_auth_contract(
    report_context: ReportApiContext,
) -> None:
    context = report_context
    headers = auth_headers(context, "dashboard-year@example.com")
    account = create_account(context, headers, "Checking", "bank", "0.0000")
    income_category = create_category(context, headers, "Salary", "income", "briefcase")

    create_transaction(
        context,
        headers,
        account["id"],
        income_category["id"],
        "income",
        "100.0000",
        "2026-01-31T23:59:59+00:00",
    )
    create_transaction(
        context,
        headers,
        account["id"],
        income_category["id"],
        "income",
        "300.0000",
        "2026-02-01T00:00:00+00:00",
    )

    response = context.client.get(
        "/api/v1/reports/dashboard",
        headers=headers,
        params={"period": "year", "type": "income", "as_of": "2026-02-15"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert [bucket["label"] for bucket in payload["buckets"]] == [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ]
    assert Decimal(payload["buckets"][0]["amount"]) == Decimal("100.0000")
    assert Decimal(payload["buckets"][1]["amount"]) == Decimal("300.0000")
    assert payload["buckets"][1]["is_current"] is True

    unauthorized_response = context.client.get(
        "/api/v1/reports/dashboard",
        params={"period": "week", "type": "expense", "as_of": "2026-01-14"},
    )
    assert unauthorized_response.status_code == 401


def test_dashboard_report_totals_include_transactions_and_exclude_loans_and_recurring(
    report_context: ReportApiContext,
) -> None:
    context = report_context
    headers = auth_headers(context, "dashboard-loan-exclusion@example.com")
    income_account = create_account(context, headers, "Checking", "bank", "0.0000")
    expense_account = create_account(context, headers, "Wallet", "wallet", "0.0000")
    income_category = create_category(context, headers, "Salary", "income", "briefcase")
    expense_category = create_category(
        context,
        headers,
        "Groceries",
        "expense",
        "shopping-cart",
    )
    person = create_loan_person(context, headers, "Loan Contact", "+8801712345678")

    create_transaction(
        context,
        headers,
        income_account["id"],
        income_category["id"],
        "income",
        "125.0000",
        "2026-01-10T10:00:00+00:00",
    )
    create_transaction(
        context,
        headers,
        expense_account["id"],
        expense_category["id"],
        "expense",
        "45.0000",
        "2026-01-11T10:00:00+00:00",
    )
    create_loan_record(
        context,
        headers,
        expense_account["id"],
        person["id"],
        "given",
        "700.0000",
        "2026-01-12T10:00:00+00:00",
    )
    create_loan_record(
        context,
        headers,
        income_account["id"],
        person["id"],
        "taken",
        "900.0000",
        "2026-01-13T10:00:00+00:00",
    )
    create_recurring_rule(
        context,
        headers,
        account_id=income_account["id"],
        category_id=income_category["id"],
        transaction_type="income",
        amount="5000.0000",
        start_at="2026-02-01T10:00:00+00:00",
    )
    create_recurring_rule(
        context,
        headers,
        account_id=expense_account["id"],
        category_id=expense_category["id"],
        transaction_type="expense",
        amount="4000.0000",
        start_at="2026-02-01T10:00:00+00:00",
    )

    response = context.client.get(
        "/api/v1/reports/dashboard",
        headers=headers,
        params={"period": "month", "type": "expense", "as_of": "2026-01-15"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert Decimal(payload["income_amount"]) == Decimal("125.0000")
    assert Decimal(payload["expense_amount"]) == Decimal("45.0000")
    assert Decimal(payload["net_flow_amount"]) == Decimal("80.0000")


def auth_headers(context: ReportApiContext, email: str) -> dict[str, str]:
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
    context: ReportApiContext,
    headers: dict[str, str],
    name: str,
    account_type: str,
    opening_balance: str,
) -> dict[str, object]:
    response = context.client.post(
        "/api/v1/accounts",
        headers=headers,
        json={
            "name": name,
            "type": account_type,
            "opening_balance": opening_balance,
        },
    )
    assert response.status_code == 201
    return dict(response.json())


def create_category(
    context: ReportApiContext,
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
    context: ReportApiContext,
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


def create_transfer(
    context: ReportApiContext,
    headers: dict[str, str],
    from_account_id: object,
    to_account_id: object,
    amount: str,
    transaction_at: str,
) -> dict[str, object]:
    response = context.client.post(
        "/api/v1/transactions/transfers",
        headers=headers,
        json={
            "from_account_id": from_account_id,
            "to_account_id": to_account_id,
            "amount": amount,
            "transaction_at": transaction_at,
        },
    )
    assert response.status_code == 201
    return dict(response.json())


def create_loan_person(
    context: ReportApiContext,
    headers: dict[str, str],
    name: str,
    phone_number: str,
) -> dict[str, object]:
    response = context.client.post(
        "/api/v1/loans/people",
        headers=headers,
        json={"name": name, "phone_number": phone_number},
    )
    assert response.status_code == 201
    return dict(response.json())


def create_loan_record(
    context: ReportApiContext,
    headers: dict[str, str],
    account_id: object,
    person_id: object,
    direction: str,
    principal_amount: str,
    issued_at: str,
) -> dict[str, object]:
    response = context.client.post(
        "/api/v1/loans/records",
        headers=headers,
        json={
            "account_id": account_id,
            "person_id": person_id,
            "direction": direction,
            "principal_amount": principal_amount,
            "issued_at": issued_at,
            "repay_date": "2026-02-15",
        },
    )
    assert response.status_code == 201
    return dict(response.json())


def create_recurring_rule(
    context: ReportApiContext,
    headers: dict[str, str],
    *,
    account_id: object,
    category_id: object,
    transaction_type: str,
    amount: str,
    start_at: str,
) -> dict[str, object]:
    response = context.client.post(
        "/api/v1/recurring-rules",
        headers=headers,
        json={
            "account_id": account_id,
            "category_id": category_id,
            "transaction_type": transaction_type,
            "amount": amount,
            "frequency": "monthly",
            "interval_count": 1,
            "timezone": "UTC",
            "start_at": start_at,
        },
    )
    assert response.status_code == 201
    return dict(response.json())
