from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.outbox.models import OutboxEvent


class OutboxEventRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, event: OutboxEvent) -> OutboxEvent:
        self._session.add(event)
        await self._session.flush()
        return event
