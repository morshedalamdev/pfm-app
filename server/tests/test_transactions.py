from __future__ import annotations

import asyncio
import uuid
from collections.abc import Iterator
from dataclasses import dataclass
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
from app.modules.transactions.models import Transaction, TransferLink
from app.modules.transactions.repositories import TransactionRepository
from app.modules.transactions.schemas import TransferCreateRequest
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


def test_transaction_ownership_and_archived_reference_rejection(
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
    assert transfer["description"] == "Move to savings"
    assert transfer["debit_transaction_id"] != transfer["credit_transaction_id"]

    detail_response = context.client.get(
        f"/api/v1/transactions/transfers/{transfer['id']}",
        headers=headers,
    )
    assert detail_response.status_code == 200
    assert detail_response.json() == transfer

    list_response = context.client.get("/api/v1/transactions", headers=headers)
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

    currency_mismatch_response = context.client.post(
        "/api/v1/transactions/transfers",
        headers=owner_headers,
        json={
            "from_account_id": checking["id"],
            "to_account_id": eur_wallet["id"],
            "amount": "1.0000",
            "transaction_at": "2026-04-02T00:00:00+00:00",
        },
    )
    assert currency_mismatch_response.status_code == 422

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

    response = context.client.post(
        "/api/v1/transactions",
        headers=headers,
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
) -> dict[str, object]:
    payload: dict[str, object] = {
        "from_account_id": from_account_id,
        "to_account_id": to_account_id,
        "amount": amount,
        "transaction_at": transaction_at,
    }
    if description is not None:
        payload["description"] = description

    response = context.client.post(
        "/api/v1/transactions/transfers",
        headers=headers,
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
