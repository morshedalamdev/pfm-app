import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.modules.auth.dependencies import CurrentUserDependency
from app.modules.savings.repositories import SavingsRepository
from app.modules.savings.schemas import (
    SavingsContributionCreateRequest,
    SavingsContributionListResponse,
    SavingsContributionResponse,
    SavingsGoalCreateRequest,
    SavingsGoalListResponse,
    SavingsGoalListStatus,
    SavingsGoalResponse,
    SavingsGoalUpdateRequest,
)
from app.modules.savings.services import (
    InvalidSavingsContributionCursorError,
    InvalidSavingsGoalCursorError,
    InvalidSavingsGoalStateError,
    SavingsGoalNotFoundError,
    SavingsService,
)

router = APIRouter(prefix="/savings-goals", tags=["savings"])
SessionDependency = Annotated[AsyncSession, Depends(get_session)]


def build_savings_service(session: AsyncSession) -> SavingsService:
    return SavingsService(savings=SavingsRepository(session))


@router.post(
    "",
    response_model=SavingsGoalResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_savings_goal(
    request: SavingsGoalCreateRequest,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> SavingsGoalResponse:
    return await build_savings_service(session).create_goal(request, current_user)


@router.get("", response_model=SavingsGoalListResponse)
async def list_savings_goals(
    current_user: CurrentUserDependency,
    session: SessionDependency,
    status_filter: Annotated[SavingsGoalListStatus, Query(alias="status")] = "all",
    cursor: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> SavingsGoalListResponse:
    try:
        return await build_savings_service(session).list_goals(
            current_user,
            status_filter=status_filter,
            cursor=cursor,
            limit=limit,
        )
    except InvalidSavingsGoalCursorError as exc:
        raise invalid_goal_cursor_error() from exc


@router.get("/{goal_id}", response_model=SavingsGoalResponse)
async def get_savings_goal(
    goal_id: str,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> SavingsGoalResponse:
    try:
        return await build_savings_service(session).get_goal(
            parse_uuid_or_404(goal_id),
            current_user,
        )
    except SavingsGoalNotFoundError as exc:
        raise not_found_error() from exc


@router.patch("/{goal_id}", response_model=SavingsGoalResponse)
async def update_savings_goal(
    goal_id: str,
    request: SavingsGoalUpdateRequest,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> SavingsGoalResponse:
    try:
        return await build_savings_service(session).update_goal(
            parse_uuid_or_404(goal_id),
            request,
            current_user,
        )
    except SavingsGoalNotFoundError as exc:
        raise not_found_error() from exc
    except InvalidSavingsGoalStateError as exc:
        raise invalid_state_error() from exc


@router.delete("/{goal_id}", response_model=SavingsGoalResponse)
async def archive_savings_goal(
    goal_id: str,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> SavingsGoalResponse:
    try:
        return await build_savings_service(session).archive_goal(
            parse_uuid_or_404(goal_id),
            current_user,
        )
    except SavingsGoalNotFoundError as exc:
        raise not_found_error() from exc


@router.post(
    "/{goal_id}/contributions",
    response_model=SavingsContributionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_savings_contribution(
    goal_id: str,
    request: SavingsContributionCreateRequest,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> SavingsContributionResponse:
    try:
        return await build_savings_service(session).create_contribution(
            parse_uuid_or_404(goal_id),
            request,
            current_user,
        )
    except SavingsGoalNotFoundError as exc:
        raise not_found_error() from exc
    except InvalidSavingsGoalStateError as exc:
        raise invalid_state_error() from exc


@router.get(
    "/{goal_id}/contributions",
    response_model=SavingsContributionListResponse,
)
async def list_savings_contributions(
    goal_id: str,
    current_user: CurrentUserDependency,
    session: SessionDependency,
    cursor: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> SavingsContributionListResponse:
    try:
        return await build_savings_service(session).list_contributions(
            parse_uuid_or_404(goal_id),
            current_user,
            cursor=cursor,
            limit=limit,
        )
    except SavingsGoalNotFoundError as exc:
        raise not_found_error() from exc
    except InvalidSavingsContributionCursorError as exc:
        raise invalid_contribution_cursor_error() from exc


def parse_uuid_or_404(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError as exc:
        raise not_found_error() from exc


def not_found_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Savings goal not found",
    )


def invalid_state_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Savings goal is not active",
    )


def invalid_goal_cursor_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail="Savings goal cursor is invalid",
    )


def invalid_contribution_cursor_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail="Savings contribution cursor is invalid",
    )
