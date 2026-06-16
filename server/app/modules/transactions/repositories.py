from __future__ import annotations

import uuid

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.transactions.models import Transaction, TransferLink


class TransactionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, transaction: Transaction) -> Transaction:
        self._session.add(transaction)
        await self._session.flush()
        return transaction

    async def create_transfer_link(self, transfer_link: TransferLink) -> TransferLink:
        self._session.add(transfer_link)
        await self._session.flush()
        return transfer_link

    async def refresh(self, transaction: Transaction) -> None:
        await self._session.refresh(transaction)

    async def refresh_transfer_link(self, transfer_link: TransferLink) -> None:
        await self._session.refresh(transfer_link)

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

    async def get_owned_transfer(
        self,
        transfer_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> tuple[TransferLink, Transaction, Transaction] | None:
        link_result = await self._session.execute(
            select(TransferLink).where(
                TransferLink.id == transfer_id,
                TransferLink.user_id == user_id,
            )
        )
        transfer_link = link_result.scalar_one_or_none()
        if transfer_link is None:
            return None

        transaction_result = await self._session.execute(
            select(Transaction).where(
                Transaction.user_id == user_id,
                Transaction.id.in_(
                    (
                        transfer_link.debit_transaction_id,
                        transfer_link.credit_transaction_id,
                    )
                ),
            )
        )
        transactions_by_id = {
            transaction.id: transaction for transaction in transaction_result.scalars()
        }
        debit_transaction = transactions_by_id.get(transfer_link.debit_transaction_id)
        credit_transaction = transactions_by_id.get(transfer_link.credit_transaction_id)
        if debit_transaction is None or credit_transaction is None:
            return None
        return transfer_link, debit_transaction, credit_transaction

    async def commit(self) -> None:
        await self._session.commit()

    async def rollback(self) -> None:
        await self._session.rollback()
