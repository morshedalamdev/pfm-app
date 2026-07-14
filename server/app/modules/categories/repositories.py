from __future__ import annotations

import uuid

from sqlalchemy import Select, and_, desc, exists, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.accounts.pagination import PageCursor
from app.modules.categories.models import Category


class CategoryRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, category: Category) -> Category:
        self._session.add(category)
        await self._session.flush()
        return category

    async def refresh(self, category: Category) -> None:
        await self._session.refresh(category)

    async def get_owned(
        self,
        category_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Category | None:
        result = await self._session.execute(
            select(Category).where(
                Category.id == category_id,
                Category.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def has_any_owned_kind(self, user_id: uuid.UUID, kind: str) -> bool:
        result = await self._session.execute(
            select(exists().where(Category.user_id == user_id, Category.kind == kind))
        )
        return bool(result.scalar())

    async def has_owned_kind_name(
        self,
        user_id: uuid.UUID,
        kind: str,
        name: str,
    ) -> bool:
        result = await self._session.execute(
            select(
                exists().where(
                    Category.user_id == user_id,
                    Category.kind == kind,
                    Category.name == name,
                )
            )
        )
        return bool(result.scalar())

    async def list_owned(
        self,
        user_id: uuid.UUID,
        *,
        kind: str | None,
        include_archived: bool,
        cursor: PageCursor | None,
        limit: int,
    ) -> list[Category]:
        query = select(Category).where(Category.user_id == user_id)
        if kind is not None:
            query = query.where(Category.kind == kind)
        if not include_archived:
            query = query.where(Category.archived_at.is_(None))
        query = apply_cursor(query, cursor)
        query = query.order_by(desc(Category.created_at), desc(Category.id)).limit(
            limit
        )

        result = await self._session.execute(query)
        return list(result.scalars().all())

    async def commit(self) -> None:
        await self._session.commit()

    async def rollback(self) -> None:
        await self._session.rollback()


def apply_cursor(
    query: Select[tuple[Category]],
    cursor: PageCursor | None,
) -> Select[tuple[Category]]:
    if cursor is None:
        return query

    return query.where(
        or_(
            Category.created_at < cursor.created_at,
            and_(Category.created_at == cursor.created_at, Category.id < cursor.id),
        )
    )
