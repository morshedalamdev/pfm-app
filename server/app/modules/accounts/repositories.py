from __future__ import annotations

import uuid

from sqlalchemy import Select, and_, desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.accounts.models import Account
from app.modules.accounts.pagination import PageCursor


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
