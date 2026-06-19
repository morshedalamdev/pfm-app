import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.modules.auth.dependencies import CurrentUserDependency
from app.modules.budgets.repositories import BudgetRepository
from app.modules.budgets.schemas import (
    BudgetCreateRequest,
    BudgetListResponse,
    BudgetResponse,
    BudgetUpdateRequest,
    next_month_start,
)
from app.modules.budgets.services import (
    BudgetNotFoundError,
    BudgetOverlapError,
    BudgetService,
    InvalidBudgetCursorError,
    InvalidBudgetFilterError,
    InvalidBudgetReferenceError,
)
from app.modules.categories.repositories import CategoryRepository

router = APIRouter(prefix="/budgets", tags=["budgets"])
SessionDependency = Annotated[AsyncSession, Depends(get_session)]


def build_budget_service(session: AsyncSession) -> BudgetService:
    return BudgetService(
        budgets=BudgetRepository(session),
        categories=CategoryRepository(session),
    )


@router.post(
    "",
    response_model=BudgetResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_budget(
    request: BudgetCreateRequest,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> BudgetResponse:
    try:
        return await build_budget_service(session).create_budget(request, current_user)
    except InvalidBudgetReferenceError as exc:
        raise invalid_reference_error() from exc
    except BudgetOverlapError as exc:
        raise overlap_error() from exc


@router.get("", response_model=BudgetListResponse)
async def list_budgets(
    current_user: CurrentUserDependency,
    session: SessionDependency,
    include_archived: bool = False,
    category_id: Annotated[uuid.UUID | None, Query()] = None,
    month: Annotated[str | None, Query(pattern=r"^\d{4}-\d{2}$")] = None,
    cursor: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> BudgetListResponse:
    month_start, month_end = parse_month_filter(month)
    try:
        return await build_budget_service(session).list_budgets(
            current_user,
            include_archived=include_archived,
            category_id=category_id,
            month_start=month_start,
            month_end=month_end,
            cursor=cursor,
            limit=limit,
        )
    except InvalidBudgetCursorError as exc:
        raise invalid_cursor_error() from exc
    except InvalidBudgetFilterError as exc:
        raise invalid_filter_error() from exc


@router.get("/{budget_id}", response_model=BudgetResponse)
async def get_budget(
    budget_id: str,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> BudgetResponse:
    try:
        return await build_budget_service(session).get_budget(
            parse_uuid_or_404(budget_id),
            current_user,
        )
    except BudgetNotFoundError as exc:
        raise not_found_error() from exc


@router.patch("/{budget_id}", response_model=BudgetResponse)
async def update_budget(
    budget_id: str,
    request: BudgetUpdateRequest,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> BudgetResponse:
    try:
        return await build_budget_service(session).update_budget(
            parse_uuid_or_404(budget_id),
            request,
            current_user,
        )
    except BudgetNotFoundError as exc:
        raise not_found_error() from exc
    except InvalidBudgetReferenceError as exc:
        raise invalid_reference_error() from exc
    except ValueError as exc:
        raise invalid_period_error() from exc
    except BudgetOverlapError as exc:
        raise overlap_error() from exc


@router.delete("/{budget_id}", response_model=BudgetResponse)
async def archive_budget(
    budget_id: str,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> BudgetResponse:
    try:
        return await build_budget_service(session).archive_budget(
            parse_uuid_or_404(budget_id),
            current_user,
        )
    except BudgetNotFoundError as exc:
        raise not_found_error() from exc


def parse_month_filter(month: str | None) -> tuple[date | None, date | None]:
    if month is None:
        return None, None
    try:
        month_start = date.fromisoformat(f"{month}-01")
    except ValueError as exc:
        raise invalid_filter_error() from exc
    return month_start, next_month_start(month_start)


def parse_uuid_or_404(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError as exc:
        raise not_found_error() from exc


def not_found_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Budget not found",
    )


def invalid_reference_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail="Budget category is invalid",
    )


def invalid_cursor_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail="Budget cursor is invalid",
    )


def invalid_filter_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail="Budget filters are invalid",
    )


def invalid_period_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail="Budget period is invalid",
    )


def overlap_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Budget overlaps an existing active budget for the same scope",
    )
