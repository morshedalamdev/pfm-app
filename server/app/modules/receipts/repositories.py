from __future__ import annotations

import uuid

from sqlalchemy import Select, and_, desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.receipts.models import Receipt
from app.modules.receipts.pagination import ReceiptPageCursor
from app.modules.transactions.models import Transaction


class ReceiptRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, receipt: Receipt) -> Receipt:
        self._session.add(receipt)
        await self._session.flush()
        return receipt

    async def refresh(self, receipt: Receipt) -> None:
        await self._session.refresh(receipt)

    async def get_active_owned(
        self,
        receipt_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Receipt | None:
        result = await self._session.execute(
            select(Receipt).where(
                Receipt.id == receipt_id,
                Receipt.user_id == user_id,
                Receipt.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def list_active_owned(
        self,
        user_id: uuid.UUID,
        *,
        cursor: ReceiptPageCursor | None,
        limit: int,
        transaction_id: uuid.UUID | None,
    ) -> list[Receipt]:
        query = select(Receipt).where(
            Receipt.user_id == user_id,
            Receipt.deleted_at.is_(None),
        )
        if transaction_id is not None:
            query = query.where(Receipt.transaction_id == transaction_id)
        query = apply_receipt_cursor(query, cursor)
        result = await self._session.execute(
            query.order_by(desc(Receipt.created_at), desc(Receipt.id)).limit(limit)
        )
        return list(result.scalars().all())

    async def get_owned_transaction(
        self,
        transaction_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Transaction | None:
        result = await self._session.execute(
            select(Transaction).where(
                Transaction.id == transaction_id,
                Transaction.user_id == user_id,
                Transaction.voided_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def commit(self) -> None:
        await self._session.commit()

    async def rollback(self) -> None:
        await self._session.rollback()


def apply_receipt_cursor(
    query: Select[tuple[Receipt]],
    cursor: ReceiptPageCursor | None,
) -> Select[tuple[Receipt]]:
    if cursor is None:
        return query

    return query.where(
        or_(
            Receipt.created_at < cursor.created_at,
            and_(
                Receipt.created_at == cursor.created_at,
                Receipt.id < cursor.id,
            ),
        )
    )
