from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, date, datetime, time
from decimal import Decimal

from sqlalchemy import case, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Executable

from app.modules.accounts.models import Account
from app.modules.budgets.models import Budget
from app.modules.categories.models import Category
from app.modules.savings.models import SavingsContribution, SavingsGoal
from app.modules.transactions.models import Transaction

ZERO_AMOUNT = Decimal("0.0000")


@dataclass(frozen=True)
class CategoryExpenseAggregate:
    category_id: uuid.UUID | None
    category_name: str
    icon_key: str | None
    amount: Decimal
    transaction_count: int


@dataclass(frozen=True)
class BudgetAggregate:
    category_id: uuid.UUID | None
    limit_amount: Decimal
    spent_amount: Decimal


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
                Transaction.type.in_(("income", "expense")),
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

    async def calculate_savings_contributions(
        self,
        user_id: uuid.UUID,
        *,
        start_at: datetime,
        end_at: datetime,
    ) -> Decimal:
        return await self.scalar_decimal(
            select(
                func.coalesce(func.sum(SavingsContribution.amount), ZERO_AMOUNT)
            ).where(
                SavingsContribution.user_id == user_id,
                SavingsContribution.contributed_at >= start_at,
                SavingsContribution.contributed_at < end_at,
            )
        )

    async def count_active_savings_goals(self, user_id: uuid.UUID) -> int:
        result = await self._session.execute(
            select(func.count())
            .select_from(SavingsGoal)
            .where(
                SavingsGoal.user_id == user_id,
                SavingsGoal.status == "active",
            )
        )
        return int(result.scalar_one())

    async def calculate_expense_amount(
        self,
        user_id: uuid.UUID,
        *,
        start_at: datetime,
        end_at: datetime,
    ) -> Decimal:
        return await self.calculate_bucket_amount(
            user_id,
            transaction_type="expense",
            start_at=start_at,
            end_at=end_at,
        )

    async def list_expense_category_aggregates(
        self,
        user_id: uuid.UUID,
        *,
        start_at: datetime,
        end_at: datetime,
        limit: int | None = None,
    ) -> list[CategoryExpenseAggregate]:
        amount_sum = func.coalesce(func.sum(Transaction.amount), ZERO_AMOUNT)
        statement = (
            select(
                Transaction.category_id,
                func.coalesce(Category.name, "Uncategorized"),
                Category.icon_key,
                amount_sum,
                func.count(Transaction.id),
            )
            .outerjoin(
                Category,
                (Category.id == Transaction.category_id)
                & (Category.user_id == Transaction.user_id),
            )
            .where(
                Transaction.user_id == user_id,
                Transaction.type == "expense",
                Transaction.voided_at.is_(None),
                Transaction.transaction_at >= start_at,
                Transaction.transaction_at < end_at,
            )
            .group_by(Transaction.category_id, Category.name, Category.icon_key)
            .order_by(desc(amount_sum), desc(func.count(Transaction.id)))
        )
        if limit is not None:
            statement = statement.limit(limit)

        result = await self._session.execute(statement)
        return [
            CategoryExpenseAggregate(
                category_id=category_id,
                category_name=category_name,
                icon_key=icon_key,
                amount=decimal_from_result(amount),
                transaction_count=int(transaction_count),
            )
            for (
                category_id,
                category_name,
                icon_key,
                amount,
                transaction_count,
            ) in result.all()
        ]

    async def list_budget_aggregates_for_month(
        self,
        user_id: uuid.UUID,
        *,
        month_start: date,
        month_end: date,
    ) -> list[BudgetAggregate]:
        result = await self._session.execute(
            select(Budget).where(
                Budget.user_id == user_id,
                Budget.archived_at.is_(None),
                Budget.period_start < month_end,
                Budget.period_end > month_start,
            )
        )
        budgets = list(result.scalars().all())
        return [
            BudgetAggregate(
                category_id=budget.category_id,
                limit_amount=budget.limit_amount,
                spent_amount=await self.calculate_budget_spent_amount(budget),
            )
            for budget in budgets
        ]

    async def calculate_budget_spent_amount(self, budget: Budget) -> Decimal:
        start_at = datetime.combine(budget.period_start, time.min, tzinfo=UTC)
        end_at = datetime.combine(budget.period_end, time.min, tzinfo=UTC)
        statement = select(
            func.coalesce(func.sum(Transaction.amount), ZERO_AMOUNT)
        ).where(
            Transaction.user_id == budget.user_id,
            Transaction.type == "expense",
            Transaction.currency == budget.currency,
            Transaction.voided_at.is_(None),
            Transaction.transaction_at >= start_at,
            Transaction.transaction_at < end_at,
        )
        if budget.category_id is not None:
            statement = statement.where(Transaction.category_id == budget.category_id)
        return await self.scalar_decimal(statement)

    async def scalar_decimal(self, statement: Executable) -> Decimal:
        result = await self._session.execute(statement)
        return decimal_from_result(result.scalar_one())


def decimal_from_result(value: object) -> Decimal:
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))
