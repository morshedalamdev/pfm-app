from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Select, and_, desc, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.notifications.models import Notification
from app.modules.notifications.pagination import NotificationPageCursor


class NotificationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, notification: Notification) -> Notification:
        self._session.add(notification)
        await self._session.flush()
        return notification

    async def refresh(self, notification: Notification) -> None:
        await self._session.refresh(notification)

    async def get_owned(
        self,
        notification_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Notification | None:
        result = await self._session.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, notification_id: uuid.UUID) -> Notification | None:
        result = await self._session.execute(
            select(Notification).where(Notification.id == notification_id)
        )
        return result.scalar_one_or_none()

    async def list_owned(
        self,
        user_id: uuid.UUID,
        *,
        cursor: NotificationPageCursor | None,
        limit: int,
        unread_only: bool,
        notification_type: str | None,
    ) -> list[Notification]:
        query = select(Notification).where(Notification.user_id == user_id)
        if unread_only:
            query = query.where(Notification.read_at.is_(None))
        if notification_type is not None:
            query = query.where(Notification.type == notification_type)
        query = apply_notification_cursor(query, cursor)
        result = await self._session.execute(
            query.order_by(desc(Notification.created_at), desc(Notification.id)).limit(
                limit
            )
        )
        return list(result.scalars().all())

    async def count_unread(self, user_id: uuid.UUID) -> int:
        result = await self._session.execute(
            select(func.count(Notification.id)).where(
                Notification.user_id == user_id,
                Notification.read_at.is_(None),
            )
        )
        return int(result.scalar_one())

    async def mark_all_read(self, user_id: uuid.UUID, read_at: datetime) -> int:
        result = await self._session.execute(
            update(Notification)
            .where(Notification.user_id == user_id, Notification.read_at.is_(None))
            .values(read_at=read_at)
        )
        await self._session.flush()
        rowcount = getattr(result, "rowcount", 0)
        return int(rowcount or 0)

    async def commit(self) -> None:
        await self._session.commit()

    async def rollback(self) -> None:
        await self._session.rollback()


def apply_notification_cursor(
    query: Select[tuple[Notification]],
    cursor: NotificationPageCursor | None,
) -> Select[tuple[Notification]]:
    if cursor is None:
        return query

    return query.where(
        or_(
            Notification.created_at < cursor.created_at,
            and_(
                Notification.created_at == cursor.created_at,
                Notification.id < cursor.id,
            ),
        )
    )
