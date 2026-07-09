from __future__ import annotations

import uuid
from datetime import UTC, datetime

from app.modules.accounts.models import Account
from app.modules.accounts.pagination import (
    InvalidCursorError,
    decode_cursor,
    encode_cursor,
)
from app.modules.accounts.repositories import AccountRepository
from app.modules.accounts.schemas import (
    AccountCreateRequest,
    AccountListResponse,
    AccountResponse,
    AccountUpdateRequest,
)
from app.modules.finance_defaults import ensure_default_account
from app.modules.users.models import User


class AccountNotFoundError(Exception):
    pass


class InvalidAccountCursorError(Exception):
    pass


class AccountService:
    def __init__(self, accounts: AccountRepository) -> None:
        self.accounts = accounts

    async def create_account(
        self,
        request: AccountCreateRequest,
        current_user: User,
    ) -> Account:
        account = Account(
            user_id=current_user.id,
            name=request.name,
            type=request.type,
            currency=request.currency,
            opening_balance=request.opening_balance,
        )
        await self.accounts.create(account)
        await self.accounts.commit()
        await self.accounts.refresh(account)
        return account

    async def list_accounts(
        self,
        current_user: User,
        *,
        include_archived: bool,
        cursor: str | None,
        limit: int,
    ) -> AccountListResponse:
        try:
            page_cursor = decode_cursor(cursor)
        except InvalidCursorError as exc:
            raise InvalidAccountCursorError from exc

        if cursor is None and await ensure_default_account(
            self.accounts,
            current_user.id,
            currency=current_user.base_currency,
        ):
            await self.accounts.commit()

        accounts = await self.accounts.list_owned(
            current_user.id,
            include_archived=include_archived,
            cursor=page_cursor,
            limit=limit + 1,
        )
        has_more = len(accounts) > limit
        visible_accounts = accounts[:limit]
        next_cursor = (
            encode_cursor(visible_accounts[-1].created_at, visible_accounts[-1].id)
            if has_more and visible_accounts
            else None
        )
        return AccountListResponse(
            items=[
                AccountResponse.model_validate(account) for account in visible_accounts
            ],
            next_cursor=next_cursor,
            has_more=has_more,
        )

    async def get_account(self, account_id: uuid.UUID, current_user: User) -> Account:
        account = await self.accounts.get_owned(account_id, current_user.id)
        if account is None:
            raise AccountNotFoundError
        return account

    async def update_account(
        self,
        account_id: uuid.UUID,
        request: AccountUpdateRequest,
        current_user: User,
    ) -> Account:
        account = await self.get_account(account_id, current_user)
        update_data = request.model_dump(exclude_unset=True)
        for field_name, value in update_data.items():
            setattr(account, field_name, value)
        await self.accounts.commit()
        await self.accounts.refresh(account)
        return account

    async def archive_account(
        self,
        account_id: uuid.UUID,
        current_user: User,
    ) -> Account:
        account = await self.get_account(account_id, current_user)
        if account.archived_at is None:
            account.archived_at = datetime.now(UTC)
            account.is_archived = True
            await self.accounts.commit()
            await self.accounts.refresh(account)
        return account
