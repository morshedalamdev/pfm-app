from __future__ import annotations

import asyncio
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import UTC, datetime
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
class FinanceApiContext:
    client: TestClient
    database_url: str


def build_alembic_config(database_url: str) -> Config:
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def finance_test_app(database_url: str) -> FastAPI:
    return create_app(
        Settings(
            app_name="PFM Test API",
            app_env="test",
            debug=False,
            cors_origins=["http://testserver"],
            database_url=database_url,
            access_token_secret_key="finance-test-secret-with-at-least-32-bytes",
        ),
    )


@pytest.fixture
def finance_context(disposable_postgres_url: str) -> Iterator[FinanceApiContext]:
    command.upgrade(build_alembic_config(disposable_postgres_url), "head")
    engine = build_async_engine(disposable_postgres_url)
    session_factory = build_session_factory(engine)
    app = finance_test_app(disposable_postgres_url)

    async def test_session() -> object:
        async for session in get_session_from_factory(session_factory):
            yield session

    app.dependency_overrides[get_session] = test_session

    try:
        with TestClient(app) as client:
            yield FinanceApiContext(
                client=client,
                database_url=disposable_postgres_url,
            )
    finally:
        asyncio.run(engine.dispose())


def test_default_dropdown_data_bootstraps_for_empty_user(
    finance_context: FinanceApiContext,
) -> None:
    context = finance_context
    headers = auth_headers(context, "dropdown-bootstrap@example.com")
    currency_response = context.client.patch(
        "/api/v1/users/me",
        headers=headers,
        json={"base_currency": "gbp"},
    )
    assert currency_response.status_code == 200

    accounts_response = context.client.get("/api/v1/accounts", headers=headers)
    expense_response = context.client.get(
        "/api/v1/categories?kind=expense",
        headers=headers,
    )
    income_response = context.client.get(
        "/api/v1/categories?kind=income",
        headers=headers,
    )

    assert accounts_response.status_code == 200
    account_items = accounts_response.json()["items"]
    assert [
        (item["name"], item["type"], item["currency"]) for item in account_items
    ] == [("Cash", "cash", "GBP")]
    assert account_items[0]["opening_balance"] == "0.0000"
    assert account_items[0]["current_balance"] == "0.0000"
    assert account_items[0]["is_default"] is True
    assert account_items[0]["is_disabled"] is False
    assert account_items[0]["disabled_at"] is None

    assert expense_response.status_code == 200
    expense_items = expense_response.json()["items"]
    assert {"Groceries", "Dining", "Transport", "Bills & Fees"}.issubset(
        {item["name"] for item in expense_items}
    )
    assert all(item["kind"] == "expense" for item in expense_items)
    assert all(item["is_default"] is True for item in expense_items)

    assert income_response.status_code == 200
    income_items = income_response.json()["items"]
    assert {"Salary", "Business", "Freelance"}.issubset(
        {item["name"] for item in income_items}
    )
    assert all(item["kind"] == "income" for item in income_items)
    assert all(item["is_default"] is True for item in income_items)


def test_account_crud_pagination_and_archive(
    finance_context: FinanceApiContext,
) -> None:
    context = finance_context
    headers = auth_headers(context, "accounts-owner@example.com")

    first = create_account(context, headers, "Main Wallet", "wallet", "100.25")
    second = create_account(context, headers, "Savings Vault", "savings", "5.50")
    third = create_account(context, headers, "Cash Pocket", "cash", "0")

    list_response = context.client.get(
        "/api/v1/accounts?limit=2",
        headers=headers,
    )
    assert list_response.status_code == 200
    list_body = list_response.json()
    assert len(list_body["items"]) == 2
    assert list_body["has_more"] is True
    assert list_body["next_cursor"]

    next_page_response = context.client.get(
        f"/api/v1/accounts?limit=2&cursor={list_body['next_cursor']}",
        headers=headers,
    )
    assert next_page_response.status_code == 200
    assert len(next_page_response.json()["items"]) == 1

    get_response = context.client.get(
        f"/api/v1/accounts/{first['id']}", headers=headers
    )
    assert get_response.status_code == 200
    assert get_response.json()["opening_balance"] == "100.2500"
    assert get_response.json()["current_balance"] == "100.2500"

    update_response = context.client.patch(
        f"/api/v1/accounts/{first['id']}",
        headers=headers,
        json={"name": "Primary Wallet", "currency": " usd "},
    )
    assert update_response.status_code == 200
    assert update_response.json()["name"] == "Primary Wallet"
    assert update_response.json()["currency"] == "USD"

    archive_response = context.client.delete(
        f"/api/v1/accounts/{second['id']}",
        headers=headers,
    )
    assert archive_response.status_code == 200
    assert archive_response.json()["is_archived"] is True
    assert archive_response.json()["archived_at"] is not None

    active_response = context.client.get("/api/v1/accounts?limit=10", headers=headers)
    assert active_response.status_code == 200
    active_ids = {item["id"] for item in active_response.json()["items"]}
    assert first["id"] in active_ids
    assert third["id"] in active_ids
    assert second["id"] not in active_ids

    archived_response = context.client.get(
        "/api/v1/accounts?include_archived=true&limit=10",
        headers=headers,
    )
    assert archived_response.status_code == 200
    archived_ids = {item["id"] for item in archived_response.json()["items"]}
    assert second["id"] in archived_ids


def test_account_validation_and_ownership(
    finance_context: FinanceApiContext,
) -> None:
    context = finance_context
    owner_headers = auth_headers(context, "account-owner-scope@example.com")
    other_headers = auth_headers(context, "account-other-scope@example.com")
    account = create_account(context, owner_headers, "Owned Bank", "bank", "20")

    invalid_money_response = context.client.post(
        "/api/v1/accounts",
        headers=owner_headers,
        json={"name": "Float Account", "type": "cash", "opening_balance": 1.2},
    )
    assert invalid_money_response.status_code == 422
    assert invalid_money_response.json()["error"]["code"] == "validation_error"

    invalid_currency_response = context.client.post(
        "/api/v1/accounts",
        headers=owner_headers,
        json={"name": "Bad Currency", "type": "cash", "currency": "US"},
    )
    assert invalid_currency_response.status_code == 422

    mobile_pay_response = context.client.post(
        "/api/v1/accounts",
        headers=owner_headers,
        json={"name": "Mobile Wallet", "type": "mobile_pay"},
    )
    assert mobile_pay_response.status_code == 201
    assert mobile_pay_response.json()["type"] == "mobile_pay"

    other_type_response = context.client.post(
        "/api/v1/accounts",
        headers=owner_headers,
        json={"name": "Other Account", "type": "other"},
    )
    assert other_type_response.status_code == 201
    assert other_type_response.json()["type"] == "other"

    missing_auth_response = context.client.get("/api/v1/accounts")
    assert missing_auth_response.status_code == 401

    assert (
        context.client.get(
            f"/api/v1/accounts/{account['id']}",
            headers=other_headers,
        ).status_code
        == 404
    )
    assert (
        context.client.patch(
            f"/api/v1/accounts/{account['id']}",
            headers=other_headers,
            json={"name": "Hijacked"},
        ).status_code
        == 404
    )
    assert (
        context.client.delete(
            f"/api/v1/accounts/{account['id']}",
            headers=other_headers,
        ).status_code
        == 404
    )


def test_account_duplicate_names_are_rejected(
    finance_context: FinanceApiContext,
) -> None:
    context = finance_context
    headers = auth_headers(context, "account-duplicates@example.com")
    first = create_account(context, headers, "Everyday Cash", "cash", "0")
    second = create_account(context, headers, "Card", "card", "0")

    duplicate_create_response = context.client.post(
        "/api/v1/accounts",
        headers=headers,
        json={"name": "Everyday Cash", "type": "bank"},
    )
    assert duplicate_create_response.status_code == 409
    assert duplicate_create_response.json()["error"]["message"] == (
        "Account already exists"
    )

    duplicate_update_response = context.client.patch(
        f"/api/v1/accounts/{second['id']}",
        headers=headers,
        json={"name": first["name"]},
    )
    assert duplicate_update_response.status_code == 409
    assert duplicate_update_response.json()["error"]["message"] == (
        "Account already exists"
    )


def test_used_accounts_cannot_be_removed(
    finance_context: FinanceApiContext,
) -> None:
    context = finance_context
    headers = auth_headers(context, "account-use-guard@example.com")
    transaction_account = create_account(context, headers, "Spending Cash", "cash", "0")
    recurring_account = create_account(context, headers, "Recurring Bank", "bank", "0")
    unused_account = create_account(context, headers, "Unused Wallet", "wallet", "0")
    expense_category = create_category(context, headers, "Food", "expense", "utensils")
    income_category = create_category(context, headers, "Salary", "income", "briefcase")
    now = datetime.now(UTC).isoformat()

    transaction_response = context.client.post(
        "/api/v1/transactions",
        headers={**headers, "Idempotency-Key": "account-use-transaction"},
        json={
            "account_id": transaction_account["id"],
            "amount": "10.00",
            "category_id": expense_category["id"],
            "transaction_at": now,
            "type": "expense",
        },
    )
    assert transaction_response.status_code == 201

    recurring_response = context.client.post(
        "/api/v1/recurring-rules",
        headers=headers,
        json={
            "account_id": recurring_account["id"],
            "amount": "100.00",
            "category_id": income_category["id"],
            "frequency": "monthly",
            "interval_count": 1,
            "start_at": now,
            "transaction_type": "income",
        },
    )
    assert recurring_response.status_code == 201

    for account in (transaction_account, recurring_account):
        delete_response = context.client.delete(
            f"/api/v1/accounts/{account['id']}",
            headers=headers,
        )
        assert delete_response.status_code == 409
        assert delete_response.json()["error"]["message"] == (
            "Account cannot be removed because it is already used."
        )

    unused_delete_response = context.client.delete(
        f"/api/v1/accounts/{unused_account['id']}",
        headers=headers,
    )
    assert unused_delete_response.status_code == 200
    assert unused_delete_response.json()["is_archived"] is True


def test_account_default_and_disable_helpers(
    finance_context: FinanceApiContext,
) -> None:
    context = finance_context
    headers = auth_headers(context, "account-defaults@example.com")
    first = create_account(context, headers, "Main Cash", "cash", "100")
    second = create_account(context, headers, "Backup Bank", "bank", "20")
    third = create_account(context, headers, "Travel Wallet", "wallet", "50")

    assert first["is_default"] is True
    assert second["is_default"] is False

    set_default_response = context.client.patch(
        f"/api/v1/accounts/{second['id']}/default",
        headers=headers,
    )
    assert set_default_response.status_code == 200
    assert set_default_response.json()["is_default"] is True

    list_response = context.client.get("/api/v1/accounts?limit=10", headers=headers)
    assert list_response.status_code == 200
    listed_accounts = list_response.json()["items"]
    assert sum(1 for account in listed_accounts if account["is_default"]) == 1
    assert (
        next(account for account in listed_accounts if account["id"] == first["id"])[
            "is_default"
        ]
        is False
    )

    disable_response = context.client.patch(
        f"/api/v1/accounts/{second['id']}/disable",
        headers=headers,
    )
    assert disable_response.status_code == 200
    disabled_account = disable_response.json()
    assert disabled_account["is_disabled"] is True
    assert disabled_account["disabled_at"] is not None
    assert disabled_account["is_default"] is False

    fallback_response = context.client.get("/api/v1/accounts?limit=10", headers=headers)
    assert fallback_response.status_code == 200
    fallback_accounts = fallback_response.json()["items"]
    assert sum(1 for account in fallback_accounts if account["is_default"]) == 1
    assert next(account for account in fallback_accounts if account["is_default"])[
        "id"
    ] in {first["id"], third["id"]}

    disabled_default_response = context.client.patch(
        f"/api/v1/accounts/{second['id']}/default",
        headers=headers,
    )
    assert disabled_default_response.status_code == 409
    assert disabled_default_response.json()["error"]["message"] == (
        "Disabled or archived account cannot be the default."
    )


def test_account_delete_eligibility_helper(
    finance_context: FinanceApiContext,
) -> None:
    context = finance_context
    headers = auth_headers(context, "account-delete-eligibility@example.com")
    used_account = create_account(context, headers, "Used Cash", "cash", "0")
    unused_account = create_account(context, headers, "Unused Cash", "cash", "0")
    expense_category = create_category(context, headers, "Food", "expense", "utensils")

    transaction_response = context.client.post(
        "/api/v1/transactions",
        headers={**headers, "Idempotency-Key": "account-delete-eligibility"},
        json={
            "account_id": used_account["id"],
            "amount": "10.00",
            "category_id": expense_category["id"],
            "transaction_at": datetime.now(UTC).isoformat(),
            "type": "expense",
        },
    )
    assert transaction_response.status_code == 201

    used_response = context.client.get(
        f"/api/v1/accounts/{used_account['id']}/delete-eligibility",
        headers=headers,
    )
    assert used_response.status_code == 200
    assert used_response.json() == {
        "account_id": used_account["id"],
        "can_delete": False,
        "reasons": ["transaction"],
    }

    unused_response = context.client.get(
        f"/api/v1/accounts/{unused_account['id']}/delete-eligibility",
        headers=headers,
    )
    assert unused_response.status_code == 200
    assert unused_response.json() == {
        "account_id": unused_account["id"],
        "can_delete": True,
        "reasons": [],
    }


def test_category_crud_filter_duplicate_and_archive(
    finance_context: FinanceApiContext,
) -> None:
    context = finance_context
    headers = auth_headers(context, "categories-owner@example.com")

    salary = create_category(context, headers, "Salary", "income", "briefcase")
    groceries = create_category(context, headers, "Groceries", "expense", "cart")

    filter_response = context.client.get(
        "/api/v1/categories?kind=expense",
        headers=headers,
    )
    assert filter_response.status_code == 200
    assert [item["id"] for item in filter_response.json()["items"]] == [groceries["id"]]

    update_response = context.client.patch(
        f"/api/v1/categories/{salary['id']}",
        headers=headers,
        json={"name": "Paycheck", "icon_key": "wallet"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["name"] == "Paycheck"
    assert update_response.json()["kind"] == "income"

    duplicate_response = context.client.post(
        "/api/v1/categories",
        headers=headers,
        json={"name": "Groceries", "kind": "expense", "icon_key": "basket"},
    )
    assert duplicate_response.status_code == 409
    assert duplicate_response.json()["error"]["message"] == "Category already exists"

    archive_response = context.client.delete(
        f"/api/v1/categories/{groceries['id']}",
        headers=headers,
    )
    assert archive_response.status_code == 200
    assert archive_response.json()["is_archived"] is True

    active_response = context.client.get("/api/v1/categories", headers=headers)
    assert groceries["id"] not in {
        item["id"] for item in active_response.json()["items"]
    }

    archived_response = context.client.get(
        "/api/v1/categories?include_archived=true",
        headers=headers,
    )
    assert groceries["id"] in {item["id"] for item in archived_response.json()["items"]}


def test_category_validation_ownership_and_openapi(
    finance_context: FinanceApiContext,
) -> None:
    context = finance_context
    owner_headers = auth_headers(context, "category-owner-scope@example.com")
    other_headers = auth_headers(context, "category-other-scope@example.com")
    category = create_category(context, owner_headers, "Transport", "expense", "car")

    invalid_kind_response = context.client.post(
        "/api/v1/categories",
        headers=owner_headers,
        json={"name": "Mystery", "kind": "other", "icon_key": "box"},
    )
    assert invalid_kind_response.status_code == 422

    assert (
        context.client.patch(
            f"/api/v1/categories/{category['id']}",
            headers=other_headers,
            json={"name": "Other User Change"},
        ).status_code
        == 404
    )
    assert (
        context.client.delete(
            f"/api/v1/categories/{category['id']}",
            headers=other_headers,
        ).status_code
        == 404
    )

    openapi = context.client.get("/openapi.json").json()
    assert "/api/v1/accounts" in openapi["paths"]
    assert "/api/v1/accounts/{account_id}" in openapi["paths"]
    assert "/api/v1/categories" in openapi["paths"]
    assert "/api/v1/categories/{category_id}" in openapi["paths"]
    assert openapi["paths"]["/api/v1/accounts"]["post"]["security"] == [
        {"HTTPBearer": []}
    ]
    assert (
        openapi["paths"]["/api/v1/accounts"]["get"]["responses"]["200"]["content"][
            "application/json"
        ]["schema"]["$ref"]
        == "#/components/schemas/AccountListResponse"
    )
    assert (
        openapi["paths"]["/api/v1/categories"]["get"]["responses"]["200"]["content"][
            "application/json"
        ]["schema"]["$ref"]
        == "#/components/schemas/CategoryListResponse"
    )


def auth_headers(context: FinanceApiContext, email: str) -> dict[str, str]:
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
    context: FinanceApiContext,
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
    context: FinanceApiContext,
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
