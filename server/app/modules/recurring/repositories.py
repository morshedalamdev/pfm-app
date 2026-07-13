from __future__ import annotations

import uuid

from sqlalchemy import Select, and_, desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.recurring.models import RecurringRule
from app.modules.recurring.pagination import RecurringRulePageCursor


class RecurringRuleRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, rule: RecurringRule) -> RecurringRule:
        self._session.add(rule)
        await self._session.flush()
        return rule

    async def refresh(self, rule: RecurringRule) -> None:
        await self._session.refresh(rule)

    async def get_owned(
        self,
        rule_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> RecurringRule | None:
        result = await self._session.execute(
            select(RecurringRule).where(
                RecurringRule.id == rule_id,
                RecurringRule.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_owned_for_update(
        self,
        rule_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> RecurringRule | None:
        result = await self._session.execute(
            select(RecurringRule)
            .where(
                RecurringRule.id == rule_id,
                RecurringRule.user_id == user_id,
            )
            .with_for_update()
        )
        return result.scalar_one_or_none()

    async def list_owned(
        self,
        user_id: uuid.UUID,
        *,
        status_filter: str,
        cursor: RecurringRulePageCursor | None,
        limit: int,
    ) -> list[RecurringRule]:
        query = select(RecurringRule).where(RecurringRule.user_id == user_id)
        if status_filter == "all":
            query = query.where(RecurringRule.status != "archived")
        else:
            query = query.where(RecurringRule.status == status_filter)

        query = apply_recurring_rule_cursor(query, cursor)
        result = await self._session.execute(
            query.order_by(
                desc(RecurringRule.created_at), desc(RecurringRule.id)
            ).limit(limit)
        )
        return list(result.scalars().all())

    async def list_active_monthly_expenses(
        self,
        user_id: uuid.UUID,
    ) -> list[RecurringRule]:
        result = await self._session.execute(
            select(RecurringRule)
            .where(
                RecurringRule.user_id == user_id,
                RecurringRule.status == "active",
                RecurringRule.archived_at.is_(None),
                RecurringRule.transaction_type == "expense",
                RecurringRule.frequency == "monthly",
            )
            .order_by(RecurringRule.start_at, RecurringRule.id)
        )
        return list(result.scalars().all())

    async def list_active_monthly_incomes(
        self,
        user_id: uuid.UUID,
    ) -> list[RecurringRule]:
        result = await self._session.execute(
            select(RecurringRule)
            .where(
                RecurringRule.user_id == user_id,
                RecurringRule.status == "active",
                RecurringRule.archived_at.is_(None),
                RecurringRule.transaction_type == "income",
                RecurringRule.frequency == "monthly",
            )
            .order_by(RecurringRule.start_at, RecurringRule.id)
        )
        return list(result.scalars().all())

    async def commit(self) -> None:
        await self._session.commit()

    async def rollback(self) -> None:
        await self._session.rollback()


def apply_recurring_rule_cursor(
    query: Select[tuple[RecurringRule]],
    cursor: RecurringRulePageCursor | None,
) -> Select[tuple[RecurringRule]]:
    if cursor is None:
        return query

    return query.where(
        or_(
            RecurringRule.created_at < cursor.created_at,
            and_(
                RecurringRule.created_at == cursor.created_at,
                RecurringRule.id < cursor.id,
            ),
        )
    )
