from __future__ import annotations

import asyncio
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
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
from app.modules.recurring.schedule import (
    calculate_next_run_after,
    recurring_period_key,
)


@dataclass(frozen=True)
class RecurringApiContext:
    client: TestClient
    database_url: str


def build_alembic_config(database_url: str) -> Config:
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def recurring_test_app(database_url: str) -> FastAPI:
    return create_app(
        Settings(
            app_name="PFM Test API",
            app_env="test",
            debug=False,
            cors_origins=["http://testserver"],
            database_url=database_url,
            access_token_secret_key="recurring-test-secret-with-at-least-32-bytes",
        ),
    )


@pytest.fixture
def recurring_context(disposable_postgres_url: str) -> Iterator[RecurringApiContext]:
    command.upgrade(build_alembic_config(disposable_postgres_url), "head")
    engine = build_async_engine(disposable_postgres_url)
    session_factory = build_session_factory(engine)
    app = recurring_test_app(disposable_postgres_url)

    async def test_session() -> object:
        async for session in get_session_from_factory(session_factory):
            yield session

    app.dependency_overrides[get_session] = test_session

    try:
        with TestClient(app) as client:
            yield RecurringApiContext(
                client=client,
                database_url=disposable_postgres_url,
            )
    finally:
        asyncio.run(engine.dispose())


def test_recurring_rule_crud_pause_resume_archive(
    recurring_context: RecurringApiContext,
) -> None:
    context = recurring_context
    headers = auth_headers(context, "recurring-crud@example.com")
    account = create_account(context, headers, "Recurring Checking", "bank", "0")
    expense_category = create_category(context, headers, "Bills", "expense", "bill")
    income_category = create_category(
        context, headers, "Paycheck", "income", "briefcase"
    )

    expense_rule = create_recurring_rule(
        context,
        headers,
        account_id=account["id"],
        category_id=expense_category["id"],
        transaction_type="expense",
        amount="35.2500",
        frequency="monthly",
        interval_count=1,
        timezone="America/New_York",
        start_at="2030-01-31T09:00:00-05:00",
        description="  Internet bill  ",
    )
    assert expense_rule["transaction_type"] == "expense"
    assert Decimal(expense_rule["amount"]) == Decimal("35.2500")
    assert expense_rule["currency"] == "USD"
    assert expense_rule["description"] == "Internet bill"
    assert expense_rule["start_at"] == "2030-01-31T14:00:00Z"
    assert expense_rule["next_run_at"] == "2030-01-31T14:00:00Z"
    assert expense_rule["status"] == "active"
    assert expense_rule["last_paid_period"] is None

    income_rule = create_recurring_rule(
        context,
        headers,
        account_id=account["id"],
        category_id=income_category["id"],
        transaction_type="income",
        amount="1000.0000",
        frequency="weekly",
        interval_count=2,
        timezone="UTC",
        start_at="2030-02-01T00:00:00+00:00",
    )

    detail_response = context.client.get(
        f"/api/v1/recurring-rules/{expense_rule['id']}",
        headers=headers,
    )
    assert detail_response.status_code == 200
    assert detail_response.json()["id"] == expense_rule["id"]

    list_response = context.client.get(
        "/api/v1/recurring-rules",
        headers=headers,
        params={"limit": 1},
    )
    assert list_response.status_code == 200
    first_page = list_response.json()
    assert first_page["has_more"] is True
    assert first_page["next_cursor"] is not None

    second_page_response = context.client.get(
        "/api/v1/recurring-rules",
        headers=headers,
        params={"limit": 1, "cursor": first_page["next_cursor"]},
    )
    assert second_page_response.status_code == 200
    assert len(second_page_response.json()["items"]) == 1

    due_response = context.client.get(
        "/api/v1/recurring-rules/due-expenses",
        headers=headers,
    )
    assert due_response.status_code == 200
    assert isinstance(due_response.json()["items"], list)

    update_response = context.client.patch(
        f"/api/v1/recurring-rules/{expense_rule['id']}",
        headers=headers,
        json={
            "amount": "40.0000",
            "frequency": "yearly",
            "interval_count": 1,
            "start_at": "2030-03-01T12:00:00+00:00",
            "description": "Annual plan",
        },
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert Decimal(updated["amount"]) == Decimal("40.0000")
    assert updated["frequency"] == "yearly"
    assert updated["next_run_at"] == "2030-03-01T12:00:00Z"

    pause_response = context.client.post(
        f"/api/v1/recurring-rules/{expense_rule['id']}/pause",
        headers=headers,
    )
    assert pause_response.status_code == 200
    paused = pause_response.json()
    assert paused["status"] == "paused"
    assert paused["paused_at"] is not None

    paused_list_response = context.client.get(
        "/api/v1/recurring-rules",
        headers=headers,
        params={"status": "paused"},
    )
    assert paused_list_response.status_code == 200
    assert [item["id"] for item in paused_list_response.json()["items"]] == [
        expense_rule["id"]
    ]

    resume_response = context.client.post(
        f"/api/v1/recurring-rules/{expense_rule['id']}/resume",
        headers=headers,
    )
    assert resume_response.status_code == 200
    resumed = resume_response.json()
    assert resumed["status"] == "active"
    assert resumed["paused_at"] is None

    archive_response = context.client.delete(
        f"/api/v1/recurring-rules/{expense_rule['id']}",
        headers=headers,
    )
    assert archive_response.status_code == 200
    archived = archive_response.json()
    assert archived["status"] == "archived"
    assert archived["archived_at"] is not None

    active_list_response = context.client.get(
        "/api/v1/recurring-rules", headers=headers
    )
    assert active_list_response.status_code == 200
    active_ids = {item["id"] for item in active_list_response.json()["items"]}
    assert expense_rule["id"] not in active_ids
    assert income_rule["id"] in active_ids

    archived_list_response = context.client.get(
        "/api/v1/recurring-rules",
        headers=headers,
        params={"status": "archived"},
    )
    assert archived_list_response.status_code == 200
    assert [item["id"] for item in archived_list_response.json()["items"]] == [
        expense_rule["id"]
    ]

    assert (
        context.client.patch(
            f"/api/v1/recurring-rules/{expense_rule['id']}",
            headers=headers,
            json={"amount": "50.0000"},
        ).status_code
        == 409
    )


def test_paid_recurring_expense_creates_one_selected_account_transaction(
    recurring_context: RecurringApiContext,
) -> None:
    context = recurring_context
    headers = auth_headers(context, "recurring-paid@example.com")
    selected_account = create_account(
        context,
        headers,
        "Bills Account",
        "bank",
        "100.0000",
    )
    other_account = create_account(
        context,
        headers,
        "Other Account",
        "cash",
        "250.0000",
    )
    expense_category = create_category(
        context,
        headers,
        "Monthly Bills",
        "expense",
        "bill",
    )
    income_category = create_category(
        context,
        headers,
        "Monthly Income",
        "income",
        "briefcase",
    )
    clicked_at = datetime.now(UTC).replace(microsecond=123000)
    month_start = clicked_at.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    current_period = recurring_period_key(clicked_at, timezone="UTC")
    expense_rule = create_recurring_rule(
        context,
        headers,
        account_id=selected_account["id"],
        category_id=expense_category["id"],
        transaction_type="expense",
        amount="25.0000",
        frequency="monthly",
        interval_count=1,
        timezone="UTC",
        start_at=month_start.isoformat(),
        description="Mobile bill",
    )

    paid_payload = {"paid_at": clicked_at.isoformat()}
    paid_response = context.client.post(
        f"/api/v1/recurring-rules/{expense_rule['id']}/paid",
        headers=headers,
        json=paid_payload,
    )
    assert paid_response.status_code == 200
    paid = paid_response.json()
    transaction = paid["transaction"]
    assert transaction["type"] == "expense"
    assert transaction["account_id"] == selected_account["id"]
    assert transaction["category_id"] == expense_category["id"]
    assert transaction["description"] == "Mobile bill"
    assert Decimal(transaction["amount"]) == Decimal("25.0000")
    assert transaction["currency"] == selected_account["currency"]
    assert datetime.fromisoformat(transaction["transaction_at"]) == clicked_at
    assert paid["rule"]["last_paid_period"] == current_period
    assert paid["rule"]["status"] == "active"

    transactions_response = context.client.get(
        "/api/v1/transactions",
        headers=headers,
        params={"limit": 100},
    )
    assert transactions_response.status_code == 200
    transactions = transactions_response.json()["items"]
    assert [item["id"] for item in transactions] == [transaction["id"]]

    accounts_response = context.client.get(
        "/api/v1/accounts",
        headers=headers,
        params={"limit": 100},
    )
    assert accounts_response.status_code == 200
    accounts = {item["id"]: item for item in accounts_response.json()["items"]}
    assert Decimal(accounts[selected_account["id"]]["current_balance"]) == Decimal(
        "75.0000"
    )
    assert Decimal(accounts[other_account["id"]]["current_balance"]) == Decimal(
        "250.0000"
    )

    due_response = context.client.get(
        "/api/v1/recurring-rules/due-expenses",
        headers=headers,
    )
    assert due_response.status_code == 200
    assert due_response.json()["items"] == []

    replay_response = context.client.post(
        f"/api/v1/recurring-rules/{expense_rule['id']}/paid",
        headers=headers,
        json=paid_payload,
    )
    assert replay_response.status_code == 200
    assert replay_response.json()["transaction"]["id"] == transaction["id"]

    conflicting_replay_response = context.client.post(
        f"/api/v1/recurring-rules/{expense_rule['id']}/paid",
        headers=headers,
        json={"paid_at": (clicked_at + timedelta(seconds=1)).isoformat()},
    )
    assert conflicting_replay_response.status_code == 409
    transactions_after_replay = context.client.get(
        "/api/v1/transactions",
        headers=headers,
        params={"limit": 100},
    ).json()["items"]
    assert [item["id"] for item in transactions_after_replay] == [transaction["id"]]

    income_rule = create_recurring_rule(
        context,
        headers,
        account_id=selected_account["id"],
        category_id=income_category["id"],
        transaction_type="income",
        amount="500.0000",
        frequency="monthly",
        interval_count=1,
        timezone="UTC",
        start_at=month_start.isoformat(),
    )
    income_paid_response = context.client.post(
        f"/api/v1/recurring-rules/{income_rule['id']}/paid",
        headers=headers,
        json=paid_payload,
    )
    assert income_paid_response.status_code == 409
    assert (
        context.client.get(
            f"/api/v1/recurring-rules/{income_rule['id']}",
            headers=headers,
        ).json()["last_paid_period"]
        is None
    )


def test_delete_recurring_expense_archives_without_transaction_or_balance_change(
    recurring_context: RecurringApiContext,
) -> None:
    context = recurring_context
    headers = auth_headers(context, "recurring-delete@example.com")
    account = create_account(
        context,
        headers,
        "Delete Safety Account",
        "bank",
        "125.0000",
    )
    category = create_category(
        context,
        headers,
        "Delete Safety Bill",
        "expense",
        "bill",
    )
    current_at = datetime.now(UTC)
    month_start = current_at.replace(
        day=1,
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )
    rule = create_recurring_rule(
        context,
        headers,
        account_id=account["id"],
        category_id=category["id"],
        transaction_type="expense",
        amount="20.0000",
        frequency="monthly",
        interval_count=1,
        timezone="UTC",
        start_at=month_start.isoformat(),
        description="Delete without charge",
    )

    due_before_delete = context.client.get(
        "/api/v1/recurring-rules/due-expenses",
        headers=headers,
    )
    assert due_before_delete.status_code == 200
    assert [item["rule"]["id"] for item in due_before_delete.json()["items"]] == [
        rule["id"]
    ]

    delete_response = context.client.delete(
        f"/api/v1/recurring-rules/{rule['id']}",
        headers=headers,
    )
    assert delete_response.status_code == 200
    archived_rule = delete_response.json()
    assert archived_rule["status"] == "archived"
    assert archived_rule["archived_at"] is not None
    assert archived_rule["last_paid_period"] is None

    due_after_delete = context.client.get(
        "/api/v1/recurring-rules/due-expenses",
        headers=headers,
    )
    assert due_after_delete.status_code == 200
    assert due_after_delete.json()["items"] == []

    transactions_response = context.client.get(
        "/api/v1/transactions",
        headers=headers,
        params={"limit": 100},
    )
    assert transactions_response.status_code == 200
    assert transactions_response.json()["items"] == []

    accounts_response = context.client.get(
        "/api/v1/accounts",
        headers=headers,
        params={"limit": 100},
    )
    assert accounts_response.status_code == 200
    stored_account = next(
        item
        for item in accounts_response.json()["items"]
        if item["id"] == account["id"]
    )
    assert Decimal(stored_account["current_balance"]) == Decimal("125.0000")

    repeat_delete_response = context.client.delete(
        f"/api/v1/recurring-rules/{rule['id']}",
        headers=headers,
    )
    assert repeat_delete_response.status_code == 200
    assert repeat_delete_response.json()["archived_at"] == archived_rule["archived_at"]


def test_recurring_schedule_boundaries_month_end_and_timezone() -> None:
    start_at = datetime.fromisoformat("2026-01-31T09:00:00-05:00")
    february_run = calculate_next_run_after(
        start_at=start_at,
        frequency="monthly",
        interval_count=1,
        timezone="America/New_York",
        after_at=datetime.fromisoformat("2026-01-31T14:00:00+00:00"),
    )
    assert february_run.isoformat() == "2026-02-28T14:00:00+00:00"

    march_run = calculate_next_run_after(
        start_at=start_at,
        frequency="monthly",
        interval_count=1,
        timezone="America/New_York",
        after_at=february_run,
    )
    assert march_run.isoformat() == "2026-03-31T13:00:00+00:00"

    leap_run = calculate_next_run_after(
        start_at=datetime.fromisoformat("2024-02-29T10:00:00+00:00"),
        frequency="yearly",
        interval_count=1,
        timezone="UTC",
        after_at=datetime.fromisoformat("2024-02-29T10:00:00+00:00"),
    )
    assert leap_run.isoformat() == "2025-02-28T10:00:00+00:00"

    every_two_weeks = calculate_next_run_after(
        start_at=datetime.fromisoformat("2026-01-01T00:00:00+00:00"),
        frequency="weekly",
        interval_count=2,
        timezone="UTC",
        after_at=datetime.fromisoformat("2026-01-10T00:00:00+00:00"),
    )
    assert every_two_weeks.isoformat() == "2026-01-15T00:00:00+00:00"


def test_recurring_rule_validation_ownership_and_openapi(
    recurring_context: RecurringApiContext,
) -> None:
    context = recurring_context
    owner_headers = auth_headers(context, "recurring-owner@example.com")
    other_headers = auth_headers(context, "recurring-other@example.com")
    owner_account = create_account(context, owner_headers, "Owner Account", "bank", "0")
    other_account = create_account(context, other_headers, "Other Account", "bank", "0")
    expense_category = create_category(
        context, owner_headers, "Owner Rent", "expense", "home"
    )
    income_category = create_category(
        context, owner_headers, "Owner Salary", "income", "work"
    )
    other_category = create_category(
        context, other_headers, "Other Rent", "expense", "home"
    )

    rule = create_recurring_rule(
        context,
        owner_headers,
        account_id=owner_account["id"],
        category_id=expense_category["id"],
        transaction_type="expense",
        amount="75.0000",
        frequency="daily",
        interval_count=1,
        timezone="UTC",
        start_at="2030-01-01T00:00:00+00:00",
    )

    invalid_category_kind_response = context.client.post(
        "/api/v1/recurring-rules",
        headers=owner_headers,
        json=recurring_payload(
            account_id=owner_account["id"],
            category_id=income_category["id"],
            transaction_type="expense",
            start_at="2030-01-01T00:00:00+00:00",
        ),
    )
    assert invalid_category_kind_response.status_code == 422

    cross_user_account_response = context.client.post(
        "/api/v1/recurring-rules",
        headers=owner_headers,
        json=recurring_payload(
            account_id=other_account["id"],
            category_id=expense_category["id"],
            transaction_type="expense",
            start_at="2030-01-01T00:00:00+00:00",
        ),
    )
    assert cross_user_account_response.status_code == 422

    cross_user_category_response = context.client.post(
        "/api/v1/recurring-rules",
        headers=owner_headers,
        json=recurring_payload(
            account_id=owner_account["id"],
            category_id=other_category["id"],
            transaction_type="expense",
            start_at="2030-01-01T00:00:00+00:00",
        ),
    )
    assert cross_user_category_response.status_code == 422

    invalid_timezone_response = context.client.post(
        "/api/v1/recurring-rules",
        headers=owner_headers,
        json=recurring_payload(
            account_id=owner_account["id"],
            category_id=expense_category["id"],
            transaction_type="expense",
            timezone="No/Such_Zone",
            start_at="2030-01-01T00:00:00+00:00",
        ),
    )
    assert invalid_timezone_response.status_code == 422

    naive_start_response = context.client.post(
        "/api/v1/recurring-rules",
        headers=owner_headers,
        json=recurring_payload(
            account_id=owner_account["id"],
            category_id=expense_category["id"],
            transaction_type="expense",
            start_at="2030-01-01T00:00:00",
        ),
    )
    assert naive_start_response.status_code == 422

    reversed_bounds_response = context.client.post(
        "/api/v1/recurring-rules",
        headers=owner_headers,
        json=recurring_payload(
            account_id=owner_account["id"],
            category_id=expense_category["id"],
            transaction_type="expense",
            start_at="2030-02-01T00:00:00+00:00",
            end_at="2030-01-01T00:00:00+00:00",
        ),
    )
    assert reversed_bounds_response.status_code == 422

    archive_category_response = context.client.delete(
        f"/api/v1/categories/{expense_category['id']}",
        headers=owner_headers,
    )
    assert archive_category_response.status_code == 200

    archived_category_response = context.client.patch(
        f"/api/v1/recurring-rules/{rule['id']}",
        headers=owner_headers,
        json={"amount": "80.0000"},
    )
    assert archived_category_response.status_code == 422

    assert (
        context.client.get(
            f"/api/v1/recurring-rules/{rule['id']}",
            headers=other_headers,
        ).status_code
        == 404
    )
    assert (
        context.client.post(
            f"/api/v1/recurring-rules/{rule['id']}/pause",
            headers=other_headers,
        ).status_code
        == 404
    )
    invalid_cursor_response = context.client.get(
        "/api/v1/recurring-rules",
        headers=owner_headers,
        params={"cursor": "not-a-valid-cursor"},
    )
    assert invalid_cursor_response.status_code == 422

    openapi = context.client.get("/openapi.json").json()
    assert "/api/v1/recurring-rules" in openapi["paths"]
    assert "/api/v1/recurring-rules/due-expenses" in openapi["paths"]
    assert "/api/v1/recurring-rules/{rule_id}/paid" in openapi["paths"]
    assert "/api/v1/recurring-rules/{rule_id}" in openapi["paths"]
    assert "/api/v1/recurring-rules/{rule_id}/pause" in openapi["paths"]
    assert "/api/v1/recurring-rules/{rule_id}/resume" in openapi["paths"]
    assert openapi["paths"]["/api/v1/recurring-rules"]["post"]["security"] == [
        {"HTTPBearer": []}
    ]
    assert (
        openapi["paths"]["/api/v1/recurring-rules"]["get"]["responses"]["200"][
            "content"
        ]["application/json"]["schema"]["$ref"]
        == "#/components/schemas/RecurringRuleListResponse"
    )


def auth_headers(context: RecurringApiContext, email: str) -> dict[str, str]:
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
    context: RecurringApiContext,
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
    context: RecurringApiContext,
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


def create_recurring_rule(
    context: RecurringApiContext,
    headers: dict[str, str],
    *,
    account_id: object,
    category_id: object,
    transaction_type: str,
    amount: str,
    frequency: str,
    interval_count: int,
    timezone: str,
    start_at: str,
    end_at: str | None = None,
    description: str | None = None,
) -> dict[str, object]:
    response = context.client.post(
        "/api/v1/recurring-rules",
        headers=headers,
        json=recurring_payload(
            account_id=account_id,
            category_id=category_id,
            transaction_type=transaction_type,
            amount=amount,
            frequency=frequency,
            interval_count=interval_count,
            timezone=timezone,
            start_at=start_at,
            end_at=end_at,
            description=description,
        ),
    )
    assert response.status_code == 201
    return dict(response.json())


def recurring_payload(
    *,
    account_id: object,
    category_id: object,
    transaction_type: str,
    amount: str = "10.0000",
    frequency: str = "monthly",
    interval_count: int = 1,
    timezone: str = "UTC",
    start_at: str,
    end_at: str | None = None,
    description: str | None = None,
) -> dict[str, object]:
    payload: dict[str, object] = {
        "account_id": account_id,
        "category_id": category_id,
        "transaction_type": transaction_type,
        "amount": amount,
        "frequency": frequency,
        "interval_count": interval_count,
        "timezone": timezone,
        "start_at": start_at,
    }
    if end_at is not None:
        payload["end_at"] = end_at
    if description is not None:
        payload["description"] = description
    return payload
