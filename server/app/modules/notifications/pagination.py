from __future__ import annotations

import base64
import uuid
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class NotificationPageCursor:
    created_at: datetime
    id: uuid.UUID


def encode_notification_cursor(
    created_at: datetime,
    notification_id: uuid.UUID,
) -> str:
    raw_cursor = f"{created_at.isoformat()}|{notification_id}"
    return base64.urlsafe_b64encode(raw_cursor.encode()).decode()


def decode_notification_cursor(cursor: str | None) -> NotificationPageCursor | None:
    if cursor is None:
        return None

    try:
        decoded = base64.urlsafe_b64decode(cursor.encode()).decode()
        created_at_value, notification_id_value = decoded.split("|", maxsplit=1)
        return NotificationPageCursor(
            created_at=datetime.fromisoformat(created_at_value),
            id=uuid.UUID(notification_id_value),
        )
    except (ValueError, UnicodeDecodeError) as exc:
        raise InvalidNotificationCursorError from exc


class InvalidNotificationCursorError(Exception):
    pass
