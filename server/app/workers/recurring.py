from __future__ import annotations

import argparse
import asyncio
import logging
import socket
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import Settings, get_settings
from app.core.database import async_session_factory
from app.core.logging import configure_logging
from app.modules.outbox.models import OutboxEvent
from app.modules.outbox.repositories import OutboxEventRepository
from app.modules.recurring.models import RecurringRule
from app.modules.recurring.schedule import (
    calculate_next_run_after,
    validate_schedule_bounds,
)
from app.modules.transactions.models import Transaction
from app.modules.transactions.repositories import TransactionRepository

LOGGER = logging.getLogger(__name__)
DEFAULT_BATCH_SIZE = 25
DEFAULT_LOCK_SECONDS = 60
DEFAULT_POLL_SECONDS = 30.0


@dataclass(frozen=True)
class RecurringWorkerResult:
    claimed: int
    created: int
    skipped: int


class RecurringWorker:
    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        *,
        worker_id: str | None = None,
        batch_size: int = DEFAULT_BATCH_SIZE,
        lock_seconds: int = DEFAULT_LOCK_SECONDS,
    ) -> None:
        self.session_factory = session_factory
        self.worker_id = worker_id or build_worker_id()
        self.batch_size = batch_size
        self.lock_seconds = lock_seconds

    async def run_once(self, *, now: datetime | None = None) -> RecurringWorkerResult:
        effective_now = normalize_utc(now or datetime.now(UTC))
        async with self.session_factory() as session:
            claimed_rules = await claim_due_recurring_rules(
                session,
                worker_id=self.worker_id,
                now=effective_now,
                batch_size=self.batch_size,
                lock_seconds=self.lock_seconds,
            )
            created = 0
            try:
                transactions = TransactionRepository(session)
                outbox = OutboxEventRepository(session)
                skipped = 0
                for rule in claimed_rules:
                    transaction = await process_claimed_rule(
                        rule,
                        now=effective_now,
                        transactions=transactions,
                        outbox=outbox,
                    )
                    if transaction is None:
                        skipped += 1
                    else:
                        created += 1
                await session.commit()
            except Exception:
                await session.rollback()
                raise
        return RecurringWorkerResult(
            claimed=len(claimed_rules),
            created=created,
            skipped=skipped,
        )

    async def poll_forever(
        self,
        *,
        poll_seconds: float = DEFAULT_POLL_SECONDS,
    ) -> None:
        while True:
            result = await self.run_once()
            LOGGER.info(
                "recurring_worker_tick",
                extra={
                    "worker_id": self.worker_id,
                    "claimed": result.claimed,
                    "transactions_created": result.created,
                    "skipped": result.skipped,
                },
            )
            await asyncio.sleep(poll_seconds)


async def claim_due_recurring_rules(
    session: AsyncSession,
    *,
    worker_id: str,
    now: datetime,
    batch_size: int,
    lock_seconds: int,
) -> Sequence[RecurringRule]:
    # Income and expense rules are confirmation reminders. Neither supported
    # transaction type may be materialized automatically by the worker.
    return []


async def process_claimed_rule(
    rule: RecurringRule,
    *,
    now: datetime,
    transactions: TransactionRepository,
    outbox: OutboxEventRepository,
) -> Transaction | None:
    due_at = normalize_utc(rule.next_run_at)
    run_key = build_run_key(rule, due_at)
    existing_event = await outbox.get_by_event_key(
        event_type="recurring.transaction.created",
        idempotency_key=run_key,
    )
    if existing_event is not None:
        advance_rule_after_success(rule, due_at=due_at, run_key=run_key, now=now)
        return None

    transaction = Transaction(
        user_id=rule.user_id,
        account_id=rule.account_id,
        category_id=rule.category_id,
        type=rule.transaction_type,
        amount=rule.amount,
        currency=rule.currency,
        transaction_at=due_at,
        description=rule.description,
    )
    await transactions.create(transaction)
    advance_rule_after_success(rule, due_at=due_at, run_key=run_key, now=now)

    await outbox.create(
        OutboxEvent(
            user_id=rule.user_id,
            event_type="recurring.transaction.created",
            aggregate_type="transaction",
            aggregate_id=transaction.id,
            idempotency_key=run_key,
            payload={
                "recurring_rule_id": str(rule.id),
                "transaction_id": str(transaction.id),
                "run_at": due_at.isoformat(),
            },
            status="pending",
            available_at=now,
        )
    )
    return transaction


def advance_rule_after_success(
    rule: RecurringRule,
    *,
    due_at: datetime,
    run_key: str,
    now: datetime,
) -> None:
    next_run_at = calculate_next_run_after(
        start_at=rule.start_at,
        frequency=rule.frequency,
        interval_count=rule.interval_count,
        timezone=rule.timezone,
        after_at=due_at,
    )
    if rule.end_at is not None and next_run_at >= normalize_utc(rule.end_at):
        rule.status = "archived"
        rule.archived_at = now
    else:
        validate_schedule_bounds(
            start_at=rule.start_at,
            end_at=rule.end_at,
            next_run_at=next_run_at,
        )
        rule.next_run_at = next_run_at
    rule.last_run_at = due_at
    if rule.last_run_key != run_key:
        rule.last_run_key = run_key
        rule.run_count += 1
    clear_rule_lock(rule)


def clear_rule_lock(rule: RecurringRule) -> None:
    rule.locked_by = None
    rule.locked_at = None
    rule.locked_until = None


def build_run_key(rule: RecurringRule, due_at: datetime) -> str:
    return f"recurring-rule:{rule.id}:due-at:{due_at.isoformat()}"


def normalize_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def build_worker_id() -> str:
    return f"{socket.gethostname()}:recurring-worker"


def parse_args(
    argv: Sequence[str] | None = None,
    *,
    settings: Settings | None = None,
) -> argparse.Namespace:
    worker_settings = settings or get_settings()
    parser = argparse.ArgumentParser(
        description="Run the recurring transaction worker."
    )
    parser.add_argument(
        "--once", action="store_true", help="Run one worker tick and exit."
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=worker_settings.recurring_worker_batch_size,
    )
    parser.add_argument(
        "--lock-seconds",
        type=int,
        default=worker_settings.recurring_worker_lock_seconds,
    )
    parser.add_argument(
        "--poll-seconds",
        type=float,
        default=worker_settings.recurring_worker_poll_seconds,
    )
    parser.add_argument("--worker-id", type=str, default=None)
    return parser.parse_args(argv)


async def amain(settings: Settings | None = None) -> None:
    worker_settings = settings or get_settings()
    configure_logging(debug=worker_settings.debug)
    args = parse_args(settings=worker_settings)
    worker = RecurringWorker(
        async_session_factory,
        worker_id=args.worker_id,
        batch_size=args.batch_size,
        lock_seconds=args.lock_seconds,
    )
    if args.once:
        result = await worker.run_once()
        LOGGER.info(
            "recurring_worker_once_complete",
            extra={
                "claimed": result.claimed,
                "transactions_created": result.created,
                "skipped": result.skipped,
            },
        )
        return
    await worker.poll_forever(poll_seconds=args.poll_seconds)


def main() -> None:
    asyncio.run(amain())


if __name__ == "__main__":
    main()
