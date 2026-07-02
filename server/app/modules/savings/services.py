from __future__ import annotations

import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import cast

from app.modules.savings.models import SavingsContribution, SavingsGoal
from app.modules.savings.pagination import (
    InvalidSavingsContributionCursorError as ContributionCursorDecodeError,
)
from app.modules.savings.pagination import (
    InvalidSavingsGoalCursorError as GoalCursorDecodeError,
)
from app.modules.savings.pagination import (
    decode_contribution_cursor,
    decode_goal_cursor,
    encode_contribution_cursor,
    encode_goal_cursor,
)
from app.modules.savings.repositories import SavingsRepository
from app.modules.savings.schemas import (
    SavingsContributionCreateRequest,
    SavingsContributionListResponse,
    SavingsContributionResponse,
    SavingsGoalCreateRequest,
    SavingsGoalListResponse,
    SavingsGoalProgressResponse,
    SavingsGoalResponse,
    SavingsGoalStatus,
    SavingsGoalUpdateRequest,
)
from app.modules.users.models import User


class SavingsGoalNotFoundError(Exception):
    pass


class InvalidSavingsGoalStateError(Exception):
    pass


class InvalidSavingsGoalCursorError(Exception):
    pass


class InvalidSavingsContributionCursorError(Exception):
    pass


class SavingsService:
    def __init__(self, savings: SavingsRepository) -> None:
        self.savings = savings

    async def create_goal(
        self,
        request: SavingsGoalCreateRequest,
        current_user: User,
    ) -> SavingsGoalResponse:
        goal = SavingsGoal(
            user_id=current_user.id,
            name=request.name,
            target_amount=request.target_amount,
            monthly_target_amount=request.monthly_target_amount,
            currency=request.currency,
            target_date=request.target_date,
            note=request.note,
            status="active",
        )
        await self.savings.create_goal(goal)
        await self.savings.commit()
        await self.savings.refresh_goal(goal)
        return self.build_goal_response(goal, saved_amount=Decimal("0"))

    async def list_goals(
        self,
        current_user: User,
        *,
        status_filter: str,
        cursor: str | None,
        limit: int,
    ) -> SavingsGoalListResponse:
        try:
            page_cursor = decode_goal_cursor(cursor)
        except GoalCursorDecodeError as exc:
            raise InvalidSavingsGoalCursorError from exc

        goals = await self.savings.list_goals_owned(
            current_user.id,
            status_filter=status_filter,
            cursor=page_cursor,
            limit=limit + 1,
        )
        has_more = len(goals) > limit
        visible_goals = goals[:limit]
        saved_amounts = await self.savings.calculate_saved_amounts(
            current_user.id,
            {goal.id for goal in visible_goals},
        )
        next_cursor = (
            encode_goal_cursor(visible_goals[-1].created_at, visible_goals[-1].id)
            if has_more and visible_goals
            else None
        )
        return SavingsGoalListResponse(
            items=[
                self.build_goal_response(
                    goal,
                    saved_amount=saved_amounts.get(goal.id, Decimal("0")),
                )
                for goal in visible_goals
            ],
            next_cursor=next_cursor,
            has_more=has_more,
        )

    async def get_goal(
        self,
        goal_id: uuid.UUID,
        current_user: User,
    ) -> SavingsGoalResponse:
        goal = await self.get_goal_model(goal_id, current_user)
        saved_amount = await self.savings.calculate_saved_amount(
            goal.id,
            current_user.id,
        )
        return self.build_goal_response(goal, saved_amount=saved_amount)

    async def update_goal(
        self,
        goal_id: uuid.UUID,
        request: SavingsGoalUpdateRequest,
        current_user: User,
    ) -> SavingsGoalResponse:
        goal = await self.get_goal_model(goal_id, current_user)
        if goal.status == "archived":
            raise InvalidSavingsGoalStateError

        update_data = request.model_dump(exclude_unset=True)
        for field_name in {
            "name",
            "target_amount",
            "monthly_target_amount",
            "currency",
            "target_date",
            "note",
        }:
            if field_name in update_data:
                setattr(goal, field_name, update_data[field_name])

        saved_amount = await self.savings.calculate_saved_amount(
            goal.id,
            current_user.id,
        )
        self.apply_completion_state(goal, saved_amount)
        await self.savings.commit()
        await self.savings.refresh_goal(goal)
        return self.build_goal_response(goal, saved_amount=saved_amount)

    async def archive_goal(
        self,
        goal_id: uuid.UUID,
        current_user: User,
    ) -> SavingsGoalResponse:
        goal = await self.get_goal_model(goal_id, current_user)
        if goal.status != "archived":
            now = datetime.now(UTC)
            goal.status = "archived"
            goal.archived_at = now
            await self.savings.commit()
            await self.savings.refresh_goal(goal)
        return await self.get_goal(goal.id, current_user)

    async def create_contribution(
        self,
        goal_id: uuid.UUID,
        request: SavingsContributionCreateRequest,
        current_user: User,
    ) -> SavingsContributionResponse:
        goal = await self.get_goal_model(goal_id, current_user)
        if goal.status != "active":
            raise InvalidSavingsGoalStateError

        contribution = SavingsContribution(
            user_id=current_user.id,
            goal_id=goal.id,
            amount=request.amount,
            currency=goal.currency,
            contributed_at=request.contributed_at,
            note=request.note,
        )
        await self.savings.create_contribution(contribution)
        saved_amount = await self.savings.calculate_saved_amount(
            goal.id,
            current_user.id,
        )
        self.apply_completion_state(goal, saved_amount)
        await self.savings.commit()
        await self.savings.refresh_contribution(contribution)
        return SavingsContributionResponse.model_validate(contribution)

    async def list_contributions(
        self,
        goal_id: uuid.UUID,
        current_user: User,
        *,
        cursor: str | None,
        limit: int,
    ) -> SavingsContributionListResponse:
        goal = await self.get_goal_model(goal_id, current_user)
        try:
            page_cursor = decode_contribution_cursor(cursor)
        except ContributionCursorDecodeError as exc:
            raise InvalidSavingsContributionCursorError from exc

        contributions = await self.savings.list_contributions_owned(
            goal.id,
            current_user.id,
            cursor=page_cursor,
            limit=limit + 1,
        )
        has_more = len(contributions) > limit
        visible_contributions = contributions[:limit]
        next_cursor = (
            encode_contribution_cursor(
                visible_contributions[-1].contributed_at,
                visible_contributions[-1].created_at,
                visible_contributions[-1].id,
            )
            if has_more and visible_contributions
            else None
        )
        return SavingsContributionListResponse(
            items=[
                SavingsContributionResponse.model_validate(contribution)
                for contribution in visible_contributions
            ],
            next_cursor=next_cursor,
            has_more=has_more,
        )

    async def get_goal_model(
        self,
        goal_id: uuid.UUID,
        current_user: User,
    ) -> SavingsGoal:
        goal = await self.savings.get_goal_owned(goal_id, current_user.id)
        if goal is None:
            raise SavingsGoalNotFoundError
        return goal

    def apply_completion_state(
        self,
        goal: SavingsGoal,
        saved_amount: Decimal,
    ) -> None:
        if goal.status == "archived":
            return
        if saved_amount >= goal.target_amount:
            if goal.status != "completed":
                goal.status = "completed"
                goal.completed_at = datetime.now(UTC)
        elif goal.status == "completed":
            goal.status = "active"
            goal.completed_at = None

    def build_goal_response(
        self,
        goal: SavingsGoal,
        *,
        saved_amount: Decimal,
    ) -> SavingsGoalResponse:
        remaining_amount = goal.target_amount - saved_amount
        percent_complete = (saved_amount / goal.target_amount) * Decimal("100")
        progress = SavingsGoalProgressResponse(
            saved_amount=saved_amount,
            remaining_amount=remaining_amount,
            percent_complete=percent_complete,
            is_target_met=saved_amount >= goal.target_amount,
        )
        return SavingsGoalResponse(
            id=goal.id,
            name=goal.name,
            target_amount=goal.target_amount,
            monthly_target_amount=goal.monthly_target_amount,
            currency=goal.currency,
            target_date=goal.target_date,
            status=cast(SavingsGoalStatus, goal.status),
            note=goal.note,
            completed_at=goal.completed_at,
            archived_at=goal.archived_at,
            created_at=goal.created_at,
            updated_at=goal.updated_at,
            progress=progress,
        )
