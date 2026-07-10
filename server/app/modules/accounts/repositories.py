from __future__ import annotations

import uuid

from sqlalchemy import Select, and_, desc, exists, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.accounts.models import Account
from app.modules.accounts.pagination import PageCursor
from app.modules.recurring.models import RecurringRule
from app.modules.transactions.models import Transaction


class AccountRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, account: Account) -> Account:
        self._session.add(account)
        await self._session.flush()
        return account

    async def refresh(self, account: Account) -> None:
        await self._session.refresh(account)

    async def get_owned(
        self, account_id: uuid.UUID, user_id: uuid.UUID
    ) -> Account | None:
        result = await self._session.execute(
            select(Account).where(Account.id == account_id, Account.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def has_any_owned(self, user_id: uuid.UUID) -> bool:
        result = await self._session.execute(
            select(exists().where(Account.user_id == user_id))
        )
        return bool(result.scalar())

    async def has_active_name(
        self,
        user_id: uuid.UUID,
        name: str,
        *,
        exclude_account_id: uuid.UUID | None = None,
    ) -> bool:
        conditions = [
            Account.user_id == user_id,
            Account.name == name,
            Account.archived_at.is_(None),
        ]
        if exclude_account_id is not None:
            conditions.append(Account.id != exclude_account_id)

        result = await self._session.execute(select(exists().where(*conditions)))
        return bool(result.scalar())

    async def has_active_default(self, user_id: uuid.UUID) -> bool:
        result = await self._session.execute(
            select(
                exists().where(
                    Account.user_id == user_id,
                    Account.archived_at.is_(None),
                    Account.is_disabled.is_(False),
                    Account.is_default.is_(True),
                )
            )
        )
        return bool(result.scalar())

    async def get_default(self, user_id: uuid.UUID) -> Account | None:
        result = await self._session.execute(
            select(Account).where(
                Account.user_id == user_id,
                Account.archived_at.is_(None),
                Account.is_disabled.is_(False),
                Account.is_default.is_(True),
            )
        )
        return result.scalar_one_or_none()

    async def list_active(self, user_id: uuid.UUID) -> list[Account]:
        result = await self._session.execute(
            select(Account)
            .where(
                Account.user_id == user_id,
                Account.archived_at.is_(None),
                Account.is_disabled.is_(False),
            )
            .order_by(desc(Account.created_at), desc(Account.id))
        )
        return list(result.scalars().all())

    async def clear_default_accounts(self, user_id: uuid.UUID) -> None:
        result = await self._session.execute(
            select(Account).where(
                Account.user_id == user_id,
                Account.is_default.is_(True),
            )
        )
        for account in result.scalars().all():
            account.is_default = False

    async def is_referenced(self, account_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        return bool(await self.reference_reasons(account_id, user_id))

    async def reference_reasons(
        self, account_id: uuid.UUID, user_id: uuid.UUID
    ) -> list[str]:
        reasons: list[str] = []
        transaction_result = await self._session.execute(
            select(
                exists().where(
                    Transaction.account_id == account_id,
                    Transaction.user_id == user_id,
                )
            )
        )
        if bool(transaction_result.scalar()):
            reasons.append("transaction")

        recurring_result = await self._session.execute(
            select(
                exists().where(
                    RecurringRule.account_id == account_id,
                    RecurringRule.user_id == user_id,
                )
            )
        )
        if bool(recurring_result.scalar()):
            reasons.append("recurring_rule")

        return reasons

    async def list_owned(
        self,
        user_id: uuid.UUID,
        *,
        include_archived: bool,
        cursor: PageCursor | None,
        limit: int,
    ) -> list[Account]:
        query = select(Account).where(Account.user_id == user_id)
        if not include_archived:
            query = query.where(Account.archived_at.is_(None))
        query = apply_cursor(query, cursor)
        query = query.order_by(desc(Account.created_at), desc(Account.id)).limit(limit)

        result = await self._session.execute(query)
        return list(result.scalars().all())

    async def commit(self) -> None:
        await self._session.commit()

    async def flush(self) -> None:
        await self._session.flush()

    async def rollback(self) -> None:
        await self._session.rollback()


def apply_cursor(
    query: Select[tuple[Account]], cursor: PageCursor | None
) -> Select[tuple[Account]]:
    if cursor is None:
        return query

    return query.where(
        or_(
            Account.created_at < cursor.created_at,
            and_(Account.created_at == cursor.created_at, Account.id < cursor.id),
        )
    )
