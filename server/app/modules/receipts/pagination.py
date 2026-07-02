from __future__ import annotations

import base64
import uuid
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class ReceiptPageCursor:
    created_at: datetime
    id: uuid.UUID


def encode_receipt_cursor(created_at: datetime, receipt_id: uuid.UUID) -> str:
    raw_cursor = f"{created_at.isoformat()}|{receipt_id}"
    return base64.urlsafe_b64encode(raw_cursor.encode()).decode()


def decode_receipt_cursor(cursor: str | None) -> ReceiptPageCursor | None:
    if cursor is None:
        return None

    try:
        decoded = base64.urlsafe_b64decode(cursor.encode()).decode()
        created_at_value, receipt_id_value = decoded.split("|", maxsplit=1)
        return ReceiptPageCursor(
            created_at=datetime.fromisoformat(created_at_value),
            id=uuid.UUID(receipt_id_value),
        )
    except (ValueError, UnicodeDecodeError) as exc:
        raise InvalidReceiptCursorError from exc


class InvalidReceiptCursorError(Exception):
    pass
