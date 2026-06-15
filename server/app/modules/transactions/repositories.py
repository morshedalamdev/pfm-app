from __future__ import annotations

import uuid

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.transactions.models import Transaction


class TransactionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, transaction: Transaction) -> Transaction:
        self._session.add(transaction)
        await self._session.flush()
        return transaction

    async def refresh(self, transaction: Transaction) -> None:
        await self._session.refresh(transaction)

    async def get_owned(
        self,
        transaction_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Transaction | None:
        result = await self._session.execute(
            select(Transaction).where(
                Transaction.id == transaction_id,
                Transaction.user_id == user_id,
                Transaction.type.in_(("income", "expense")),
            )
        )
        return result.scalar_one_or_none()

    async def list_owned_income_expense(self, user_id: uuid.UUID) -> list[Transaction]:
        result = await self._session.execute(
            select(Transaction)
            .where(
                Transaction.user_id == user_id,
                Transaction.type.in_(("income", "expense")),
                Transaction.voided_at.is_(None),
            )
            .order_by(desc(Transaction.transaction_at), desc(Transaction.created_at))
        )
        return list(result.scalars().all())

    async def commit(self) -> None:
        await self._session.commit()

    async def rollback(self) -> None:
        await self._session.rollback()
