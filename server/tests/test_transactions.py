from __future__ import annotations

import asyncio
import uuid
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path

import pytest
from alembic.config import Config
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from alembic import command
from app.core.config import Settings
from app.core.database import (
    build_async_engine,
    build_session_factory,
    get_session,
    get_session_from_factory,
)
from app.main import create_app
from app.modules.accounts.repositories import AccountRepository
from app.modules.categories.repositories import CategoryRepository
from app.modules.savings.models import SavingsContribution
from app.modules.savings.repositories import SavingsRepository
from app.modules.transactions.models import Transaction, TransferLink
from app.modules.transactions.repositories import TransactionRepository
from app.modules.transactions.schemas import (
    SavingsTransferCreateRequest,
    TransferCreateRequest,
)
from app.modules.transactions.services import TransactionService
from app.modules.users.models import User


@dataclass(frozen=True)
class TransactionApiContext:
    client: TestClient
    database_url: str


def build_alembic_config(database_url: str) -> Config:
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def transaction_test_app(database_url: str) -> FastAPI:
    return create_app(
        Settings(
            app_name="PFM Test API",
            app_env="test",
            debug=False,
            cors_origins=["http://testserver"],
            database_url=database_url,
            access_token_secret_key="transaction-test-secret-with-at-least-32-bytes",
        ),
    )


@pytest.fixture
def transaction_context(
    disposable_postgres_url: str,
) -> Iterator[TransactionApiContext]:
    command.upgrade(build_alembic_config(disposable_postgres_url), "head")
    engine = build_async_engine(disposable_postgres_url)
    session_factory = build_session_factory(engine)
    app = transaction_test_app(disposable_postgres_url)

    async def test_session() -> object:
        async for session in get_session_from_factory(session_factory):
            yield session

    app.dependency_overrides[get_session] = test_session

    try:
        with TestClient(app) as client:
            yield TransactionApiContext(
                client=client,
                database_url=disposable_postgres_url,
            )
    finally:
        asyncio.run(engine.dispose())


def test_income_and_expense_crud_precision_and_void(
    transaction_context: TransactionApiContext,
) -> None:
    context = transaction_context
    headers = auth_headers(context, "transactions-owner@example.com")
    account = create_account(context, headers, "Checking", "bank", "0")
    income_category = create_category(context, headers, "Salary", "income", "briefcase")
    expense_category = create_category(
        context, headers, "Dining", "expense", "utensils"
    )

    income = create_transaction(
        context,
        headers,
        account["id"],
        income_category["id"],
        "income",
        "10.1234",
        "2026-01-02T10:00:00+06:00",
        "  Monthly salary  ",
    )
    expense = create_transaction(
        context,
        headers,
        account["id"],
        expense_category["id"],
        "expense",
        "3.0001",
        "2026-01-03T12:00:00+00:00",
        "Lunch",
    )

    assert income["amount"] == "10.1234"
    assert income["currency"] == "USD"
    assert income["description"] == "Monthly salary"
    assert expense["amount"] == "3.0001"

    list_response = context.client.get("/api/v1/transactions", headers=headers)
    assert list_response.status_code == 200
    assert [item["id"] for item in list_response.json()["items"]] == [
        expense["id"],
        income["id"],
    ]

    get_response = context.client.get(
        f"/api/v1/transactions/{income['id']}",
        headers=headers,
    )
    assert get_response.status_code == 200
    assert get_response.json()["amount"] == "10.1234"

    update_response = context.client.patch(
        f"/api/v1/transactions/{expense['id']}",
        headers=headers,
        json={
            "amount": "4.9999",
            "transaction_at": "2026-01-04T00:00:00+00:00",
            "description": "  Updated lunch  ",
        },
    )
    assert update_response.status_code == 200
    assert update_response.json()["amount"] == "4.9999"
    assert update_response.json()["description"] == "Updated lunch"

    signed_total = asyncio.run(
        fetch_signed_transaction_total(
            context.database_url,
            {uuid.UUID(str(income["id"])), uuid.UUID(str(expense["id"]))},
        )
    )
    assert signed_total == Decimal("5.1235")

    void_response = context.client.delete(
        f"/api/v1/transactions/{income['id']}",
        headers=headers,
    )
    assert void_response.status_code == 200
    assert void_response.json()["voided_at"] is not None

    after_void_response = context.client.get("/api/v1/transactions", headers=headers)
    assert after_void_response.status_code == 200
    assert [item["id"] for item in after_void_response.json()["items"]] == [
        expense["id"]
    ]

    voided_detail_response = context.client.get(
        f"/api/v1/transactions/{income['id']}",
        headers=headers,
    )
    assert voided_detail_response.status_code == 200
    assert voided_detail_response.json()["voided_at"] is not None

    update_voided_response = context.client.patch(
        f"/api/v1/transactions/{income['id']}",
        headers=headers,
        json={"amount": "11.0000"},
    )
    assert update_voided_response.status_code == 409


def test_income_expense_balance_effects_follow_selected_account(
    transaction_context: TransactionApiContext,
) -> None:
    context = transaction_context
    headers = auth_headers(context, "transaction-balances@example.com")
    checking = create_account(context, headers, "Balance Checking", "bank", "100")
    reserve = create_account(context, headers, "Balance Reserve", "bank", "50")
    income_category = create_category(
        context,
        headers,
        "Balance Income",
        "income",
        "briefcase",
    )
    expense_category = create_category(
        context,
        headers,
        "Balance Expense",
        "expense",
        "receipt",
    )

    income = create_transaction(
        context,
        headers,
        checking["id"],
        income_category["id"],
        "income",
        "25.0000",
        "2026-01-05T00:00:00+00:00",
    )
    expense = create_transaction(
        context,
        headers,
        checking["id"],
        expense_category["id"],
        "expense",
        "5.0000",
        "2026-01-06T00:00:00+00:00",
    )

    assert get_account_balance(context, headers, checking["id"]) == Decimal("120.0000")
    assert get_account_balance(context, headers, reserve["id"]) == Decimal("50.0000")

    move_expense_response = context.client.patch(
        f"/api/v1/transactions/{expense['id']}",
        headers=headers,
        json={"account_id": reserve["id"], "amount": "7.0000"},
    )
    assert move_expense_response.status_code == 200
    assert get_account_balance(context, headers, checking["id"]) == Decimal("125.0000")
    assert get_account_balance(context, headers, reserve["id"]) == Decimal("43.0000")

    void_income_response = context.client.delete(
        f"/api/v1/transactions/{income['id']}",
        headers=headers,
    )
    assert void_income_response.status_code == 200
    assert get_account_balance(context, headers, checking["id"]) == Decimal("100.0000")
    assert get_account_balance(context, headers, reserve["id"]) == Decimal("43.0000")


def test_transaction_validation_and_reference_rules(
    transaction_context: TransactionApiContext,
) -> None:
    context = transaction_context
    headers = auth_headers(context, "transaction-rules@example.com")
    account = create_account(context, headers, "Wallet", "wallet", "0")
    income_category = create_category(context, headers, "Bonus", "income", "gift")
    expense_category = create_category(context, headers, "Groceries", "expense", "cart")

    wrong_kind_response = context.client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "account_id": account["id"],
            "category_id": expense_category["id"],
            "type": "income",
            "amount": "1.0000",
            "transaction_at": "2026-02-01T00:00:00+00:00",
        },
    )
    assert wrong_kind_response.status_code == 422

    float_amount_response = context.client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "account_id": account["id"],
            "category_id": income_category["id"],
            "type": "income",
            "amount": 1.2,
            "transaction_at": "2026-02-01T00:00:00+00:00",
        },
    )
    assert float_amount_response.status_code == 422
    assert "1.2" in float_amount_response.text

    naive_date_response = context.client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "account_id": account["id"],
            "category_id": income_category["id"],
            "type": "income",
            "amount": "1.0000",
            "transaction_at": "2026-02-01T00:00:00",
        },
    )
    assert naive_date_response.status_code == 422

    transfer_type_response = context.client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "account_id": account["id"],
            "category_id": income_category["id"],
            "type": "transfer_debit",
            "amount": "1.0000",
            "transaction_at": "2026-02-01T00:00:00+00:00",
        },
    )
    assert transfer_type_response.status_code == 422


def test_transaction_ownership_and_inactive_reference_rejection(
    transaction_context: TransactionApiContext,
) -> None:
    context = transaction_context
    owner_headers = auth_headers(context, "transaction-owner@example.com")
    other_headers = auth_headers(context, "transaction-other@example.com")

    account = create_account(context, owner_headers, "Owner Cash", "cash", "0")
    category = create_category(context, owner_headers, "Owner Income", "income", "bank")
    other_account = create_account(context, other_headers, "Other Cash", "cash", "0")
    other_category = create_category(
        context,
        other_headers,
        "Other Income",
        "income",
        "bank",
    )
    transaction = create_transaction(
        context,
        owner_headers,
        account["id"],
        category["id"],
        "income",
        "8.5000",
        "2026-03-01T00:00:00+00:00",
    )

    assert (
        context.client.get(
            f"/api/v1/transactions/{transaction['id']}",
            headers=other_headers,
        ).status_code
        == 404
    )
    assert (
        context.client.patch(
            f"/api/v1/transactions/{transaction['id']}",
            headers=other_headers,
            json={"amount": "1.0000"},
        ).status_code
        == 404
    )
    assert (
        context.client.delete(
            f"/api/v1/transactions/{transaction['id']}",
            headers=other_headers,
        ).status_code
        == 404
    )

    cross_user_account_response = context.client.post(
        "/api/v1/transactions",
        headers=owner_headers,
        json={
            "account_id": other_account["id"],
            "category_id": category["id"],
            "type": "income",
            "amount": "1.0000",
            "transaction_at": "2026-03-02T00:00:00+00:00",
        },
    )
    assert cross_user_account_response.status_code == 422

    cross_user_category_response = context.client.post(
        "/api/v1/transactions",
        headers=owner_headers,
        json={
            "account_id": account["id"],
            "category_id": other_category["id"],
            "type": "income",
            "amount": "1.0000",
            "transaction_at": "2026-03-02T00:00:00+00:00",
        },
    )
    assert cross_user_category_response.status_code == 422

    disabled_account = create_account(
        context,
        owner_headers,
        "Disabled Cash",
        "cash",
        "0",
    )
    assert (
        context.client.patch(
            f"/api/v1/accounts/{disabled_account['id']}/disable",
            headers=owner_headers,
        ).status_code
        == 200
    )

    disabled_account_response = context.client.post(
        "/api/v1/transactions",
        headers=owner_headers,
        json={
            "account_id": disabled_account["id"],
            "category_id": category["id"],
            "type": "income",
            "amount": "1.0000",
            "transaction_at": "2026-03-02T00:00:00+00:00",
        },
    )
    assert disabled_account_response.status_code == 422

    disabled_account_update_response = context.client.patch(
        f"/api/v1/transactions/{transaction['id']}",
        headers=owner_headers,
        json={"account_id": disabled_account["id"]},
    )
    assert disabled_account_update_response.status_code == 422

    archived_account = create_account(context, owner_headers, "Archived", "cash", "0")
    archived_category = create_category(
        context,
        owner_headers,
        "Archived Income",
        "income",
        "box",
    )
    assert (
        context.client.delete(
            f"/api/v1/accounts/{archived_account['id']}",
            headers=owner_headers,
        ).status_code
        == 200
    )
    assert (
        context.client.delete(
            f"/api/v1/categories/{archived_category['id']}",
            headers=owner_headers,
        ).status_code
        == 200
    )

    archived_account_response = context.client.post(
        "/api/v1/transactions",
        headers=owner_headers,
        json={
            "account_id": archived_account["id"],
            "category_id": category["id"],
            "type": "income",
            "amount": "1.0000",
            "transaction_at": "2026-03-02T00:00:00+00:00",
        },
    )
    assert archived_account_response.status_code == 422

    archived_category_response = context.client.post(
        "/api/v1/transactions",
        headers=owner_headers,
        json={
            "account_id": account["id"],
            "category_id": archived_category["id"],
            "type": "income",
            "amount": "1.0000",
            "transaction_at": "2026-03-02T00:00:00+00:00",
        },
    )
    assert archived_category_response.status_code == 422


def test_transfer_create_retrieve_and_source_records(
    transaction_context: TransactionApiContext,
) -> None:
    context = transaction_context
    headers = auth_headers(context, "transfer-owner@example.com")
    checking = create_account(context, headers, "Checking Transfer", "bank", "0")
    savings = create_account(context, headers, "Savings Transfer", "savings", "0")

    transfer = create_transfer(
        context,
        headers,
        checking["id"],
        savings["id"],
        "25.1250",
        "2026-04-01T09:15:00+06:00",
        "  Move to savings  ",
    )

    assert transfer["from_account_id"] == checking["id"]
    assert transfer["to_account_id"] == savings["id"]
    assert transfer["amount"] == "25.1250"
    assert transfer["currency"] == "USD"
    assert transfer["converted_amount"] is None
    assert transfer["converted_currency"] is None
    assert transfer["description"] == "Move to savings"
    assert transfer["debit_transaction_id"] != transfer["credit_transaction_id"]

    detail_response = context.client.get(
        f"/api/v1/transactions/transfers/{transfer['id']}",
        headers=headers,
    )
    assert detail_response.status_code == 200
    assert detail_response.json() == transfer

    list_response = context.client.get(
        "/api/v1/transactions",
        headers=headers,
        params={"type": "income"},
    )
    assert list_response.status_code == 200
    assert list_response.json()["items"] == []

    source_records = asyncio.run(
        fetch_transfer_source_records(
            context.database_url,
            uuid.UUID(str(transfer["id"])),
            uuid.UUID(str(transfer["debit_transaction_id"])),
            uuid.UUID(str(transfer["credit_transaction_id"])),
        )
    )
    assert source_records == {
        "link_amount": Decimal("25.1250"),
        "link_currency": "USD",
        "debit_type": "transfer_debit",
        "credit_type": "transfer_credit",
        "debit_amount": Decimal("25.1250"),
        "credit_amount": Decimal("25.1250"),
        "debit_account_id": uuid.UUID(str(checking["id"])),
        "credit_account_id": uuid.UUID(str(savings["id"])),
        "debit_category_id": None,
        "credit_category_id": None,
    }
    assert get_account_balance(context, headers, checking["id"]) == Decimal("-25.1250")
    assert get_account_balance(context, headers, savings["id"]) == Decimal("25.1250")


def test_cross_currency_transfer_uses_converted_credit_amount(
    transaction_context: TransactionApiContext,
) -> None:
    context = transaction_context
    headers = auth_headers(context, "converted-transfer@example.com")
    cny_account = create_account(
        context,
        headers,
        "CNY Wallet",
        "wallet",
        "1000.0000",
        currency="CNY",
    )
    bdt_account = create_account(
        context,
        headers,
        "BDT Bank",
        "bank",
        "10000.0000",
        currency="BDT",
    )

    cny_to_bdt = create_transfer(
        context,
        headers,
        cny_account["id"],
        bdt_account["id"],
        "100.0000",
        "2026-04-01T00:00:00+00:00",
        idempotency_key="cny-to-bdt-transfer",
        converted_amount="1910.0000",
    )
    assert cny_to_bdt["amount"] == "100.0000"
    assert cny_to_bdt["currency"] == "CNY"
    assert cny_to_bdt["converted_amount"] == "1910.0000"
    assert cny_to_bdt["converted_currency"] == "BDT"
    assert get_account_balance(context, headers, cny_account["id"]) == Decimal(
        "900.0000"
    )
    assert get_account_balance(context, headers, bdt_account["id"]) == Decimal(
        "11910.0000"
    )

    replay = create_transfer(
        context,
        headers,
        cny_account["id"],
        bdt_account["id"],
        "100.0000",
        "2026-04-01T00:00:00+00:00",
        idempotency_key="cny-to-bdt-transfer",
        converted_amount="1910.0000",
    )
    assert replay == cny_to_bdt
    assert get_account_balance(context, headers, cny_account["id"]) == Decimal(
        "900.0000"
    )
    assert get_account_balance(context, headers, bdt_account["id"]) == Decimal(
        "11910.0000"
    )

    conflict_response = context.client.post(
        "/api/v1/transactions/transfers",
        headers={**headers, "Idempotency-Key": "cny-to-bdt-transfer"},
        json={
            "from_account_id": cny_account["id"],
            "to_account_id": bdt_account["id"],
            "amount": "100.0000",
            "converted_amount": "1900.0000",
            "transaction_at": "2026-04-01T00:00:00+00:00",
        },
    )
    assert conflict_response.status_code == 409

    bdt_to_cny = create_transfer(
        context,
        headers,
        bdt_account["id"],
        cny_account["id"],
        "5000.0000",
        "2026-04-02T00:00:00+00:00",
        converted_amount="260.0000",
    )
    assert bdt_to_cny["amount"] == "5000.0000"
    assert bdt_to_cny["currency"] == "BDT"
    assert bdt_to_cny["converted_amount"] == "260.0000"
    assert bdt_to_cny["converted_currency"] == "CNY"
    detail_response = context.client.get(
        f"/api/v1/transactions/transfers/{bdt_to_cny['id']}",
        headers=headers,
    )
    assert detail_response.status_code == 200
    assert detail_response.json() == bdt_to_cny
    assert get_account_balance(context, headers, bdt_account["id"]) == Decimal(
        "6910.0000"
    )
    assert get_account_balance(context, headers, cny_account["id"]) == Decimal(
        "1160.0000"
    )


def test_transfer_validation_and_ownership_rules(
    transaction_context: TransactionApiContext,
) -> None:
    context = transaction_context
    owner_headers = auth_headers(context, "transfer-rules-owner@example.com")
    other_headers = auth_headers(context, "transfer-rules-other@example.com")
    checking = create_account(context, owner_headers, "Rules Checking", "bank", "0")
    savings = create_account(context, owner_headers, "Rules Savings", "savings", "0")
    eur_wallet = create_account(
        context,
        owner_headers,
        "EUR Wallet",
        "wallet",
        "0",
        currency="EUR",
    )
    other_account = create_account(
        context,
        other_headers,
        "Other Wallet",
        "wallet",
        "0",
    )

    same_account_response = context.client.post(
        "/api/v1/transactions/transfers",
        headers=owner_headers,
        json={
            "from_account_id": checking["id"],
            "to_account_id": checking["id"],
            "amount": "1.0000",
            "transaction_at": "2026-04-02T00:00:00+00:00",
        },
    )
    assert same_account_response.status_code == 422

    cross_user_response = context.client.post(
        "/api/v1/transactions/transfers",
        headers=owner_headers,
        json={
            "from_account_id": checking["id"],
            "to_account_id": other_account["id"],
            "amount": "1.0000",
            "transaction_at": "2026-04-02T00:00:00+00:00",
        },
    )
    assert cross_user_response.status_code == 422

    missing_converted_amount_response = context.client.post(
        "/api/v1/transactions/transfers",
        headers=owner_headers,
        json={
            "from_account_id": checking["id"],
            "to_account_id": eur_wallet["id"],
            "amount": "1.0000",
            "transaction_at": "2026-04-02T00:00:00+00:00",
        },
    )
    assert missing_converted_amount_response.status_code == 422

    unexpected_converted_amount_response = context.client.post(
        "/api/v1/transactions/transfers",
        headers=owner_headers,
        json={
            "from_account_id": checking["id"],
            "to_account_id": savings["id"],
            "amount": "1.0000",
            "converted_amount": "1.0000",
            "transaction_at": "2026-04-02T00:00:00+00:00",
        },
    )
    assert unexpected_converted_amount_response.status_code == 422

    float_converted_amount_response = context.client.post(
        "/api/v1/transactions/transfers",
        headers=owner_headers,
        json={
            "from_account_id": checking["id"],
            "to_account_id": eur_wallet["id"],
            "amount": "1.0000",
            "converted_amount": 0.9,
            "transaction_at": "2026-04-02T00:00:00+00:00",
        },
    )
    assert float_converted_amount_response.status_code == 422
    assert "0.9" in float_converted_amount_response.text

    float_amount_response = context.client.post(
        "/api/v1/transactions/transfers",
        headers=owner_headers,
        json={
            "from_account_id": checking["id"],
            "to_account_id": savings["id"],
            "amount": 1.2,
            "transaction_at": "2026-04-02T00:00:00+00:00",
        },
    )
    assert float_amount_response.status_code == 422
    assert "1.2" in float_amount_response.text

    naive_date_response = context.client.post(
        "/api/v1/transactions/transfers",
        headers=owner_headers,
        json={
            "from_account_id": checking["id"],
            "to_account_id": savings["id"],
            "amount": "1.0000",
            "transaction_at": "2026-04-02T00:00:00",
        },
    )
    assert naive_date_response.status_code == 422

    archived = create_account(context, owner_headers, "Archived Transfer", "cash", "0")
    archive_response = context.client.delete(
        f"/api/v1/accounts/{archived['id']}",
        headers=owner_headers,
    )
    assert archive_response.status_code == 200

    archived_response = context.client.post(
        "/api/v1/transactions/transfers",
        headers=owner_headers,
        json={
            "from_account_id": checking["id"],
            "to_account_id": archived["id"],
            "amount": "1.0000",
            "transaction_at": "2026-04-02T00:00:00+00:00",
        },
    )
    assert archived_response.status_code == 422

    transfer = create_transfer(
        context,
        owner_headers,
        checking["id"],
        savings["id"],
        "2.0000",
        "2026-04-03T00:00:00+00:00",
    )
    cross_user_detail_response = context.client.get(
        f"/api/v1/transactions/transfers/{transfer['id']}",
        headers=other_headers,
    )
    assert cross_user_detail_response.status_code == 404


def test_savings_transfer_creates_account_debit_and_contribution(
    transaction_context: TransactionApiContext,
) -> None:
    context = transaction_context
    headers = auth_headers(context, "savings-transfer-owner@example.com")
    checking = create_account(
        context,
        headers,
        "Savings Transfer Checking",
        "bank",
        "100.0000",
    )
    goal = create_savings_goal(
        context,
        headers,
        name="Emergency transfer goal",
        target_amount="50.0000",
    )

    transfer = create_savings_transfer(
        context,
        headers,
        checking["id"],
        goal["id"],
        "25.1250",
        "2026-04-05T09:15:00+06:00",
        "  Move to emergency  ",
    )

    assert transfer["from_account_id"] == checking["id"]
    assert transfer["savings_goal_id"] == goal["id"]
    assert transfer["amount"] == "25.1250"
    assert transfer["currency"] == "USD"
    assert transfer["description"] == "Move to emergency"
    assert transfer["contribution_id"] == transfer["id"]

    debit_response = context.client.get(
        "/api/v1/transactions",
        headers=headers,
        params={"type": "transfer_debit", "search": "emergency"},
    )
    assert debit_response.status_code == 200
    assert [item["id"] for item in debit_response.json()["items"]] == [
        transfer["debit_transaction_id"]
    ]

    goal_response = context.client.get(
        f"/api/v1/savings-goals/{goal['id']}",
        headers=headers,
    )
    assert goal_response.status_code == 200
    assert Decimal(goal_response.json()["progress"]["saved_amount"]) == Decimal(
        "25.1250"
    )
    assert get_account_balance(context, headers, checking["id"]) == Decimal("74.8750")

    dashboard_response = context.client.get(
        "/api/v1/reports/dashboard",
        headers=headers,
        params={"period": "month", "type": "expense", "as_of": "2026-04-05"},
    )
    assert dashboard_response.status_code == 200
    assert Decimal(dashboard_response.json()["available_balance"]) == Decimal("74.8750")

    source_records = asyncio.run(
        fetch_savings_transfer_source_records(
            context.database_url,
            uuid.UUID(str(transfer["debit_transaction_id"])),
            uuid.UUID(str(transfer["contribution_id"])),
        )
    )
    assert source_records == {
        "debit_type": "transfer_debit",
        "debit_amount": Decimal("25.1250"),
        "debit_account_id": uuid.UUID(str(checking["id"])),
        "debit_category_id": None,
        "contribution_goal_id": uuid.UUID(str(goal["id"])),
        "contribution_amount": Decimal("25.1250"),
        "contribution_currency": "USD",
        "contribution_note": "Move to emergency",
    }


def test_savings_transfer_validation_and_ownership_rules(
    transaction_context: TransactionApiContext,
) -> None:
    context = transaction_context
    owner_headers = auth_headers(context, "savings-transfer-rules@example.com")
    other_headers = auth_headers(context, "savings-transfer-other@example.com")
    checking = create_account(context, owner_headers, "Rules Checking", "bank", "0")
    eur_account = create_account(
        context,
        owner_headers,
        "Rules EUR",
        "bank",
        "0",
        currency="EUR",
    )
    archived = create_account(context, owner_headers, "Archived Source", "bank", "0")
    goal = create_savings_goal(
        context,
        owner_headers,
        name="Rules Goal",
        target_amount="100.0000",
    )
    eur_goal = create_savings_goal(
        context,
        owner_headers,
        name="Rules EUR Goal",
        target_amount="100.0000",
        currency="EUR",
    )
    other_goal = create_savings_goal(
        context,
        other_headers,
        name="Other Goal",
        target_amount="100.0000",
    )

    cross_user_goal_response = context.client.post(
        "/api/v1/transactions/savings-transfers",
        headers=owner_headers,
        json={
            "from_account_id": checking["id"],
            "savings_goal_id": other_goal["id"],
            "amount": "1.0000",
            "transaction_at": "2026-04-06T00:00:00+00:00",
        },
    )
    assert cross_user_goal_response.status_code == 422

    currency_mismatch_response = context.client.post(
        "/api/v1/transactions/savings-transfers",
        headers=owner_headers,
        json={
            "from_account_id": checking["id"],
            "savings_goal_id": eur_goal["id"],
            "amount": "1.0000",
            "transaction_at": "2026-04-06T00:00:00+00:00",
        },
    )
    assert currency_mismatch_response.status_code == 422

    currency_match_response = context.client.post(
        "/api/v1/transactions/savings-transfers",
        headers=owner_headers,
        json={
            "from_account_id": eur_account["id"],
            "savings_goal_id": eur_goal["id"],
            "amount": "1.0000",
            "transaction_at": "2026-04-06T00:00:00+00:00",
        },
    )
    assert currency_match_response.status_code == 201

    float_amount_response = context.client.post(
        "/api/v1/transactions/savings-transfers",
        headers=owner_headers,
        json={
            "from_account_id": checking["id"],
            "savings_goal_id": goal["id"],
            "amount": 1.2,
            "transaction_at": "2026-04-06T00:00:00+00:00",
        },
    )
    assert float_amount_response.status_code == 422
    assert "1.2" in float_amount_response.text

    naive_date_response = context.client.post(
        "/api/v1/transactions/savings-transfers",
        headers=owner_headers,
        json={
            "from_account_id": checking["id"],
            "savings_goal_id": goal["id"],
            "amount": "1.0000",
            "transaction_at": "2026-04-06T00:00:00",
        },
    )
    assert naive_date_response.status_code == 422

    assert (
        context.client.delete(
            f"/api/v1/accounts/{archived['id']}",
            headers=owner_headers,
        ).status_code
        == 200
    )
    archived_account_response = context.client.post(
        "/api/v1/transactions/savings-transfers",
        headers=owner_headers,
        json={
            "from_account_id": archived["id"],
            "savings_goal_id": goal["id"],
            "amount": "1.0000",
            "transaction_at": "2026-04-06T00:00:00+00:00",
        },
    )
    assert archived_account_response.status_code == 422

    completed_goal = create_savings_goal(
        context,
        owner_headers,
        name="Completed Goal",
        target_amount="1.0000",
    )
    assert (
        context.client.post(
            f"/api/v1/savings-goals/{completed_goal['id']}/contributions",
            headers=owner_headers,
            json={
                "amount": "1.0000",
                "contributed_at": "2026-04-06T00:00:00+00:00",
            },
        ).status_code
        == 201
    )
    completed_goal_response = context.client.post(
        "/api/v1/transactions/savings-transfers",
        headers=owner_headers,
        json={
            "from_account_id": checking["id"],
            "savings_goal_id": completed_goal["id"],
            "amount": "1.0000",
            "transaction_at": "2026-04-06T00:00:00+00:00",
        },
    )
    assert completed_goal_response.status_code == 422


def test_savings_transfer_rolls_back_when_contribution_write_fails(
    transaction_context: TransactionApiContext,
) -> None:
    context = transaction_context
    email = "savings-transfer-rollback@example.com"
    headers = auth_headers(context, email)
    checking = create_account(context, headers, "Rollback Checking", "bank", "0")
    goal = create_savings_goal(
        context,
        headers,
        name="Rollback Goal",
        target_amount="100.0000",
    )

    asyncio.run(
        assert_failing_savings_transfer_rolls_back(
            context.database_url,
            email,
            uuid.UUID(str(checking["id"])),
            uuid.UUID(str(goal["id"])),
        )
    )


def test_transfer_rolls_back_when_link_write_fails(
    transaction_context: TransactionApiContext,
) -> None:
    context = transaction_context
    email = "transfer-rollback@example.com"
    headers = auth_headers(context, email)
    checking = create_account(context, headers, "Rollback Checking", "bank", "0")
    savings = create_account(context, headers, "Rollback Savings", "savings", "0")

    asyncio.run(
        assert_failing_transfer_rolls_back(
            context.database_url,
            email,
            uuid.UUID(str(checking["id"])),
            uuid.UUID(str(savings["id"])),
        )
    )


def test_transaction_filters_pagination_and_ordering(
    transaction_context: TransactionApiContext,
) -> None:
    context = transaction_context
    headers = auth_headers(context, "transaction-filters@example.com")
    checking = create_account(context, headers, "Filter Checking", "bank", "0")
    wallet = create_account(context, headers, "Filter Wallet", "wallet", "0")
    income_category = create_category(context, headers, "Filter Income", "income", "up")
    food_category = create_category(context, headers, "Food", "expense", "utensils")
    rent_category = create_category(context, headers, "Rent", "expense", "home")

    income = create_transaction(
        context,
        headers,
        checking["id"],
        income_category["id"],
        "income",
        "100.0000",
        "2026-05-03T00:00:00+00:00",
        "Salary alpha",
    )
    newer_food = create_transaction(
        context,
        headers,
        checking["id"],
        food_category["id"],
        "expense",
        "5.0000",
        "2026-05-02T00:00:00+00:00",
        "Coffee food",
    )
    older_food = create_transaction(
        context,
        headers,
        wallet["id"],
        food_category["id"],
        "expense",
        "7.0000",
        "2026-05-01T00:00:00+00:00",
        "Groceries food",
    )
    rent = create_transaction(
        context,
        headers,
        wallet["id"],
        rent_category["id"],
        "expense",
        "9.0000",
        "2026-04-30T00:00:00+00:00",
        "Rent",
    )

    default_response = context.client.get("/api/v1/transactions", headers=headers)
    assert default_response.status_code == 200
    assert [item["id"] for item in default_response.json()["items"]] == [
        income["id"],
        newer_food["id"],
        older_food["id"],
        rent["id"],
    ]
    assert default_response.json()["has_more"] is False
    assert default_response.json()["next_cursor"] is None

    type_response = context.client.get(
        "/api/v1/transactions",
        headers=headers,
        params={"type": "expense"},
    )
    assert type_response.status_code == 200
    assert [item["id"] for item in type_response.json()["items"]] == [
        newer_food["id"],
        older_food["id"],
        rent["id"],
    ]

    account_response = context.client.get(
        "/api/v1/transactions",
        headers=headers,
        params={"account_id": wallet["id"]},
    )
    assert account_response.status_code == 200
    assert [item["id"] for item in account_response.json()["items"]] == [
        older_food["id"],
        rent["id"],
    ]

    category_response = context.client.get(
        "/api/v1/transactions",
        headers=headers,
        params={"category_id": food_category["id"]},
    )
    assert category_response.status_code == 200
    assert [item["id"] for item in category_response.json()["items"]] == [
        newer_food["id"],
        older_food["id"],
    ]

    date_response = context.client.get(
        "/api/v1/transactions",
        headers=headers,
        params={
            "date_from": "2026-05-01T00:00:00+00:00",
            "date_to": "2026-05-02T00:00:00+00:00",
        },
    )
    assert date_response.status_code == 200
    assert [item["id"] for item in date_response.json()["items"]] == [
        newer_food["id"],
        older_food["id"],
    ]

    first_page_response = context.client.get(
        "/api/v1/transactions",
        headers=headers,
        params={"search": "food", "limit": 1},
    )
    assert first_page_response.status_code == 200
    first_page = first_page_response.json()
    assert [item["id"] for item in first_page["items"]] == [newer_food["id"]]
    assert first_page["has_more"] is True
    assert first_page["next_cursor"] is not None

    second_page_response = context.client.get(
        "/api/v1/transactions",
        headers=headers,
        params={"search": "food", "limit": 1, "cursor": first_page["next_cursor"]},
    )
    assert second_page_response.status_code == 200
    second_page = second_page_response.json()
    assert [item["id"] for item in second_page["items"]] == [older_food["id"]]
    assert second_page["has_more"] is False
    assert second_page["next_cursor"] is None


def test_transaction_filter_validation(
    transaction_context: TransactionApiContext,
) -> None:
    context = transaction_context
    owner_headers = auth_headers(context, "transaction-filter-owner@example.com")
    other_headers = auth_headers(context, "transaction-filter-other@example.com")
    other_account = create_account(context, other_headers, "Other Filter", "bank", "0")

    invalid_cursor_response = context.client.get(
        "/api/v1/transactions",
        headers=owner_headers,
        params={"cursor": "not-a-valid-cursor"},
    )
    assert invalid_cursor_response.status_code == 422

    naive_date_response = context.client.get(
        "/api/v1/transactions",
        headers=owner_headers,
        params={"date_from": "2026-05-01T00:00:00"},
    )
    assert naive_date_response.status_code == 422

    reversed_date_response = context.client.get(
        "/api/v1/transactions",
        headers=owner_headers,
        params={
            "date_from": "2026-05-02T00:00:00+00:00",
            "date_to": "2026-05-01T00:00:00+00:00",
        },
    )
    assert reversed_date_response.status_code == 422

    cross_user_filter_response = context.client.get(
        "/api/v1/transactions",
        headers=owner_headers,
        params={"account_id": other_account["id"]},
    )
    assert cross_user_filter_response.status_code == 422


def test_transaction_create_idempotency(
    transaction_context: TransactionApiContext,
) -> None:
    context = transaction_context
    headers = auth_headers(context, "transaction-idempotency@example.com")
    account = create_account(context, headers, "Idempotency Checking", "bank", "0")
    category = create_category(context, headers, "Idempotency Income", "income", "up")

    first = create_transaction(
        context,
        headers,
        account["id"],
        category["id"],
        "income",
        "12.3400",
        "2026-05-04T00:00:00+00:00",
        "Idempotent salary",
        idempotency_key="transaction-create-key",
    )
    second = create_transaction(
        context,
        headers,
        account["id"],
        category["id"],
        "income",
        "12.3400",
        "2026-05-04T00:00:00+00:00",
        "Idempotent salary",
        idempotency_key="transaction-create-key",
    )
    assert second == first
    assert get_account_balance(context, headers, account["id"]) == Decimal("12.3400")

    list_response = context.client.get(
        "/api/v1/transactions",
        headers=headers,
        params={"type": "income", "search": "idempotent"},
    )
    assert list_response.status_code == 200
    assert [item["id"] for item in list_response.json()["items"]] == [first["id"]]

    conflict_response = context.client.post(
        "/api/v1/transactions",
        headers={**headers, "Idempotency-Key": "transaction-create-key"},
        json={
            "account_id": account["id"],
            "category_id": category["id"],
            "type": "income",
            "amount": "99.0000",
            "transaction_at": "2026-05-04T00:00:00+00:00",
            "description": "Idempotent salary",
        },
    )
    assert conflict_response.status_code == 409


def test_transaction_idempotency_replay_survives_archived_category(
    transaction_context: TransactionApiContext,
) -> None:
    context = transaction_context
    headers = auth_headers(context, "transaction-replay-archived@example.com")
    account = create_account(context, headers, "Replay Checking", "bank", "0")
    category = create_category(context, headers, "Replay Income", "income", "up")

    first = create_transaction(
        context,
        headers,
        account["id"],
        category["id"],
        "income",
        "23.4500",
        "2026-05-06T00:00:00+00:00",
        "Replay archived transaction",
        idempotency_key="transaction-replay-archived-key",
    )

    assert (
        context.client.delete(
            f"/api/v1/categories/{category['id']}",
            headers=headers,
        ).status_code
        == 200
    )

    second = create_transaction(
        context,
        headers,
        account["id"],
        category["id"],
        "income",
        "23.4500",
        "2026-05-06T00:00:00+00:00",
        "Replay archived transaction",
        idempotency_key="transaction-replay-archived-key",
    )
    assert second == first


def test_transfer_create_idempotency(
    transaction_context: TransactionApiContext,
) -> None:
    context = transaction_context
    headers = auth_headers(context, "transfer-idempotency@example.com")
    checking = create_account(context, headers, "Idempotent Checking", "bank", "0")
    savings = create_account(context, headers, "Idempotent Savings", "savings", "0")

    first = create_transfer(
        context,
        headers,
        checking["id"],
        savings["id"],
        "15.0000",
        "2026-05-05T00:00:00+00:00",
        "Idempotent transfer",
        idempotency_key="transfer-create-key",
    )
    second = create_transfer(
        context,
        headers,
        checking["id"],
        savings["id"],
        "15.0000",
        "2026-05-05T00:00:00+00:00",
        "Idempotent transfer",
        idempotency_key="transfer-create-key",
    )
    assert second == first
    assert get_account_balance(context, headers, checking["id"]) == Decimal("-15.0000")
    assert get_account_balance(context, headers, savings["id"]) == Decimal("15.0000")

    debit_response = context.client.get(
        "/api/v1/transactions",
        headers=headers,
        params={"type": "transfer_debit", "search": "idempotent"},
    )
    assert debit_response.status_code == 200
    assert [item["id"] for item in debit_response.json()["items"]] == [
        first["debit_transaction_id"]
    ]

    conflict_response = context.client.post(
        "/api/v1/transactions/transfers",
        headers={**headers, "Idempotency-Key": "transfer-create-key"},
        json={
            "from_account_id": checking["id"],
            "to_account_id": savings["id"],
            "amount": "16.0000",
            "transaction_at": "2026-05-05T00:00:00+00:00",
            "description": "Idempotent transfer",
        },
    )
    assert conflict_response.status_code == 409


def test_savings_transfer_create_idempotency(
    transaction_context: TransactionApiContext,
) -> None:
    context = transaction_context
    headers = auth_headers(context, "savings-transfer-idempotency@example.com")
    checking = create_account(context, headers, "Idempotent Checking", "bank", "0")
    goal = create_savings_goal(
        context,
        headers,
        name="Idempotent Goal",
        target_amount="100.0000",
    )

    first = create_savings_transfer(
        context,
        headers,
        checking["id"],
        goal["id"],
        "15.0000",
        "2026-05-05T00:00:00+00:00",
        "Idempotent savings transfer",
        idempotency_key="savings-transfer-create-key",
    )
    second = create_savings_transfer(
        context,
        headers,
        checking["id"],
        goal["id"],
        "15.0000",
        "2026-05-05T00:00:00+00:00",
        "Idempotent savings transfer",
        idempotency_key="savings-transfer-create-key",
    )
    assert second == first

    debit_response = context.client.get(
        "/api/v1/transactions",
        headers=headers,
        params={"type": "transfer_debit", "search": "idempotent"},
    )
    assert debit_response.status_code == 200
    assert [item["id"] for item in debit_response.json()["items"]] == [
        first["debit_transaction_id"]
    ]

    contributions_response = context.client.get(
        f"/api/v1/savings-goals/{goal['id']}/contributions",
        headers=headers,
    )
    assert contributions_response.status_code == 200
    assert [item["id"] for item in contributions_response.json()["items"]] == [
        first["contribution_id"]
    ]

    conflict_response = context.client.post(
        "/api/v1/transactions/savings-transfers",
        headers={**headers, "Idempotency-Key": "savings-transfer-create-key"},
        json={
            "from_account_id": checking["id"],
            "savings_goal_id": goal["id"],
            "amount": "16.0000",
            "transaction_at": "2026-05-05T00:00:00+00:00",
            "description": "Idempotent savings transfer",
        },
    )
    assert conflict_response.status_code == 409


def test_transfer_idempotency_replay_survives_reference_revalidation(
    transaction_context: TransactionApiContext,
) -> None:
    context = transaction_context
    headers = auth_headers(context, "transfer-replay-archived@example.com")
    checking = create_account(context, headers, "Replay Transfer Checking", "bank", "0")
    savings = create_account(
        context,
        headers,
        "Replay Transfer Savings",
        "savings",
        "0",
    )

    first = create_transfer(
        context,
        headers,
        checking["id"],
        savings["id"],
        "45.6700",
        "2026-05-07T00:00:00+00:00",
        "Replay archived transfer",
        idempotency_key="transfer-replay-archived-key",
    )

    second = create_transfer(
        context,
        headers,
        checking["id"],
        savings["id"],
        "45.6700",
        "2026-05-07T00:00:00+00:00",
        "Replay archived transfer",
        idempotency_key="transfer-replay-archived-key",
    )
    assert second == first


def auth_headers(context: TransactionApiContext, email: str) -> dict[str, str]:
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
    context: TransactionApiContext,
    headers: dict[str, str],
    name: str,
    account_type: str,
    opening_balance: str,
    currency: str | None = None,
) -> dict[str, object]:
    payload = {
        "name": name,
        "type": account_type,
        "opening_balance": opening_balance,
    }
    if currency is not None:
        payload["currency"] = currency

    response = context.client.post(
        "/api/v1/accounts",
        headers=headers,
        json=payload,
    )
    assert response.status_code == 201
    return dict(response.json())


def get_account_balance(
    context: TransactionApiContext,
    headers: dict[str, str],
    account_id: object,
) -> Decimal:
    response = context.client.get(
        f"/api/v1/accounts/{account_id}",
        headers=headers,
    )
    assert response.status_code == 200
    return Decimal(response.json()["current_balance"])


def create_category(
    context: TransactionApiContext,
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
    context: TransactionApiContext,
    headers: dict[str, str],
    account_id: object,
    category_id: object,
    transaction_type: str,
    amount: str,
    transaction_at: str,
    description: str | None = None,
    idempotency_key: str | None = None,
) -> dict[str, object]:
    payload: dict[str, object] = {
        "account_id": account_id,
        "category_id": category_id,
        "type": transaction_type,
        "amount": amount,
        "transaction_at": transaction_at,
    }
    if description is not None:
        payload["description"] = description

    request_headers = dict(headers)
    if idempotency_key is not None:
        request_headers["Idempotency-Key"] = idempotency_key

    response = context.client.post(
        "/api/v1/transactions",
        headers=request_headers,
        json=payload,
    )
    assert response.status_code == 201
    return dict(response.json())


def create_transfer(
    context: TransactionApiContext,
    headers: dict[str, str],
    from_account_id: object,
    to_account_id: object,
    amount: str,
    transaction_at: str,
    description: str | None = None,
    idempotency_key: str | None = None,
    converted_amount: str | None = None,
) -> dict[str, object]:
    payload: dict[str, object] = {
        "from_account_id": from_account_id,
        "to_account_id": to_account_id,
        "amount": amount,
        "transaction_at": transaction_at,
    }
    if description is not None:
        payload["description"] = description
    if converted_amount is not None:
        payload["converted_amount"] = converted_amount

    request_headers = dict(headers)
    if idempotency_key is not None:
        request_headers["Idempotency-Key"] = idempotency_key

    response = context.client.post(
        "/api/v1/transactions/transfers",
        headers=request_headers,
        json=payload,
    )
    assert response.status_code == 201
    return dict(response.json())


def create_savings_goal(
    context: TransactionApiContext,
    headers: dict[str, str],
    *,
    name: str,
    target_amount: str,
    currency: str | None = None,
) -> dict[str, object]:
    payload: dict[str, object] = {
        "name": name,
        "target_amount": target_amount,
    }
    if currency is not None:
        payload["currency"] = currency
    response = context.client.post(
        "/api/v1/savings-goals",
        headers=headers,
        json=payload,
    )
    assert response.status_code == 201
    return dict(response.json())


def create_savings_transfer(
    context: TransactionApiContext,
    headers: dict[str, str],
    from_account_id: object,
    savings_goal_id: object,
    amount: str,
    transaction_at: str,
    description: str | None = None,
    idempotency_key: str | None = None,
) -> dict[str, object]:
    payload: dict[str, object] = {
        "from_account_id": from_account_id,
        "savings_goal_id": savings_goal_id,
        "amount": amount,
        "transaction_at": transaction_at,
    }
    if description is not None:
        payload["description"] = description

    request_headers = dict(headers)
    if idempotency_key is not None:
        request_headers["Idempotency-Key"] = idempotency_key

    response = context.client.post(
        "/api/v1/transactions/savings-transfers",
        headers=request_headers,
        json=payload,
    )
    assert response.status_code == 201
    return dict(response.json())


async def fetch_signed_transaction_total(
    database_url: str,
    transaction_ids: set[uuid.UUID],
) -> Decimal:
    engine = build_async_engine(database_url)
    session_factory = build_session_factory(engine)

    try:
        async with session_factory() as session:
            result = await session.execute(
                select(Transaction).where(
                    Transaction.id.in_(transaction_ids),
                    Transaction.voided_at.is_(None),
                )
            )
            total = Decimal("0")
            for transaction in result.scalars():
                if transaction.type == "income":
                    total += transaction.amount
                elif transaction.type == "expense":
                    total -= transaction.amount
            return total
    finally:
        await engine.dispose()


async def fetch_transfer_source_records(
    database_url: str,
    transfer_id: uuid.UUID,
    debit_transaction_id: uuid.UUID,
    credit_transaction_id: uuid.UUID,
) -> dict[str, object]:
    engine = build_async_engine(database_url)
    session_factory = build_session_factory(engine)

    try:
        async with session_factory() as session:
            transfer_link = await session.get(TransferLink, transfer_id)
            debit_transaction = await session.get(Transaction, debit_transaction_id)
            credit_transaction = await session.get(Transaction, credit_transaction_id)
            assert transfer_link is not None
            assert debit_transaction is not None
            assert credit_transaction is not None
            return {
                "link_amount": transfer_link.amount,
                "link_currency": transfer_link.currency,
                "debit_type": debit_transaction.type,
                "credit_type": credit_transaction.type,
                "debit_amount": debit_transaction.amount,
                "credit_amount": credit_transaction.amount,
                "debit_account_id": debit_transaction.account_id,
                "credit_account_id": credit_transaction.account_id,
                "debit_category_id": debit_transaction.category_id,
                "credit_category_id": credit_transaction.category_id,
            }
    finally:
        await engine.dispose()


async def fetch_savings_transfer_source_records(
    database_url: str,
    debit_transaction_id: uuid.UUID,
    contribution_id: uuid.UUID,
) -> dict[str, object]:
    engine = build_async_engine(database_url)
    session_factory = build_session_factory(engine)

    try:
        async with session_factory() as session:
            debit_transaction = await session.get(Transaction, debit_transaction_id)
            contribution = await session.get(SavingsContribution, contribution_id)
            assert debit_transaction is not None
            assert contribution is not None
            return {
                "debit_type": debit_transaction.type,
                "debit_amount": debit_transaction.amount,
                "debit_account_id": debit_transaction.account_id,
                "debit_category_id": debit_transaction.category_id,
                "contribution_goal_id": contribution.goal_id,
                "contribution_amount": contribution.amount,
                "contribution_currency": contribution.currency,
                "contribution_note": contribution.note,
            }
    finally:
        await engine.dispose()


class FailingTransferRepository(TransactionRepository):
    async def create_transfer_link(self, transfer_link: TransferLink) -> TransferLink:
        raise RuntimeError("forced transfer link failure")


async def assert_failing_transfer_rolls_back(
    database_url: str,
    email: str,
    from_account_id: uuid.UUID,
    to_account_id: uuid.UUID,
) -> None:
    engine = build_async_engine(database_url)
    session_factory = build_session_factory(engine)

    try:
        async with session_factory() as session:
            user_result = await session.execute(select(User).where(User.email == email))
            user = user_result.scalar_one()
            user_id = user.id
            service = TransactionService(
                transactions=FailingTransferRepository(session),
                accounts=AccountRepository(session),
                categories=CategoryRepository(session),
            )

            with pytest.raises(RuntimeError, match="forced transfer link failure"):
                await service.create_transfer(
                    TransferCreateRequest(
                        from_account_id=from_account_id,
                        to_account_id=to_account_id,
                        amount=Decimal("12.5000"),
                        transaction_at="2026-04-04T00:00:00+00:00",
                    ),
                    user,
                )

            transaction_count_result = await session.execute(
                select(func.count())
                .select_from(Transaction)
                .where(
                    Transaction.user_id == user_id,
                    Transaction.type.in_(("transfer_debit", "transfer_credit")),
                )
            )
            transfer_link_count_result = await session.execute(
                select(func.count())
                .select_from(TransferLink)
                .where(TransferLink.user_id == user_id)
            )
            assert transaction_count_result.scalar_one() == 0
            assert transfer_link_count_result.scalar_one() == 0
    finally:
        await engine.dispose()


class FailingSavingsRepository(SavingsRepository):
    async def create_contribution(
        self,
        contribution: SavingsContribution,
    ) -> SavingsContribution:
        raise RuntimeError("forced savings contribution failure")


async def assert_failing_savings_transfer_rolls_back(
    database_url: str,
    email: str,
    from_account_id: uuid.UUID,
    savings_goal_id: uuid.UUID,
) -> None:
    engine = build_async_engine(database_url)
    session_factory = build_session_factory(engine)

    try:
        async with session_factory() as session:
            user_result = await session.execute(select(User).where(User.email == email))
            user = user_result.scalar_one()
            user_id = user.id
            service = TransactionService(
                transactions=TransactionRepository(session),
                accounts=AccountRepository(session),
                categories=CategoryRepository(session),
                savings=FailingSavingsRepository(session),
            )

            with pytest.raises(
                RuntimeError,
                match="forced savings contribution failure",
            ):
                await service.create_savings_transfer(
                    SavingsTransferCreateRequest(
                        from_account_id=from_account_id,
                        savings_goal_id=savings_goal_id,
                        amount=Decimal("12.5000"),
                        transaction_at=datetime(2026, 4, 7, tzinfo=UTC),
                    ),
                    user,
                )

            transaction_count_result = await session.execute(
                select(func.count())
                .select_from(Transaction)
                .where(
                    Transaction.user_id == user_id,
                    Transaction.type == "transfer_debit",
                )
            )
            contribution_count_result = await session.execute(
                select(func.count())
                .select_from(SavingsContribution)
                .where(SavingsContribution.user_id == user_id)
            )
            assert transaction_count_result.scalar_one() == 0
            assert contribution_count_result.scalar_one() == 0
    finally:
        await engine.dispose()
