from __future__ import annotations

import base64
import uuid
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class PageCursor:
    created_at: datetime
    id: uuid.UUID


def encode_cursor(created_at: datetime, record_id: uuid.UUID) -> str:
    raw_cursor = f"{created_at.isoformat()}|{record_id}"
    return base64.urlsafe_b64encode(raw_cursor.encode()).decode()


def decode_cursor(cursor: str | None) -> PageCursor | None:
    if cursor is None:
        return None

    try:
        decoded = base64.urlsafe_b64decode(cursor.encode()).decode()
        created_at_value, record_id_value = decoded.split("|", maxsplit=1)
        return PageCursor(
            created_at=datetime.fromisoformat(created_at_value),
            id=uuid.UUID(record_id_value),
        )
    except (ValueError, UnicodeDecodeError) as exc:
        raise InvalidCursorError from exc


class InvalidCursorError(Exception):
    pass
