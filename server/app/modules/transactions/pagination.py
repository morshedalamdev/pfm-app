from __future__ import annotations

import base64
import uuid
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class TransactionPageCursor:
    transaction_at: datetime
    created_at: datetime
    id: uuid.UUID


def encode_transaction_cursor(
    transaction_at: datetime,
    created_at: datetime,
    record_id: uuid.UUID,
) -> str:
    raw_cursor = f"{transaction_at.isoformat()}|{created_at.isoformat()}|{record_id}"
    return base64.urlsafe_b64encode(raw_cursor.encode()).decode()


def decode_transaction_cursor(cursor: str | None) -> TransactionPageCursor | None:
    if cursor is None:
        return None

    try:
        decoded = base64.urlsafe_b64decode(cursor.encode()).decode()
        transaction_at_value, created_at_value, record_id_value = decoded.split(
            "|", maxsplit=2
        )
        return TransactionPageCursor(
            transaction_at=datetime.fromisoformat(transaction_at_value),
            created_at=datetime.fromisoformat(created_at_value),
            id=uuid.UUID(record_id_value),
        )
    except (ValueError, UnicodeDecodeError) as exc:
        raise InvalidTransactionCursorError from exc


class InvalidTransactionCursorError(Exception):
    pass
