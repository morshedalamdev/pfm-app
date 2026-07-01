from __future__ import annotations

import asyncio
import logging
import socket
import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.modules.outbox.models import OutboxEvent
from app.modules.outbox.repositories import OutboxEventRepository

LOGGER = logging.getLogger(__name__)
DEFAULT_OUTBOX_BATCH_SIZE = 25
DEFAULT_OUTBOX_LOCK_SECONDS = 60
DEFAULT_OUTBOX_MAX_BACKOFF_SECONDS = 300
DEFAULT_OUTBOX_POLL_SECONDS = 30.0
OutboxEventHandler = Callable[[AsyncSession, OutboxEvent], Awaitable[None]]


@dataclass(frozen=True)
class OutboxWorkerResult:
    claimed: int
    processed: int
    retried: int
    failed: int


class OutboxWorker:
    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        *,
        handler: OutboxEventHandler,
        worker_id: str | None = None,
        batch_size: int = DEFAULT_OUTBOX_BATCH_SIZE,
        lock_seconds: int = DEFAULT_OUTBOX_LOCK_SECONDS,
        max_backoff_seconds: int = DEFAULT_OUTBOX_MAX_BACKOFF_SECONDS,
        event_types: set[str] | None = None,
    ) -> None:
        self.session_factory = session_factory
        self.handler = handler
        self.worker_id = worker_id or build_outbox_worker_id()
        self.batch_size = batch_size
        self.lock_seconds = lock_seconds
        self.max_backoff_seconds = max_backoff_seconds
        self.event_types = event_types

    async def run_once(self, *, now: datetime | None = None) -> OutboxWorkerResult:
        effective_now = normalize_utc(now or datetime.now(UTC))
        claimed_events = await self.claim_events(effective_now)
        processed = 0
        retried = 0
        failed = 0
        for event in claimed_events:
            try:
                await self.process_event(event.id, effective_now)
                processed += 1
            except Exception as exc:
                terminal = await self.record_failure(event.id, effective_now, exc)
                if terminal:
                    failed += 1
                else:
                    retried += 1
        return OutboxWorkerResult(
            claimed=len(claimed_events),
            processed=processed,
            retried=retried,
            failed=failed,
        )

    async def poll_forever(
        self,
        *,
        poll_seconds: float = DEFAULT_OUTBOX_POLL_SECONDS,
    ) -> None:
        while True:
            result = await self.run_once()
            LOGGER.info(
                "outbox_worker_tick",
                extra={
                    "worker_id": self.worker_id,
                    "claimed": result.claimed,
                    "processed": result.processed,
                    "retried": result.retried,
                    "failed": result.failed,
                },
            )
            await asyncio.sleep(poll_seconds)

    async def claim_events(self, now: datetime) -> list[OutboxEvent]:
        lock_until = now + timedelta(seconds=self.lock_seconds)
        async with self.session_factory() as session:
            outbox = OutboxEventRepository(session)
            events = await outbox.claim_available(
                worker_id=self.worker_id,
                now=now,
                lock_until=lock_until,
                batch_size=self.batch_size,
                event_types=self.event_types,
            )
            await session.commit()
            return events

    async def process_event(self, event_id: uuid.UUID, now: datetime) -> None:
        async with self.session_factory() as session:
            outbox = OutboxEventRepository(session)
            event = await outbox.get_locked_by_id(event_id)
            if event is None or event.status != "processing":
                await session.rollback()
                return
            try:
                await self.handler(session, event)
                event.status = "processed"
                event.processed_at = now
                event.error_type = None
                event.error_message = None
                clear_event_lock(event)
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    async def record_failure(
        self,
        event_id: uuid.UUID,
        now: datetime,
        exc: Exception,
    ) -> bool:
        async with self.session_factory() as session:
            outbox = OutboxEventRepository(session)
            event = await outbox.get_locked_by_id(event_id)
            if event is None:
                await session.rollback()
                return False
            terminal = event.attempts >= event.max_attempts
            event.status = "failed" if terminal else "pending"
            event.available_at = (
                now
                if terminal
                else now
                + retry_backoff(
                    event.attempts,
                    max_seconds=self.max_backoff_seconds,
                )
            )
            event.error_type = type(exc).__name__[:120]
            event.error_message = str(exc)[:2000]
            clear_event_lock(event)
            await session.commit()
            return terminal


def retry_backoff(attempts: int, *, max_seconds: int) -> timedelta:
    retry_seconds = min(2 ** max(attempts - 1, 0), max_seconds)
    return timedelta(seconds=retry_seconds)


def clear_event_lock(event: OutboxEvent) -> None:
    event.locked_by = None
    event.locked_at = None
    event.locked_until = None


def normalize_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def build_outbox_worker_id() -> str:
    return f"{socket.gethostname()}:outbox-worker"
