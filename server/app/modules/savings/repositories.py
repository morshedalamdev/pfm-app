from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy import Select, and_, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.savings.models import SavingsContribution, SavingsGoal
from app.modules.savings.pagination import (
    SavingsContributionPageCursor,
    SavingsGoalPageCursor,
)


class SavingsRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create_goal(self, goal: SavingsGoal) -> SavingsGoal:
        self._session.add(goal)
        await self._session.flush()
        return goal

    async def create_contribution(
        self,
        contribution: SavingsContribution,
    ) -> SavingsContribution:
        self._session.add(contribution)
        await self._session.flush()
        return contribution

    async def refresh_goal(self, goal: SavingsGoal) -> None:
        await self._session.refresh(goal)

    async def refresh_contribution(self, contribution: SavingsContribution) -> None:
        await self._session.refresh(contribution)

    async def get_goal_owned(
        self,
        goal_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> SavingsGoal | None:
        result = await self._session.execute(
            select(SavingsGoal).where(
                SavingsGoal.id == goal_id,
                SavingsGoal.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_goals_owned(
        self,
        user_id: uuid.UUID,
        *,
        status_filter: str,
        cursor: SavingsGoalPageCursor | None,
        limit: int,
    ) -> list[SavingsGoal]:
        query = select(SavingsGoal).where(SavingsGoal.user_id == user_id)
        if status_filter == "all":
            query = query.where(SavingsGoal.status != "archived")
        else:
            query = query.where(SavingsGoal.status == status_filter)
        query = apply_goal_cursor(query, cursor)
        result = await self._session.execute(
            query.order_by(desc(SavingsGoal.created_at), desc(SavingsGoal.id)).limit(
                limit
            )
        )
        return list(result.scalars().all())

    async def list_contributions_owned(
        self,
        goal_id: uuid.UUID,
        user_id: uuid.UUID,
        *,
        cursor: SavingsContributionPageCursor | None,
        limit: int,
    ) -> list[SavingsContribution]:
        query = select(SavingsContribution).where(
            SavingsContribution.goal_id == goal_id,
            SavingsContribution.user_id == user_id,
        )
        query = apply_contribution_cursor(query, cursor)
        result = await self._session.execute(
            query.order_by(
                desc(SavingsContribution.contributed_at),
                desc(SavingsContribution.created_at),
                desc(SavingsContribution.id),
            ).limit(limit)
        )
        return list(result.scalars().all())

    async def calculate_saved_amount(
        self,
        goal_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Decimal:
        result = await self._session.execute(
            select(
                func.coalesce(func.sum(SavingsContribution.amount), Decimal("0"))
            ).where(
                SavingsContribution.goal_id == goal_id,
                SavingsContribution.user_id == user_id,
            )
        )
        amount = result.scalar_one()
        if isinstance(amount, Decimal):
            return amount
        return Decimal(str(amount))

    async def calculate_saved_amounts(
        self,
        user_id: uuid.UUID,
        goal_ids: set[uuid.UUID],
    ) -> dict[uuid.UUID, Decimal]:
        if not goal_ids:
            return {}

        result = await self._session.execute(
            select(SavingsContribution.goal_id, func.sum(SavingsContribution.amount))
            .where(
                SavingsContribution.user_id == user_id,
                SavingsContribution.goal_id.in_(goal_ids),
            )
            .group_by(SavingsContribution.goal_id)
        )
        return {
            goal_id: amount if isinstance(amount, Decimal) else Decimal(str(amount))
            for goal_id, amount in result.all()
        }

    async def commit(self) -> None:
        await self._session.commit()

    async def rollback(self) -> None:
        await self._session.rollback()


def apply_goal_cursor(
    query: Select[tuple[SavingsGoal]],
    cursor: SavingsGoalPageCursor | None,
) -> Select[tuple[SavingsGoal]]:
    if cursor is None:
        return query

    return query.where(
        or_(
            SavingsGoal.created_at < cursor.created_at,
            and_(
                SavingsGoal.created_at == cursor.created_at, SavingsGoal.id < cursor.id
            ),
        )
    )


def apply_contribution_cursor(
    query: Select[tuple[SavingsContribution]],
    cursor: SavingsContributionPageCursor | None,
) -> Select[tuple[SavingsContribution]]:
    if cursor is None:
        return query

    return query.where(
        or_(
            SavingsContribution.contributed_at < cursor.contributed_at,
            and_(
                SavingsContribution.contributed_at == cursor.contributed_at,
                SavingsContribution.created_at < cursor.created_at,
            ),
            and_(
                SavingsContribution.contributed_at == cursor.contributed_at,
                SavingsContribution.created_at == cursor.created_at,
                SavingsContribution.id < cursor.id,
            ),
        )
    )
