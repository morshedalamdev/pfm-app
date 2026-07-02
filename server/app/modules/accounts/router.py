import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.modules.accounts.models import Account
from app.modules.accounts.repositories import AccountRepository
from app.modules.accounts.schemas import (
    AccountCreateRequest,
    AccountListResponse,
    AccountResponse,
    AccountUpdateRequest,
)
from app.modules.accounts.services import (
    AccountNotFoundError,
    AccountService,
    InvalidAccountCursorError,
)
from app.modules.auth.dependencies import CurrentUserDependency
from app.modules.users.models import User

router = APIRouter(prefix="/accounts", tags=["accounts"])
SessionDependency = Annotated[AsyncSession, Depends(get_session)]


def build_account_service(session: AsyncSession) -> AccountService:
    return AccountService(accounts=AccountRepository(session))


@router.post(
    "",
    response_model=AccountResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_account(
    request: AccountCreateRequest,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> AccountResponse:
    account = await build_account_service(session).create_account(request, current_user)
    return AccountResponse.model_validate(account)


@router.get("", response_model=AccountListResponse)
async def list_accounts(
    current_user: CurrentUserDependency,
    session: SessionDependency,
    include_archived: bool = False,
    cursor: str | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> AccountListResponse:
    try:
        return await build_account_service(session).list_accounts(
            current_user,
            include_archived=include_archived,
            cursor=cursor,
            limit=limit,
        )
    except InvalidAccountCursorError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid pagination cursor",
        ) from exc


@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(
    account_id: str,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> AccountResponse:
    account = await get_account_or_404(account_id, current_user, session)
    return AccountResponse.model_validate(account)


@router.patch("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: str,
    request: AccountUpdateRequest,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> AccountResponse:
    try:
        account = await build_account_service(session).update_account(
            parse_uuid_or_404(account_id),
            request,
            current_user,
        )
    except AccountNotFoundError as exc:
        raise not_found_error("Account not found") from exc
    return AccountResponse.model_validate(account)


@router.delete("/{account_id}", response_model=AccountResponse)
async def archive_account(
    account_id: str,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> AccountResponse:
    try:
        account = await build_account_service(session).archive_account(
            parse_uuid_or_404(account_id),
            current_user,
        )
    except AccountNotFoundError as exc:
        raise not_found_error("Account not found") from exc
    return AccountResponse.model_validate(account)


async def get_account_or_404(
    account_id: str,
    current_user: User,
    session: AsyncSession,
) -> Account:
    try:
        return await build_account_service(session).get_account(
            parse_uuid_or_404(account_id),
            current_user,
        )
    except AccountNotFoundError as exc:
        raise not_found_error("Account not found") from exc


def parse_uuid_or_404(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError as exc:
        raise not_found_error("Account not found") from exc


def not_found_error(message: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message)
