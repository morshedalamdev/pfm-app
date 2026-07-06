from __future__ import annotations

import base64
import uuid
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class LoanPersonPageCursor:
    created_at: datetime
    id: uuid.UUID


@dataclass(frozen=True)
class LoanRecordPageCursor:
    issued_at: datetime
    created_at: datetime
    id: uuid.UUID


@dataclass(frozen=True)
class LoanSettlementPageCursor:
    settled_at: datetime
    created_at: datetime
    id: uuid.UUID


def encode_person_cursor(created_at: datetime, person_id: uuid.UUID) -> str:
    raw_cursor = f"{created_at.isoformat()}|{person_id}"
    return base64.urlsafe_b64encode(raw_cursor.encode()).decode()


def decode_person_cursor(cursor: str | None) -> LoanPersonPageCursor | None:
    if cursor is None:
        return None

    try:
        decoded = base64.urlsafe_b64decode(cursor.encode()).decode()
        created_at_value, person_id_value = decoded.split("|", maxsplit=1)
        return LoanPersonPageCursor(
            created_at=datetime.fromisoformat(created_at_value),
            id=uuid.UUID(person_id_value),
        )
    except (ValueError, UnicodeDecodeError) as exc:
        raise InvalidLoanPersonCursorError from exc


def encode_record_cursor(
    issued_at: datetime,
    created_at: datetime,
    record_id: uuid.UUID,
) -> str:
    raw_cursor = f"{issued_at.isoformat()}|{created_at.isoformat()}|{record_id}"
    return base64.urlsafe_b64encode(raw_cursor.encode()).decode()


def decode_record_cursor(cursor: str | None) -> LoanRecordPageCursor | None:
    if cursor is None:
        return None

    try:
        decoded = base64.urlsafe_b64decode(cursor.encode()).decode()
        issued_at_value, created_at_value, record_id_value = decoded.split(
            "|",
            maxsplit=2,
        )
        return LoanRecordPageCursor(
            issued_at=datetime.fromisoformat(issued_at_value),
            created_at=datetime.fromisoformat(created_at_value),
            id=uuid.UUID(record_id_value),
        )
    except (ValueError, UnicodeDecodeError) as exc:
        raise InvalidLoanRecordCursorError from exc


def encode_settlement_cursor(
    settled_at: datetime,
    created_at: datetime,
    settlement_id: uuid.UUID,
) -> str:
    raw_cursor = f"{settled_at.isoformat()}|{created_at.isoformat()}|{settlement_id}"
    return base64.urlsafe_b64encode(raw_cursor.encode()).decode()


def decode_settlement_cursor(cursor: str | None) -> LoanSettlementPageCursor | None:
    if cursor is None:
        return None

    try:
        decoded = base64.urlsafe_b64decode(cursor.encode()).decode()
        settled_at_value, created_at_value, settlement_id_value = decoded.split(
            "|",
            maxsplit=2,
        )
        return LoanSettlementPageCursor(
            settled_at=datetime.fromisoformat(settled_at_value),
            created_at=datetime.fromisoformat(created_at_value),
            id=uuid.UUID(settlement_id_value),
        )
    except (ValueError, UnicodeDecodeError) as exc:
        raise InvalidLoanSettlementCursorError from exc


class InvalidLoanPersonCursorError(Exception):
    pass


class InvalidLoanRecordCursorError(Exception):
    pass


class InvalidLoanSettlementCursorError(Exception):
    pass
