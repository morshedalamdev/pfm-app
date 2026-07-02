from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.idempotency.models import IdempotencyRecord


class IdempotencyRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, record: IdempotencyRecord) -> IdempotencyRecord:
        self._session.add(record)
        await self._session.flush()
        return record

    async def get(
        self,
        *,
        user_id: uuid.UUID,
        operation: str,
        idempotency_key: str,
    ) -> IdempotencyRecord | None:
        result = await self._session.execute(
            select(IdempotencyRecord).where(
                IdempotencyRecord.user_id == user_id,
                IdempotencyRecord.operation == operation,
                IdempotencyRecord.idempotency_key == idempotency_key,
            )
        )
        return result.scalar_one_or_none()
