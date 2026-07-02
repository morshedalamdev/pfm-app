from __future__ import annotations

import uuid
from datetime import UTC, datetime

from app.modules.notifications.models import Notification
from app.modules.notifications.pagination import (
    InvalidNotificationCursorError as CursorDecodeError,
)
from app.modules.notifications.pagination import (
    decode_notification_cursor,
    encode_notification_cursor,
)
from app.modules.notifications.repositories import NotificationRepository
from app.modules.notifications.schemas import (
    NotificationListResponse,
    NotificationMarkAllReadResponse,
    NotificationResponse,
    NotificationUnreadCountResponse,
)
from app.modules.outbox.models import OutboxEvent
from app.modules.outbox.repositories import OutboxEventRepository
from app.modules.users.models import User

NOTIFICATION_EMAIL_REQUESTED_EVENT = "notification.email.requested"


class NotificationNotFoundError(Exception):
    pass


class InvalidNotificationCursorError(Exception):
    pass


class NotificationService:
    def __init__(
        self,
        *,
        notifications: NotificationRepository,
        outbox: OutboxEventRepository,
    ) -> None:
        self.notifications = notifications
        self.outbox = outbox

    async def create_notification(
        self,
        *,
        user_id: uuid.UUID,
        notification_type: str,
        title: str,
        message: str,
        payload: dict[str, object] | None = None,
        request_email: bool = False,
    ) -> NotificationResponse:
        now = datetime.now(UTC)
        notification = Notification(
            user_id=user_id,
            type=notification_type.strip(),
            title=title.strip(),
            message=message.strip(),
            payload=payload or {},
            email_delivery_status="pending" if request_email else "not_requested",
            email_requested_at=now if request_email else None,
        )
        if not notification.type or not notification.title or not notification.message:
            raise ValueError("Notification type, title, and message are required")

        try:
            await self.notifications.create(notification)
            if request_email:
                await self.outbox.create(
                    OutboxEvent(
                        user_id=user_id,
                        event_type=NOTIFICATION_EMAIL_REQUESTED_EVENT,
                        aggregate_type="notification",
                        aggregate_id=notification.id,
                        idempotency_key=f"notification:{notification.id}:email",
                        payload={"notification_id": str(notification.id)},
                    )
                )
            await self.notifications.refresh(notification)
            response = NotificationResponse.model_validate(notification)
            await self.notifications.commit()
        except Exception:
            await self.notifications.rollback()
            raise
        return response

    async def list_notifications(
        self,
        current_user: User,
        *,
        cursor: str | None,
        limit: int,
        unread_only: bool,
        notification_type: str | None,
    ) -> NotificationListResponse:
        try:
            page_cursor = decode_notification_cursor(cursor)
        except CursorDecodeError as exc:
            raise InvalidNotificationCursorError from exc

        notifications = await self.notifications.list_owned(
            current_user.id,
            cursor=page_cursor,
            limit=limit + 1,
            unread_only=unread_only,
            notification_type=notification_type,
        )
        has_more = len(notifications) > limit
        visible_notifications = notifications[:limit]
        next_cursor = (
            encode_notification_cursor(
                visible_notifications[-1].created_at,
                visible_notifications[-1].id,
            )
            if has_more and visible_notifications
            else None
        )
        return NotificationListResponse(
            items=[
                NotificationResponse.model_validate(notification)
                for notification in visible_notifications
            ],
            next_cursor=next_cursor,
            has_more=has_more,
        )

    async def unread_count(
        self,
        current_user: User,
    ) -> NotificationUnreadCountResponse:
        return NotificationUnreadCountResponse(
            unread_count=await self.notifications.count_unread(current_user.id)
        )

    async def mark_read(
        self,
        notification_id: uuid.UUID,
        current_user: User,
    ) -> NotificationResponse:
        notification = await self.notifications.get_owned(
            notification_id,
            current_user.id,
        )
        if notification is None:
            raise NotificationNotFoundError
        if notification.read_at is None:
            notification.read_at = datetime.now(UTC)
            await self.notifications.commit()
            await self.notifications.refresh(notification)
        return NotificationResponse.model_validate(notification)

    async def mark_all_read(
        self,
        current_user: User,
    ) -> NotificationMarkAllReadResponse:
        read_at = datetime.now(UTC)
        updated_count = await self.notifications.mark_all_read(
            current_user.id,
            read_at,
        )
        await self.notifications.commit()
        return NotificationMarkAllReadResponse(
            updated_count=updated_count,
            read_at=read_at,
        )
