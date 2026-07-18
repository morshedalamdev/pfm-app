from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.modules.accounts.repositories import AccountRepository
from app.modules.auth.dependencies import CurrentUserDependency
from app.modules.users.repositories import UserRepository
from app.modules.users.schemas import UserResponse, UserUpdateRequest

router = APIRouter(prefix="/users", tags=["users"])
SessionDependency = Annotated[AsyncSession, Depends(get_session)]


@router.get("/me", response_model=UserResponse)
async def read_current_user(current_user: CurrentUserDependency) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_current_user(
    request: UserUpdateRequest,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> UserResponse:
    repository = UserRepository(session)
    updates = request.model_dump(exclude_unset=True)
    if updates.get("home_balance_source_type") is None and (
        "home_balance_source_type" in updates or "home_balance_source_id" in updates
    ):
        updates["home_balance_source_type"] = None
        updates["home_balance_source_id"] = None

    requested_currency = updates.get("base_currency")
    default_account = (
        await AccountRepository(session).get_default(current_user.id)
        if isinstance(requested_currency, str)
        else None
    )
    if default_account is not None:
        if requested_currency != default_account.currency:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="System currency follows the default account.",
            )
        requested_currency = None
    if (
        isinstance(requested_currency, str)
        and requested_currency != current_user.base_currency
    ):
        now = datetime.now(UTC)
        if was_changed_this_month(current_user.base_currency_changed_at, now):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Currency can only be changed once per month.",
            )
        current_user.base_currency_changed_at = now

    for field_name, value in updates.items():
        setattr(current_user, field_name, value)

    try:
        await repository.commit()
    except IntegrityError as exc:
        await repository.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Profile could not be updated",
        ) from exc

    await repository.refresh(current_user)
    return UserResponse.model_validate(current_user)


def was_changed_this_month(
    changed_at: datetime | None,
    now: datetime,
) -> bool:
    if changed_at is None:
        return False
    changed_at_utc = changed_at.astimezone(UTC)
    now_utc = now.astimezone(UTC)
    return changed_at_utc.year == now_utc.year and changed_at_utc.month == now_utc.month
