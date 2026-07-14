from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, time
from decimal import Decimal

from sqlalchemy import Select, and_, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.budgets.models import Budget
from app.modules.budgets.pagination import BudgetPageCursor
from app.modules.categories.models import Category
from app.modules.transactions.models import Transaction


class BudgetRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, budget: Budget) -> Budget:
        self._session.add(budget)
        await self._session.flush()
        return budget

    async def refresh(self, budget: Budget) -> None:
        await self._session.refresh(budget)

    async def get_owned(
        self,
        budget_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Budget | None:
        result = await self._session.execute(
            select(Budget).where(Budget.id == budget_id, Budget.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def list_owned(
        self,
        user_id: uuid.UUID,
        *,
        include_archived: bool,
        category_id: uuid.UUID | None,
        month_start: date | None,
        month_end: date | None,
        cursor: BudgetPageCursor | None,
        limit: int,
    ) -> list[Budget]:
        query = select(Budget).where(Budget.user_id == user_id)
        if not include_archived:
            query = query.where(Budget.archived_at.is_(None))
        if category_id is not None:
            query = query.where(Budget.category_id == category_id)
        if month_start is not None and month_end is not None:
            query = query.where(
                Budget.period_start < month_end,
                Budget.period_end > month_start,
            )
        query = apply_budget_cursor(query, cursor)
        result = await self._session.execute(
            query.order_by(desc(Budget.created_at), desc(Budget.id)).limit(limit)
        )
        return list(result.scalars().all())

    async def get_category_names(
        self,
        user_id: uuid.UUID,
        category_ids: set[uuid.UUID],
    ) -> dict[uuid.UUID, str]:
        if not category_ids:
            return {}

        result = await self._session.execute(
            select(Category.id, Category.name).where(
                Category.user_id == user_id,
                Category.id.in_(category_ids),
            )
        )
        return {category_id: name for category_id, name in result.all()}

    async def calculate_spent_amount(self, budget: Budget) -> Decimal:
        start_at = datetime.combine(budget.period_start, time.min, tzinfo=UTC)
        end_at = datetime.combine(budget.period_end, time.min, tzinfo=UTC)
        query = select(func.coalesce(func.sum(Transaction.amount), Decimal("0"))).where(
            Transaction.user_id == budget.user_id,
            Transaction.type == "expense",
            Transaction.currency == budget.currency,
            Transaction.voided_at.is_(None),
            Transaction.transaction_at >= start_at,
            Transaction.transaction_at < end_at,
        )
        if budget.category_id is not None:
            query = query.where(Transaction.category_id == budget.category_id)

        result = await self._session.execute(query)
        amount = result.scalar_one()
        if isinstance(amount, Decimal):
            return amount
        return Decimal(str(amount))

    async def commit(self) -> None:
        await self._session.commit()

    async def rollback(self) -> None:
        await self._session.rollback()


def apply_budget_cursor(
    query: Select[tuple[Budget]],
    cursor: BudgetPageCursor | None,
) -> Select[tuple[Budget]]:
    if cursor is None:
        return query

    return query.where(
        or_(
            Budget.created_at < cursor.created_at,
            and_(Budget.created_at == cursor.created_at, Budget.id < cursor.id),
        )
    )
