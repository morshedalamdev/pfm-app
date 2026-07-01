from __future__ import annotations

import asyncio
import uuid
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from pathlib import Path

import pytest
from alembic.config import Config
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from alembic import command
from app.api.v1.health import database_is_ready
from app.core.config import Settings
from app.core.database import (
    build_async_engine,
    build_session_factory,
    check_database_connection,
    get_session,
    get_session_from_factory,
)
from app.main import create_app
from app.modules.outbox.models import OutboxEvent
from app.modules.recurring.models import RecurringRule
from app.modules.transactions.models import Transaction
from app.workers.outbox import OutboxEventHandler, OutboxWorker, OutboxWorkerResult
from app.workers.recurring import (
    RecurringWorker,
    RecurringWorkerResult,
    claim_due_recurring_rules,
    parse_args,
)


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

    async def test_database_is_ready() -> bool:
        readiness_engine = build_async_engine(disposable_postgres_url)
        try:
            return await check_database_connection(readiness_engine)
        finally:
            await readiness_engine.dispose()

    app.dependency_overrides[get_session] = test_session
    app.dependency_overrides[database_is_ready] = test_database_is_ready

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

    duplicate_result = asyncio.run(reset_rule_and_rerun_worker(context, rule["id"]))
    assert duplicate_result.claimed == 1
    assert duplicate_result.created == 0
    assert duplicate_result.skipped == 1

    duplicate_count, duplicate_rule, duplicate_outbox_count = asyncio.run(
        load_duplicate_effects(context, account["id"], rule["id"])
    )
    assert duplicate_count == 1
    assert duplicate_rule.run_count == 1
    assert duplicate_rule.next_run_at == datetime(2026, 2, 28, 14, tzinfo=UTC)
    assert duplicate_outbox_count == 1


def test_outbox_worker_retries_with_rollback_then_processes(
    worker_context: WorkerTestContext,
) -> None:
    context = worker_context
    now = datetime(2026, 3, 1, tzinfo=UTC)
    event_id = asyncio.run(
        create_outbox_event(
            context,
            event_type="test.rollback",
            idempotency_key="rollback-retry",
            now=now,
            max_attempts=3,
        )
    )

    async def failing_handler(session: AsyncSession, event: OutboxEvent) -> None:
        session.add(
            OutboxEvent(
                event_type="test.rollback.marker",
                idempotency_key=f"marker-{event.id}",
                payload={},
                status="pending",
                available_at=now,
            )
        )
        raise RuntimeError("simulated side effect failure")

    first_result = asyncio.run(
        run_outbox_worker(
            context,
            failing_handler,
            now=now,
            worker_id="retry-one",
            event_type="test.rollback",
        )
    )
    assert first_result.claimed == 1
    assert first_result.processed == 0
    assert first_result.retried == 1
    assert first_result.failed == 0

    first_event = asyncio.run(load_outbox_event(context, event_id))
    assert first_event.status == "pending"
    assert first_event.attempts == 1
    assert first_event.available_at == now + timedelta(seconds=1)
    assert first_event.error_type == "RuntimeError"
    assert first_event.error_message == "simulated side effect failure"
    assert first_event.locked_by is None
    assert asyncio.run(count_outbox_events(context, "test.rollback.marker")) == 0

    async def successful_handler(session: AsyncSession, event: OutboxEvent) -> None:
        return None

    second_result = asyncio.run(
        run_outbox_worker(
            context,
            successful_handler,
            now=now + timedelta(seconds=1),
            worker_id="retry-two",
            event_type="test.rollback",
        )
    )
    assert second_result.claimed == 1
    assert second_result.processed == 1
    assert second_result.retried == 0
    assert second_result.failed == 0

    second_event = asyncio.run(load_outbox_event(context, event_id))
    assert second_event.status == "processed"
    assert second_event.attempts == 2
    assert second_event.processed_at == now + timedelta(seconds=1)
    assert second_event.error_type is None
    assert second_event.error_message is None
    assert second_event.locked_until is None


def test_outbox_worker_terminal_failure_after_bounded_retries(
    worker_context: WorkerTestContext,
) -> None:
    context = worker_context
    now = datetime(2026, 4, 1, tzinfo=UTC)
    event_id = asyncio.run(
        create_outbox_event(
            context,
            event_type="test.terminal",
            idempotency_key="terminal-failure",
            now=now,
            max_attempts=2,
        )
    )

    async def failing_handler(session: AsyncSession, event: OutboxEvent) -> None:
        raise ValueError("permanent failure")

    first_result = asyncio.run(
        run_outbox_worker(
            context,
            failing_handler,
            now=now,
            worker_id="terminal-one",
            event_type="test.terminal",
        )
    )
    assert first_result.retried == 1
    assert first_result.failed == 0

    second_result = asyncio.run(
        run_outbox_worker(
            context,
            failing_handler,
            now=now + timedelta(seconds=1),
            worker_id="terminal-two",
            event_type="test.terminal",
        )
    )
    assert second_result.claimed == 1
    assert second_result.processed == 0
    assert second_result.retried == 0
    assert second_result.failed == 1

    event = asyncio.run(load_outbox_event(context, event_id))
    assert event.status == "failed"
    assert event.attempts == 2
    assert event.available_at == now + timedelta(seconds=1)
    assert event.error_type == "ValueError"
    assert event.error_message == "permanent failure"
    assert event.locked_by is None
    assert event.locked_until is None


def test_recurring_worker_cli_defaults_use_settings() -> None:
    settings = Settings(
        app_env="test",
        recurring_worker_batch_size=7,
        recurring_worker_lock_seconds=45,
        recurring_worker_poll_seconds=2.5,
    )

    args = parse_args([], settings=settings)

    assert args.batch_size == 7
    assert args.lock_seconds == 45
    assert args.poll_seconds == 2.5
    assert args.worker_id is None


def test_recurring_worker_cli_overrides_settings() -> None:
    settings = Settings(
        app_env="test",
        recurring_worker_batch_size=7,
        recurring_worker_lock_seconds=45,
        recurring_worker_poll_seconds=2.5,
    )

    args = parse_args(
        [
            "--once",
            "--batch-size",
            "3",
            "--lock-seconds",
            "9",
            "--poll-seconds",
            "1",
            "--worker-id",
            "cli-worker",
        ],
        settings=settings,
    )

    assert args.once is True
    assert args.batch_size == 3
    assert args.lock_seconds == 9
    assert args.poll_seconds == 1
    assert args.worker_id == "cli-worker"


def test_api_readiness_and_worker_share_disposable_postgres(
    worker_context: WorkerTestContext,
) -> None:
    context = worker_context

    ready_response = context.client.get("/api/v1/health/ready")
    assert ready_response.status_code == 200
    assert ready_response.json() == {"status": "ok", "database": "ready"}

    async def run_empty_worker_tick() -> RecurringWorkerResult:
        worker_engine = build_async_engine(context.database_url)
        worker_session_factory = build_session_factory(worker_engine)
        worker = RecurringWorker(
            worker_session_factory,
            worker_id="operational-check-worker",
            batch_size=2,
            lock_seconds=30,
        )
        try:
            return await worker.run_once(now=datetime(2025, 1, 1, tzinfo=UTC))
        finally:
            await worker_engine.dispose()

    result = asyncio.run(run_empty_worker_tick())

    assert result.claimed == 0
    assert result.created == 0
    assert result.skipped == 0


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


async def reset_rule_and_rerun_worker(
    context: WorkerTestContext,
    rule_id: object,
) -> RecurringWorkerResult:
    worker_engine = build_async_engine(context.database_url)
    worker_session_factory = build_session_factory(worker_engine)
    try:
        async with worker_session_factory() as session:
            rule_result = await session.execute(
                select(RecurringRule).where(RecurringRule.id == rule_id)
            )
            rule = rule_result.scalar_one()
            rule.next_run_at = rule.last_run_at
            rule.status = "active"
            rule.archived_at = None
            await session.commit()

        worker = RecurringWorker(
            worker_session_factory,
            worker_id="duplicate-worker",
            batch_size=10,
        )
        return await worker.run_once(now=datetime(2026, 2, 1, 15, tzinfo=UTC))
    finally:
        await worker_engine.dispose()


async def load_duplicate_effects(
    context: WorkerTestContext,
    account_id: object,
    rule_id: object,
) -> tuple[int, RecurringRule, int]:
    worker_engine = build_async_engine(context.database_url)
    worker_session_factory = build_session_factory(worker_engine)
    try:
        async with worker_session_factory() as session:
            transaction_count_result = await session.execute(
                select(func.count(Transaction.id)).where(
                    Transaction.account_id == account_id
                )
            )
            rule_result = await session.execute(
                select(RecurringRule).where(RecurringRule.id == rule_id)
            )
            outbox_count_result = await session.execute(
                select(func.count(OutboxEvent.id)).where(
                    OutboxEvent.event_type == "recurring.transaction.created",
                    OutboxEvent.payload["recurring_rule_id"].astext == str(rule_id),
                )
            )
            return (
                int(transaction_count_result.scalar_one()),
                rule_result.scalar_one(),
                int(outbox_count_result.scalar_one()),
            )
    finally:
        await worker_engine.dispose()


async def create_outbox_event(
    context: WorkerTestContext,
    *,
    event_type: str,
    idempotency_key: str,
    now: datetime,
    max_attempts: int,
) -> uuid.UUID:
    worker_engine = build_async_engine(context.database_url)
    worker_session_factory = build_session_factory(worker_engine)
    try:
        async with worker_session_factory() as session:
            event = OutboxEvent(
                event_type=event_type,
                idempotency_key=idempotency_key,
                payload={},
                status="pending",
                max_attempts=max_attempts,
                available_at=now,
            )
            session.add(event)
            await session.flush()
            event_id = event.id
            await session.commit()
            return event_id
    finally:
        await worker_engine.dispose()


async def run_outbox_worker(
    context: WorkerTestContext,
    handler: OutboxEventHandler,
    *,
    now: datetime,
    worker_id: str,
    event_type: str,
) -> OutboxWorkerResult:
    worker_engine = build_async_engine(context.database_url)
    worker_session_factory = build_session_factory(worker_engine)
    try:
        worker = OutboxWorker(
            worker_session_factory,
            handler=handler,
            worker_id=worker_id,
            batch_size=10,
            event_types={event_type},
        )
        return await worker.run_once(now=now)
    finally:
        await worker_engine.dispose()


async def load_outbox_event(
    context: WorkerTestContext,
    event_id: object,
) -> OutboxEvent:
    worker_engine = build_async_engine(context.database_url)
    worker_session_factory = build_session_factory(worker_engine)
    try:
        async with worker_session_factory() as session:
            result = await session.execute(
                select(OutboxEvent).where(OutboxEvent.id == event_id)
            )
            return result.scalar_one()
    finally:
        await worker_engine.dispose()


async def count_outbox_events(context: WorkerTestContext, event_type: str) -> int:
    worker_engine = build_async_engine(context.database_url)
    worker_session_factory = build_session_factory(worker_engine)
    try:
        async with worker_session_factory() as session:
            result = await session.execute(
                select(func.count(OutboxEvent.id)).where(
                    OutboxEvent.event_type == event_type
                )
            )
            return int(result.scalar_one())
    finally:
        await worker_engine.dispose()


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
