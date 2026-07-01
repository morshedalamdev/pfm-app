from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Select, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.outbox.models import OutboxEvent


class OutboxEventRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, event: OutboxEvent) -> OutboxEvent:
        self._session.add(event)
        await self._session.flush()
        return event

    async def get_by_event_key(
        self,
        *,
        event_type: str,
        idempotency_key: str,
    ) -> OutboxEvent | None:
        result = await self._session.execute(
            select(OutboxEvent).where(
                OutboxEvent.event_type == event_type,
                OutboxEvent.idempotency_key == idempotency_key,
            )
        )
        return result.scalar_one_or_none()

    async def get_locked_by_id(self, event_id: uuid.UUID) -> OutboxEvent | None:
        result = await self._session.execute(
            select(OutboxEvent).where(OutboxEvent.id == event_id).with_for_update()
        )
        return result.scalar_one_or_none()

    async def claim_available(
        self,
        *,
        worker_id: str,
        now: datetime,
        lock_until: datetime,
        batch_size: int,
        event_types: set[str] | None = None,
    ) -> list[OutboxEvent]:
        query: Select[tuple[OutboxEvent]] = (
            select(OutboxEvent)
            .where(
                OutboxEvent.available_at <= now,
                OutboxEvent.status.in_(("pending", "processing")),
                OutboxEvent.attempts < OutboxEvent.max_attempts,
                or_(
                    OutboxEvent.status == "pending",
                    OutboxEvent.locked_until.is_(None),
                    OutboxEvent.locked_until <= now,
                ),
            )
            .order_by(OutboxEvent.available_at, OutboxEvent.id)
            .limit(batch_size)
            .with_for_update(skip_locked=True)
        )
        if event_types is not None:
            query = query.where(OutboxEvent.event_type.in_(event_types))
        result = await self._session.execute(query)
        events = list(result.scalars().all())
        for event in events:
            event.status = "processing"
            event.attempts += 1
            event.locked_by = worker_id
            event.locked_at = now
            event.locked_until = lock_until
        await self._session.flush()
        return events
