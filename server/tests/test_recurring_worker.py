from __future__ import annotations

import asyncio
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
from sqlalchemy.ext.asyncio import AsyncEngine

from alembic import command
from app.core.config import Settings
from app.core.database import (
    build_async_engine,
    build_session_factory,
    get_session,
    get_session_from_factory,
)
from app.main import create_app
from app.modules.outbox.models import OutboxEvent
from app.modules.recurring.models import RecurringRule
from app.modules.transactions.models import Transaction
from app.workers.recurring import RecurringWorker, claim_due_recurring_rules


@dataclass(frozen=True)
class WorkerTestContext:
    client: TestClient
    database_url: str
    engine: AsyncEngine


def build_alembic_config(database_url: str) -> Config:
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def worker_test_app(database_url: str) -> FastAPI:
    return create_app(
        Settings(
            app_name="PFM Worker Test API",
            app_env="test",
            debug=False,
            cors_origins=["http://testserver"],
            database_url=database_url,
            access_token_secret_key="worker-test-secret-with-at-least-32-bytes",
        ),
    )


@pytest.fixture
def worker_context(disposable_postgres_url: str) -> Iterator[WorkerTestContext]:
    command.upgrade(build_alembic_config(disposable_postgres_url), "head")
    engine = build_async_engine(disposable_postgres_url)
    session_factory = build_session_factory(engine)
    app = worker_test_app(disposable_postgres_url)

    async def test_session() -> object:
        async for session in get_session_from_factory(session_factory):
            yield session

    app.dependency_overrides[get_session] = test_session

    try:
        with TestClient(app) as client:
            yield WorkerTestContext(
                client=client,
                database_url=disposable_postgres_url,
                engine=engine,
            )
    finally:
        asyncio.run(engine.dispose())


def test_recurring_worker_claim_uses_skip_locked(
    worker_context: WorkerTestContext,
) -> None:
    context = worker_context
    headers = auth_headers(context, "worker-lock@example.com")
    account = create_account(context, headers, "Worker Checking")
    category = create_category(context, headers, "Subscriptions", "expense")
    rule = create_recurring_rule(
        context,
        headers,
        account_id=account["id"],
        category_id=category["id"],
        start_at="2026-01-01T00:00:00+00:00",
    )

    async def exercise_claim_lock() -> None:
        now = datetime(2026, 1, 2, tzinfo=UTC)
        worker_engine = build_async_engine(context.database_url)
        worker_session_factory = build_session_factory(worker_engine)
        try:
            async with worker_session_factory() as first_session:
                first_claim = await claim_due_recurring_rules(
                    first_session,
                    worker_id="first-worker",
                    now=now,
                    batch_size=10,
                    lock_seconds=60,
                )
                assert len(first_claim) == 1

                async with worker_session_factory() as second_session:
                    second_claim = await claim_due_recurring_rules(
                        second_session,
                        worker_id="second-worker",
                        now=now,
                        batch_size=10,
                        lock_seconds=60,
                    )
                    assert second_claim == []
                    await second_session.rollback()

                await first_session.rollback()
        finally:
            await worker_engine.dispose()

    asyncio.run(exercise_claim_lock())
    archive_response = context.client.delete(
        f"/api/v1/recurring-rules/{rule['id']}",
        headers=headers,
    )
    assert archive_response.status_code == 200


def test_recurring_worker_concurrent_runs_create_one_transaction(
    worker_context: WorkerTestContext,
) -> None:
    context = worker_context
    headers = auth_headers(context, "worker-run@example.com")
    account = create_account(context, headers, "Worker Income Account")
    category = create_category(context, headers, "Salary", "income")
    rule = create_recurring_rule(
        context,
        headers,
        account_id=account["id"],
        category_id=category["id"],
        transaction_type="income",
        amount="250.0000",
        frequency="monthly",
        start_at="2026-01-31T09:00:00-05:00",
        timezone="America/New_York",
    )

    async def run_two_workers() -> tuple[int, int]:
        now = datetime(2026, 2, 1, 15, tzinfo=UTC)
        worker_engine = build_async_engine(context.database_url)
        worker_session_factory = build_session_factory(worker_engine)
        first_worker = RecurringWorker(
            worker_session_factory,
            worker_id="worker-one",
            batch_size=10,
        )
        second_worker = RecurringWorker(
            worker_session_factory,
            worker_id="worker-two",
            batch_size=10,
        )
        try:
            first_result, second_result = await asyncio.gather(
                first_worker.run_once(now=now),
                second_worker.run_once(now=now),
            )
            return first_result.created, second_result.created
        finally:
            await worker_engine.dispose()

    created_counts = asyncio.run(run_two_workers())
    assert sum(created_counts) == 1

    async def load_worker_effects() -> tuple[
        int, Transaction, RecurringRule, OutboxEvent
    ]:
        worker_engine = build_async_engine(context.database_url)
        worker_session_factory = build_session_factory(worker_engine)
        try:
            async with worker_session_factory() as session:
                count_result = await session.execute(
                    select(func.count(Transaction.id)).where(
                        Transaction.account_id == account["id"],
                        Transaction.category_id == category["id"],
                    )
                )
                transaction_result = await session.execute(
                    select(Transaction).where(Transaction.account_id == account["id"])
                )
                rule_result = await session.execute(
                    select(RecurringRule).where(RecurringRule.id == rule["id"])
                )
                outbox_result = await session.execute(select(OutboxEvent))
                return (
                    int(count_result.scalar_one()),
                    transaction_result.scalar_one(),
                    rule_result.scalar_one(),
                    outbox_result.scalar_one(),
                )
        finally:
            await worker_engine.dispose()

    transaction_count, transaction, updated_rule, outbox = asyncio.run(
        load_worker_effects()
    )
    assert transaction_count == 1
    assert transaction.type == "income"
    assert transaction.amount == Decimal("250.0000")
    assert transaction.transaction_at == datetime(2026, 1, 31, 14, tzinfo=UTC)
    assert updated_rule.run_count == 1
    assert updated_rule.last_run_key is not None
    assert updated_rule.next_run_at == datetime(2026, 2, 28, 14, tzinfo=UTC)
    assert updated_rule.locked_by is None
    assert updated_rule.locked_at is None
    assert updated_rule.locked_until is None
    assert outbox.event_type == "recurring.transaction.created"
    assert outbox.idempotency_key == updated_rule.last_run_key
    assert outbox.aggregate_id == transaction.id
    assert outbox.payload["recurring_rule_id"] == rule["id"]
    assert outbox.payload["transaction_id"] == str(transaction.id)


def auth_headers(context: WorkerTestContext, email: str) -> dict[str, str]:
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
    context: WorkerTestContext,
    headers: dict[str, str],
    name: str,
) -> dict[str, object]:
    response = context.client.post(
        "/api/v1/accounts",
        headers=headers,
        json={
            "name": name,
            "type": "bank",
            "opening_balance": "0",
        },
    )
    assert response.status_code == 201
    return dict(response.json())


def create_category(
    context: WorkerTestContext,
    headers: dict[str, str],
    name: str,
    kind: str,
) -> dict[str, object]:
    response = context.client.post(
        "/api/v1/categories",
        headers=headers,
        json={"name": name, "kind": kind, "icon_key": "tag"},
    )
    assert response.status_code == 201
    return dict(response.json())


def create_recurring_rule(
    context: WorkerTestContext,
    headers: dict[str, str],
    *,
    account_id: object,
    category_id: object,
    transaction_type: str = "expense",
    amount: str = "25.0000",
    frequency: str = "daily",
    interval_count: int = 1,
    timezone: str = "UTC",
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
            "frequency": frequency,
            "interval_count": interval_count,
            "timezone": timezone,
            "start_at": start_at,
        },
    )
    assert response.status_code == 201
    return dict(response.json())
