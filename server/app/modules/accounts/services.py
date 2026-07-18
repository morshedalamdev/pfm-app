from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import cast

from app.modules.accounts.models import Account
from app.modules.accounts.pagination import (
    InvalidCursorError,
    decode_cursor,
    encode_cursor,
)
from app.modules.accounts.repositories import AccountRepository
from app.modules.accounts.schemas import (
    AccountCreateRequest,
    AccountDeleteBlockReason,
    AccountDeleteEligibilityResponse,
    AccountListResponse,
    AccountResponse,
    AccountUpdateRequest,
)
from app.modules.finance_defaults import ensure_default_account
from app.modules.users.models import User


class AccountNotFoundError(Exception):
    pass


class AccountInUseError(Exception):
    pass


class DuplicateAccountError(Exception):
    pass


class InvalidAccountCursorError(Exception):
    pass


class InvalidDefaultAccountError(Exception):
    pass


class AccountService:
    def __init__(self, accounts: AccountRepository) -> None:
        self.accounts = accounts

    async def create_account(
        self,
        request: AccountCreateRequest,
        current_user: User,
    ) -> Account:
        if await self.accounts.has_active_name(current_user.id, request.name):
            raise DuplicateAccountError

        account = Account(
            user_id=current_user.id,
            name=request.name,
            type=request.type,
            currency=request.currency,
            opening_balance=request.opening_balance,
            is_default=not await self.accounts.has_active_default(current_user.id),
        )
        await self.accounts.create(account)
        if account.is_default:
            current_user.base_currency = account.currency
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

        defaults_changed = False
        if cursor is None:
            defaults_changed = await ensure_default_account(
                self.accounts,
                current_user.id,
                currency=current_user.base_currency,
            )
            defaults_changed = (
                await self.ensure_active_default(current_user.id) or defaults_changed
            )
        if await self.sync_default_currency(current_user) or defaults_changed:
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
        requested_name = update_data.get("name")
        if isinstance(requested_name, str) and await self.accounts.has_active_name(
            current_user.id,
            requested_name,
            exclude_account_id=account.id,
        ):
            raise DuplicateAccountError

        for field_name, value in update_data.items():
            setattr(account, field_name, value)
        if (
            account.is_default
            and not account.is_disabled
            and account.archived_at is None
        ):
            current_user.base_currency = account.currency
        await self.accounts.commit()
        await self.accounts.refresh(account)
        return account

    async def archive_account(
        self,
        account_id: uuid.UUID,
        current_user: User,
    ) -> Account:
        account = await self.get_account(account_id, current_user)
        if await self.accounts.is_referenced(account.id, current_user.id):
            raise AccountInUseError
        if account.archived_at is None:
            account.archived_at = datetime.now(UTC)
            account.is_archived = True
            if account.is_default:
                account.is_default = False
                await self.accounts.flush()
                await self.ensure_active_default(
                    current_user.id,
                    exclude_account_id=account.id,
                )
                await self.sync_default_currency(current_user)
            await self.accounts.commit()
            await self.accounts.refresh(account)
        return account

    async def disable_account(
        self,
        account_id: uuid.UUID,
        current_user: User,
    ) -> Account:
        account = await self.get_account(account_id, current_user)
        if account.archived_at is not None:
            raise AccountNotFoundError
        if not account.is_disabled:
            account.is_disabled = True
            account.disabled_at = datetime.now(UTC)
            if account.is_default:
                account.is_default = False
                await self.accounts.flush()
                await self.ensure_active_default(
                    current_user.id,
                    exclude_account_id=account.id,
                )
                await self.sync_default_currency(current_user)
            await self.accounts.commit()
            await self.accounts.refresh(account)
        return account

    async def set_default_account(
        self,
        account_id: uuid.UUID,
        current_user: User,
    ) -> Account:
        account = await self.get_account(account_id, current_user)
        if account.archived_at is not None or account.is_disabled:
            raise InvalidDefaultAccountError

        await self.accounts.clear_default_accounts(current_user.id)
        await self.accounts.flush()
        account.is_default = True
        current_user.base_currency = account.currency
        await self.accounts.commit()
        await self.accounts.refresh(account)
        return account

    async def get_default_account(self, current_user: User) -> Account | None:
        defaults_changed = await self.ensure_active_default(current_user.id)
        if await self.sync_default_currency(current_user) or defaults_changed:
            await self.accounts.commit()
        return await self.accounts.get_default(current_user.id)

    async def list_active_accounts(self, current_user: User) -> list[Account]:
        defaults_changed = await self.ensure_active_default(current_user.id)
        if await self.sync_default_currency(current_user) or defaults_changed:
            await self.accounts.commit()
        return await self.accounts.list_active(current_user.id)

    async def can_delete_account(
        self,
        account_id: uuid.UUID,
        current_user: User,
    ) -> AccountDeleteEligibilityResponse:
        account = await self.get_account(account_id, current_user)
        reasons = [
            cast(AccountDeleteBlockReason, reason)
            for reason in await self.accounts.reference_reasons(
                account.id,
                current_user.id,
            )
        ]
        return AccountDeleteEligibilityResponse(
            account_id=account.id,
            can_delete=len(reasons) == 0,
            reasons=reasons,
        )

    async def ensure_active_default(
        self,
        user_id: uuid.UUID,
        *,
        exclude_account_id: uuid.UUID | None = None,
    ) -> bool:
        if await self.accounts.has_active_default(user_id):
            return False

        for account in await self.accounts.list_active(user_id):
            if exclude_account_id is not None and account.id == exclude_account_id:
                continue
            account.is_default = True
            return True
        return False

    async def sync_default_currency(self, current_user: User) -> bool:
        default_account = await self.accounts.get_default(current_user.id)
        if (
            default_account is None
            or current_user.base_currency == default_account.currency
        ):
            return False
        current_user.base_currency = default_account.currency
        return True
