from __future__ import annotations

import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.money import PositiveMoney

LoanDirection = Literal["given", "taken"]
LoanRecordStatus = Literal["open", "settled", "archived"]
LoanRecordListStatus = Literal["all", "open", "settled", "archived"]


class LoanPersonCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone_number: str = Field(min_length=1, max_length=40)
    note: str | None = Field(default=None, max_length=500)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, name: str) -> str:
        normalized_name = name.strip()
        if not normalized_name:
            raise ValueError("Person name is required")
        return normalized_name

    @field_validator("phone_number")
    @classmethod
    def normalize_phone_number(cls, phone_number: str) -> str:
        normalized_phone_number = phone_number.strip()
        if not normalized_phone_number:
            raise ValueError("Phone number is required")
        return normalized_phone_number

    @field_validator("note")
    @classmethod
    def normalize_note(cls, note: str | None) -> str | None:
        if note is None:
            return None
        normalized_note = note.strip()
        return normalized_note or None


class LoanPersonUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    phone_number: str | None = Field(default=None, min_length=1, max_length=40)
    note: str | None = Field(default=None, max_length=500)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, name: str | None) -> str | None:
        if name is None:
            return None
        normalized_name = name.strip()
        if not normalized_name:
            raise ValueError("Person name is required")
        return normalized_name

    @field_validator("phone_number")
    @classmethod
    def normalize_phone_number(cls, phone_number: str | None) -> str | None:
        if phone_number is None:
            return None
        normalized_phone_number = phone_number.strip()
        if not normalized_phone_number:
            raise ValueError("Phone number is required")
        return normalized_phone_number

    @field_validator("note")
    @classmethod
    def normalize_note(cls, note: str | None) -> str | None:
        if note is None:
            return None
        normalized_note = note.strip()
        return normalized_note or None


class LoanRecordCreateRequest(BaseModel):
    person_id: uuid.UUID
    account_id: uuid.UUID
    direction: LoanDirection
    principal_amount: PositiveMoney
    currency: str = Field(default="USD", min_length=3, max_length=3)
    issued_at: datetime
    note: str | None = Field(default=None, max_length=500)

    @field_validator("principal_amount", mode="before")
    @classmethod
    def reject_float_money(cls, amount: object) -> object:
        if isinstance(amount, float):
            raise ValueError("Money values must be decimal strings")
        return amount

    @field_validator("currency", mode="before")
    @classmethod
    def normalize_currency(cls, currency: object) -> object:
        if not isinstance(currency, str):
            return currency
        normalized_currency = currency.strip().upper()
        if len(normalized_currency) != 3 or not normalized_currency.isalpha():
            raise ValueError("Currency must be a three-letter ISO code")
        return normalized_currency

    @field_validator("issued_at")
    @classmethod
    def normalize_issued_at(cls, issued_at: datetime) -> datetime:
        return normalize_timezone_datetime(issued_at, "Loan date")

    @field_validator("note")
    @classmethod
    def normalize_note(cls, note: str | None) -> str | None:
        if note is None:
            return None
        normalized_note = note.strip()
        return normalized_note or None


class LoanRecordUpdateRequest(BaseModel):
    person_id: uuid.UUID | None = None
    account_id: uuid.UUID | None = None
    direction: LoanDirection | None = None
    principal_amount: PositiveMoney | None = None
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    issued_at: datetime | None = None
    note: str | None = Field(default=None, max_length=500)

    @field_validator("principal_amount", mode="before")
    @classmethod
    def reject_float_money(cls, amount: object) -> object:
        if isinstance(amount, float):
            raise ValueError("Money values must be decimal strings")
        return amount

    @field_validator("currency", mode="before")
    @classmethod
    def normalize_currency(cls, currency: object) -> object:
        if currency is None:
            return None
        if not isinstance(currency, str):
            return currency
        normalized_currency = currency.strip().upper()
        if len(normalized_currency) != 3 or not normalized_currency.isalpha():
            raise ValueError("Currency must be a three-letter ISO code")
        return normalized_currency

    @field_validator("issued_at")
    @classmethod
    def normalize_issued_at(cls, issued_at: datetime | None) -> datetime | None:
        if issued_at is None:
            return None
        return normalize_timezone_datetime(issued_at, "Loan date")

    @field_validator("note")
    @classmethod
    def normalize_note(cls, note: str | None) -> str | None:
        if note is None:
            return None
        normalized_note = note.strip()
        return normalized_note or None


class LoanSettlementCreateRequest(BaseModel):
    amount: PositiveMoney
    settled_at: datetime
    note: str | None = Field(default=None, max_length=500)

    @field_validator("amount", mode="before")
    @classmethod
    def reject_float_money(cls, amount: object) -> object:
        if isinstance(amount, float):
            raise ValueError("Money values must be decimal strings")
        return amount

    @field_validator("settled_at")
    @classmethod
    def normalize_settled_at(cls, settled_at: datetime) -> datetime:
        return normalize_timezone_datetime(settled_at, "Settlement date")

    @field_validator("note")
    @classmethod
    def normalize_note(cls, note: str | None) -> str | None:
        if note is None:
            return None
        normalized_note = note.strip()
        return normalized_note or None


class LoanPersonResponse(BaseModel):
    id: uuid.UUID
    name: str
    phone_number: str
    note: str | None
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LoanPersonListResponse(BaseModel):
    items: list[LoanPersonResponse]
    next_cursor: str | None
    has_more: bool


class LoanRecordResponse(BaseModel):
    id: uuid.UUID
    person_id: uuid.UUID
    account_id: uuid.UUID | None
    direction: LoanDirection
    principal_amount: Decimal
    settled_amount: Decimal
    outstanding_amount: Decimal
    currency: str
    issued_at: datetime
    status: LoanRecordStatus
    note: str | None
    settled_at: datetime | None
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime


class LoanRecordListResponse(BaseModel):
    items: list[LoanRecordResponse]
    next_cursor: str | None
    has_more: bool


class LoanSettlementResponse(BaseModel):
    id: uuid.UUID
    record_id: uuid.UUID
    amount: Decimal
    currency: str
    settled_at: datetime
    note: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LoanSettlementListResponse(BaseModel):
    items: list[LoanSettlementResponse]
    next_cursor: str | None
    has_more: bool


class LoanSummaryResponse(BaseModel):
    currency: str
    total_loan_given: Decimal
    total_loan_taken: Decimal
    due_loan: Decimal


def normalize_timezone_datetime(value: datetime, field_label: str) -> datetime:
    if value.tzinfo is None:
        raise ValueError(f"{field_label} must include timezone information")
    return value.astimezone(UTC)
