from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Executable

from app.modules.accounts.models import Account
from app.modules.transactions.models import Transaction

ZERO_AMOUNT = Decimal("0.0000")


class ReportRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def calculate_active_available_balance(self, user_id: uuid.UUID) -> Decimal:
        opening_balance = await self.scalar_decimal(
            select(func.coalesce(func.sum(Account.opening_balance), ZERO_AMOUNT)).where(
                Account.user_id == user_id,
                Account.archived_at.is_(None),
            )
        )
        transaction_balance = await self.scalar_decimal(
            select(
                func.coalesce(
                    func.sum(
                        case(
                            (
                                Transaction.type.in_(("income", "transfer_credit")),
                                Transaction.amount,
                            ),
                            (
                                Transaction.type.in_(("expense", "transfer_debit")),
                                -Transaction.amount,
                            ),
                            else_=ZERO_AMOUNT,
                        )
                    ),
                    ZERO_AMOUNT,
                )
            )
            .join(
                Account,
                (Account.id == Transaction.account_id)
                & (Account.user_id == Transaction.user_id),
            )
            .where(
                Transaction.user_id == user_id,
                Transaction.voided_at.is_(None),
                Account.archived_at.is_(None),
            )
        )
        return opening_balance + transaction_balance

    async def calculate_period_income_expense(
        self,
        user_id: uuid.UUID,
        *,
        start_at: datetime,
        end_at: datetime,
    ) -> tuple[Decimal, Decimal]:
        result = await self._session.execute(
            select(
                func.coalesce(
                    func.sum(
                        case(
                            (Transaction.type == "income", Transaction.amount),
                            else_=ZERO_AMOUNT,
                        )
                    ),
                    ZERO_AMOUNT,
                ),
                func.coalesce(
                    func.sum(
                        case(
                            (Transaction.type == "expense", Transaction.amount),
                            else_=ZERO_AMOUNT,
                        )
                    ),
                    ZERO_AMOUNT,
                ),
            ).where(
                Transaction.user_id == user_id,
                Transaction.voided_at.is_(None),
                Transaction.transaction_at >= start_at,
                Transaction.transaction_at < end_at,
            )
        )
        income_amount, expense_amount = result.one()
        return decimal_from_result(income_amount), decimal_from_result(expense_amount)

    async def calculate_bucket_amount(
        self,
        user_id: uuid.UUID,
        *,
        transaction_type: str,
        start_at: datetime,
        end_at: datetime,
    ) -> Decimal:
        return await self.scalar_decimal(
            select(func.coalesce(func.sum(Transaction.amount), ZERO_AMOUNT)).where(
                Transaction.user_id == user_id,
                Transaction.voided_at.is_(None),
                Transaction.type == transaction_type,
                Transaction.transaction_at >= start_at,
                Transaction.transaction_at < end_at,
            )
        )

    async def scalar_decimal(self, statement: Executable) -> Decimal:
        result = await self._session.execute(statement)
        return decimal_from_result(result.scalar_one())


def decimal_from_result(value: object) -> Decimal:
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))
