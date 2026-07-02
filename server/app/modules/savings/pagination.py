from __future__ import annotations

import base64
import uuid
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class SavingsGoalPageCursor:
    created_at: datetime
    id: uuid.UUID


@dataclass(frozen=True)
class SavingsContributionPageCursor:
    contributed_at: datetime
    created_at: datetime
    id: uuid.UUID


def encode_goal_cursor(created_at: datetime, goal_id: uuid.UUID) -> str:
    raw_cursor = f"{created_at.isoformat()}|{goal_id}"
    return base64.urlsafe_b64encode(raw_cursor.encode()).decode()


def decode_goal_cursor(cursor: str | None) -> SavingsGoalPageCursor | None:
    if cursor is None:
        return None

    try:
        decoded = base64.urlsafe_b64decode(cursor.encode()).decode()
        created_at_value, goal_id_value = decoded.split("|", maxsplit=1)
        return SavingsGoalPageCursor(
            created_at=datetime.fromisoformat(created_at_value),
            id=uuid.UUID(goal_id_value),
        )
    except (ValueError, UnicodeDecodeError) as exc:
        raise InvalidSavingsGoalCursorError from exc


def encode_contribution_cursor(
    contributed_at: datetime,
    created_at: datetime,
    contribution_id: uuid.UUID,
) -> str:
    raw_cursor = (
        f"{contributed_at.isoformat()}|{created_at.isoformat()}|{contribution_id}"
    )
    return base64.urlsafe_b64encode(raw_cursor.encode()).decode()


def decode_contribution_cursor(
    cursor: str | None,
) -> SavingsContributionPageCursor | None:
    if cursor is None:
        return None

    try:
        decoded = base64.urlsafe_b64decode(cursor.encode()).decode()
        contributed_at_value, created_at_value, contribution_id_value = decoded.split(
            "|",
            maxsplit=2,
        )
        return SavingsContributionPageCursor(
            contributed_at=datetime.fromisoformat(contributed_at_value),
            created_at=datetime.fromisoformat(created_at_value),
            id=uuid.UUID(contribution_id_value),
        )
    except (ValueError, UnicodeDecodeError) as exc:
        raise InvalidSavingsContributionCursorError from exc


class InvalidSavingsGoalCursorError(Exception):
    pass


class InvalidSavingsContributionCursorError(Exception):
    pass
