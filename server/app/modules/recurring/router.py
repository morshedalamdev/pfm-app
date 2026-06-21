import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.modules.accounts.repositories import AccountRepository
from app.modules.auth.dependencies import CurrentUserDependency
from app.modules.categories.repositories import CategoryRepository
from app.modules.recurring.repositories import RecurringRuleRepository
from app.modules.recurring.schedule import InvalidRecurringScheduleError
from app.modules.recurring.schemas import (
    RecurringRuleCreateRequest,
    RecurringRuleListResponse,
    RecurringRuleListStatus,
    RecurringRuleResponse,
    RecurringRuleUpdateRequest,
)
from app.modules.recurring.services import (
    InvalidRecurringRuleCursorError,
    InvalidRecurringRuleReferenceError,
    InvalidRecurringRuleStateError,
    RecurringRuleNotFoundError,
    RecurringRuleService,
)

router = APIRouter(prefix="/recurring-rules", tags=["recurring"])
SessionDependency = Annotated[AsyncSession, Depends(get_session)]


def build_recurring_rule_service(session: AsyncSession) -> RecurringRuleService:
    return RecurringRuleService(
        rules=RecurringRuleRepository(session),
        accounts=AccountRepository(session),
        categories=CategoryRepository(session),
    )


@router.post(
    "",
    response_model=RecurringRuleResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_recurring_rule(
    request: RecurringRuleCreateRequest,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> RecurringRuleResponse:
    try:
        return await build_recurring_rule_service(session).create_rule(
            request,
            current_user,
        )
    except InvalidRecurringRuleReferenceError as exc:
        raise invalid_reference_error() from exc
    except InvalidRecurringScheduleError as exc:
        raise invalid_schedule_error() from exc


@router.get("", response_model=RecurringRuleListResponse)
async def list_recurring_rules(
    current_user: CurrentUserDependency,
    session: SessionDependency,
    status_filter: Annotated[RecurringRuleListStatus, Query(alias="status")] = "all",
    cursor: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> RecurringRuleListResponse:
    try:
        return await build_recurring_rule_service(session).list_rules(
            current_user,
            status_filter=status_filter,
            cursor=cursor,
            limit=limit,
        )
    except InvalidRecurringRuleCursorError as exc:
        raise invalid_cursor_error() from exc


@router.get("/{rule_id}", response_model=RecurringRuleResponse)
async def get_recurring_rule(
    rule_id: str,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> RecurringRuleResponse:
    try:
        return await build_recurring_rule_service(session).get_rule(
            parse_uuid_or_404(rule_id),
            current_user,
        )
    except RecurringRuleNotFoundError as exc:
        raise not_found_error() from exc


@router.patch("/{rule_id}", response_model=RecurringRuleResponse)
async def update_recurring_rule(
    rule_id: str,
    request: RecurringRuleUpdateRequest,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> RecurringRuleResponse:
    try:
        return await build_recurring_rule_service(session).update_rule(
            parse_uuid_or_404(rule_id),
            request,
            current_user,
        )
    except RecurringRuleNotFoundError as exc:
        raise not_found_error() from exc
    except InvalidRecurringRuleReferenceError as exc:
        raise invalid_reference_error() from exc
    except InvalidRecurringRuleStateError as exc:
        raise invalid_state_error() from exc
    except InvalidRecurringScheduleError as exc:
        raise invalid_schedule_error() from exc


@router.post("/{rule_id}/pause", response_model=RecurringRuleResponse)
async def pause_recurring_rule(
    rule_id: str,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> RecurringRuleResponse:
    try:
        return await build_recurring_rule_service(session).pause_rule(
            parse_uuid_or_404(rule_id),
            current_user,
        )
    except RecurringRuleNotFoundError as exc:
        raise not_found_error() from exc
    except InvalidRecurringRuleStateError as exc:
        raise invalid_state_error() from exc


@router.post("/{rule_id}/resume", response_model=RecurringRuleResponse)
async def resume_recurring_rule(
    rule_id: str,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> RecurringRuleResponse:
    try:
        return await build_recurring_rule_service(session).resume_rule(
            parse_uuid_or_404(rule_id),
            current_user,
        )
    except RecurringRuleNotFoundError as exc:
        raise not_found_error() from exc
    except InvalidRecurringRuleStateError as exc:
        raise invalid_state_error() from exc
    except InvalidRecurringScheduleError as exc:
        raise invalid_schedule_error() from exc


@router.delete("/{rule_id}", response_model=RecurringRuleResponse)
async def archive_recurring_rule(
    rule_id: str,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> RecurringRuleResponse:
    try:
        return await build_recurring_rule_service(session).archive_rule(
            parse_uuid_or_404(rule_id),
            current_user,
        )
    except RecurringRuleNotFoundError as exc:
        raise not_found_error() from exc


def parse_uuid_or_404(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError as exc:
        raise not_found_error() from exc


def not_found_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Recurring rule not found",
    )


def invalid_reference_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail="Recurring rule references are invalid",
    )


def invalid_cursor_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail="Recurring rule cursor is invalid",
    )


def invalid_schedule_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail="Recurring rule schedule is invalid",
    )


def invalid_state_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Recurring rule state does not allow this action",
    )
