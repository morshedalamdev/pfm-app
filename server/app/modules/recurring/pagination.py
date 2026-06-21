from __future__ import annotations

import base64
import uuid
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class RecurringRulePageCursor:
    created_at: datetime
    id: uuid.UUID


def encode_recurring_rule_cursor(created_at: datetime, rule_id: uuid.UUID) -> str:
    raw_cursor = f"{created_at.isoformat()}|{rule_id}"
    return base64.urlsafe_b64encode(raw_cursor.encode()).decode()


def decode_recurring_rule_cursor(
    cursor: str | None,
) -> RecurringRulePageCursor | None:
    if cursor is None:
        return None

    try:
        decoded = base64.urlsafe_b64decode(cursor.encode()).decode()
        created_at_value, rule_id_value = decoded.split("|", maxsplit=1)
        return RecurringRulePageCursor(
            created_at=datetime.fromisoformat(created_at_value),
            id=uuid.UUID(rule_id_value),
        )
    except (ValueError, UnicodeDecodeError) as exc:
        raise InvalidRecurringRuleCursorError from exc


class InvalidRecurringRuleCursorError(Exception):
    pass
