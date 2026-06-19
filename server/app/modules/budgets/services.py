from __future__ import annotations

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy.exc import IntegrityError

from app.modules.budgets.models import Budget
from app.modules.budgets.pagination import (
    InvalidBudgetCursorError as CursorDecodeError,
)
from app.modules.budgets.pagination import decode_budget_cursor, encode_budget_cursor
from app.modules.budgets.repositories import BudgetRepository
from app.modules.budgets.schemas import (
    BudgetCreateRequest,
    BudgetListResponse,
    BudgetProgressResponse,
    BudgetResponse,
    BudgetUpdateRequest,
    validate_budget_period,
)
from app.modules.categories.models import Category
from app.modules.categories.repositories import CategoryRepository
from app.modules.users.models import User


class BudgetNotFoundError(Exception):
    pass


class BudgetOverlapError(Exception):
    pass


class InvalidBudgetReferenceError(Exception):
    pass


class InvalidBudgetCursorError(Exception):
    pass


class InvalidBudgetFilterError(Exception):
    pass


class BudgetService:
    def __init__(
        self,
        budgets: BudgetRepository,
        categories: CategoryRepository,
    ) -> None:
        self.budgets = budgets
        self.categories = categories

    async def create_budget(
        self,
        request: BudgetCreateRequest,
        current_user: User,
    ) -> BudgetResponse:
        category = await self.get_valid_category(request.category_id, current_user)
        budget = Budget(
            user_id=current_user.id,
            category_id=category.id if category is not None else None,
            period_type=request.period_type,
            period_start=request.period_start,
            period_end=request.period_end,
            limit_amount=request.limit_amount,
            currency=request.currency,
        )
        try:
            await self.budgets.create(budget)
            await self.budgets.commit()
            await self.budgets.refresh(budget)
        except IntegrityError as exc:
            await self.budgets.rollback()
            raise BudgetOverlapError from exc
        return await self.build_budget_response(
            budget,
            category_name=category.name if category is not None else None,
        )

    async def list_budgets(
        self,
        current_user: User,
        *,
        include_archived: bool,
        category_id: uuid.UUID | None,
        month_start: date | None,
        month_end: date | None,
        cursor: str | None,
        limit: int,
    ) -> BudgetListResponse:
        try:
            page_cursor = decode_budget_cursor(cursor)
        except CursorDecodeError as exc:
            raise InvalidBudgetCursorError from exc

        if category_id is not None:
            category = await self.categories.get_owned(category_id, current_user.id)
            if category is None or category.kind != "expense":
                raise InvalidBudgetFilterError

        budgets = await self.budgets.list_owned(
            current_user.id,
            include_archived=include_archived,
            category_id=category_id,
            month_start=month_start,
            month_end=month_end,
            cursor=page_cursor,
            limit=limit + 1,
        )
        has_more = len(budgets) > limit
        visible_budgets = budgets[:limit]
        next_cursor = (
            encode_budget_cursor(visible_budgets[-1].created_at, visible_budgets[-1].id)
            if has_more and visible_budgets
            else None
        )
        category_names = await self.budgets.get_category_names(
            current_user.id,
            {
                budget.category_id
                for budget in visible_budgets
                if budget.category_id is not None
            },
        )
        return BudgetListResponse(
            items=[
                await self.build_budget_response(
                    budget,
                    category_name=(
                        category_names.get(budget.category_id)
                        if budget.category_id is not None
                        else None
                    ),
                )
                for budget in visible_budgets
            ],
            next_cursor=next_cursor,
            has_more=has_more,
        )

    async def get_budget(
        self,
        budget_id: uuid.UUID,
        current_user: User,
    ) -> BudgetResponse:
        budget = await self.get_budget_model(budget_id, current_user)
        category_name = None
        if budget.category_id is not None:
            category_names = await self.budgets.get_category_names(
                current_user.id,
                {budget.category_id},
            )
            category_name = category_names.get(budget.category_id)
        return await self.build_budget_response(budget, category_name=category_name)

    async def update_budget(
        self,
        budget_id: uuid.UUID,
        request: BudgetUpdateRequest,
        current_user: User,
    ) -> BudgetResponse:
        budget = await self.get_budget_model(budget_id, current_user)
        update_data = request.model_dump(exclude_unset=True)
        category = None
        if "category_id" in request.model_fields_set:
            category = await self.get_valid_category(request.category_id, current_user)
            budget.category_id = category.id if category is not None else None
        elif budget.category_id is not None:
            category = await self.categories.get_owned(
                budget.category_id,
                current_user.id,
            )

        period_type = str(update_data.get("period_type", budget.period_type))
        period_start = update_data.get("period_start", budget.period_start)
        period_end = update_data.get("period_end", budget.period_end)
        validate_budget_period(period_type, period_start, period_end)

        for field_name in {
            "period_type",
            "period_start",
            "period_end",
            "limit_amount",
            "currency",
        }:
            if field_name in update_data:
                setattr(budget, field_name, update_data[field_name])

        try:
            await self.budgets.commit()
            await self.budgets.refresh(budget)
        except IntegrityError as exc:
            await self.budgets.rollback()
            raise BudgetOverlapError from exc
        return await self.build_budget_response(
            budget,
            category_name=category.name if category is not None else None,
        )

    async def archive_budget(
        self,
        budget_id: uuid.UUID,
        current_user: User,
    ) -> BudgetResponse:
        budget = await self.get_budget_model(budget_id, current_user)
        if budget.archived_at is None:
            budget.archived_at = datetime.now(UTC)
            budget.is_archived = True
            await self.budgets.commit()
            await self.budgets.refresh(budget)
        return await self.get_budget(budget.id, current_user)

    async def get_budget_model(
        self,
        budget_id: uuid.UUID,
        current_user: User,
    ) -> Budget:
        budget = await self.budgets.get_owned(budget_id, current_user.id)
        if budget is None:
            raise BudgetNotFoundError
        return budget

    async def get_valid_category(
        self,
        category_id: uuid.UUID | None,
        current_user: User,
    ) -> Category | None:
        if category_id is None:
            return None

        category = await self.categories.get_owned(category_id, current_user.id)
        if (
            category is None
            or category.kind != "expense"
            or category.archived_at is not None
        ):
            raise InvalidBudgetReferenceError
        return category

    async def build_budget_response(
        self,
        budget: Budget,
        *,
        category_name: str | None,
    ) -> BudgetResponse:
        spent_amount = await self.budgets.calculate_spent_amount(budget)
        remaining_amount = budget.limit_amount - spent_amount
        percent_used = (spent_amount / budget.limit_amount) * Decimal("100")
        progress = BudgetProgressResponse(
            spent_amount=spent_amount,
            remaining_amount=remaining_amount,
            percent_used=percent_used,
            status="over_budget" if spent_amount > budget.limit_amount else "on_track",
        )
        return BudgetResponse(
            id=budget.id,
            category_id=budget.category_id,
            category_name=category_name,
            period_type=budget.period_type,
            period_start=budget.period_start,
            period_end=budget.period_end,
            limit_amount=budget.limit_amount,
            currency=budget.currency,
            is_archived=budget.is_archived,
            archived_at=budget.archived_at,
            created_at=budget.created_at,
            updated_at=budget.updated_at,
            progress=progress,
        )
