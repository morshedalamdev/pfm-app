from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.email import EmailAdapter, EmailMessage, build_email_adapter
from app.core.config import Settings
from app.modules.notifications.models import Notification
from app.modules.notifications.repositories import NotificationRepository
from app.modules.notifications.services import NOTIFICATION_EMAIL_REQUESTED_EVENT
from app.modules.outbox.models import OutboxEvent
from app.modules.users.repositories import UserRepository


@dataclass(frozen=True)
class NotificationEmailHandler:
    email_adapter: EmailAdapter

    async def __call__(self, session: AsyncSession, event: OutboxEvent) -> None:
        if event.event_type != NOTIFICATION_EMAIL_REQUESTED_EVENT:
            raise ValueError(f"Unsupported notification event: {event.event_type}")
        notification_id = notification_id_from_payload(event.payload)
        notifications = NotificationRepository(session)
        notification = await notifications.get_by_id(notification_id)
        if notification is None:
            raise ValueError("Notification not found")
        user = await UserRepository(session).get_by_id(notification.user_id)
        if user is None:
            raise ValueError("Notification user not found")

        result = await self.email_adapter.send(
            EmailMessage(
                to=(user.email,),
                subject=notification.title,
                text_body=notification.message,
                metadata={
                    "notification_id": str(notification.id),
                    "notification_type": notification.type,
                },
            )
        )
        mark_notification_email_sent(
            notification,
            adapter=result.adapter,
            provider_message_id=result.provider_message_id,
            sent_at=datetime.now(UTC),
        )


def build_notification_email_handler(settings: Settings) -> NotificationEmailHandler:
    return NotificationEmailHandler(email_adapter=build_email_adapter(settings))


def notification_id_from_payload(payload: dict[str, object]) -> uuid.UUID:
    value = payload.get("notification_id")
    if not isinstance(value, str):
        raise ValueError("Notification email event payload is invalid")
    return uuid.UUID(value)


def mark_notification_email_sent(
    notification: Notification,
    *,
    adapter: str,
    provider_message_id: str,
    sent_at: datetime,
) -> None:
    notification.email_delivery_status = "sent"
    notification.email_sent_at = sent_at
    notification.email_adapter = adapter
    notification.email_provider_message_id = provider_message_id
    notification.email_error = None
