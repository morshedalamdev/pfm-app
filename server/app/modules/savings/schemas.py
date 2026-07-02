from __future__ import annotations

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.money import NonNegativeMoney, PositiveMoney

SavingsGoalStatus = Literal["active", "completed", "archived"]
SavingsGoalListStatus = Literal["all", "active", "completed", "archived"]


class SavingsGoalCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    target_amount: PositiveMoney
    monthly_target_amount: NonNegativeMoney = Decimal("0")
    currency: str = Field(default="USD", min_length=3, max_length=3)
    target_date: date | None = None
    note: str | None = Field(default=None, max_length=500)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, name: str) -> str:
        normalized_name = name.strip()
        if not normalized_name:
            raise ValueError("Savings goal name is required")
        return normalized_name

    @field_validator("target_amount", "monthly_target_amount", mode="before")
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

    @field_validator("target_date")
    @classmethod
    def validate_target_date(cls, target_date: date | None) -> date | None:
        if target_date is not None and target_date < date.today():
            raise ValueError("Savings goal target date must not be in the past")
        return target_date

    @field_validator("note")
    @classmethod
    def normalize_note(cls, note: str | None) -> str | None:
        if note is None:
            return None
        normalized_note = note.strip()
        return normalized_note or None


class SavingsGoalUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    target_amount: PositiveMoney | None = None
    monthly_target_amount: NonNegativeMoney | None = None
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    target_date: date | None = None
    note: str | None = Field(default=None, max_length=500)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, name: str | None) -> str | None:
        if name is None:
            return None
        normalized_name = name.strip()
        if not normalized_name:
            raise ValueError("Savings goal name is required")
        return normalized_name

    @field_validator("target_amount", "monthly_target_amount", mode="before")
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

    @field_validator("target_date")
    @classmethod
    def validate_target_date(cls, target_date: date | None) -> date | None:
        if target_date is not None and target_date < date.today():
            raise ValueError("Savings goal target date must not be in the past")
        return target_date

    @field_validator("note")
    @classmethod
    def normalize_note(cls, note: str | None) -> str | None:
        if note is None:
            return None
        normalized_note = note.strip()
        return normalized_note or None


class SavingsContributionCreateRequest(BaseModel):
    amount: PositiveMoney
    contributed_at: datetime
    note: str | None = Field(default=None, max_length=500)

    @field_validator("amount", mode="before")
    @classmethod
    def reject_float_money(cls, amount: object) -> object:
        if isinstance(amount, float):
            raise ValueError("Money values must be decimal strings")
        return amount

    @field_validator("contributed_at")
    @classmethod
    def normalize_contributed_at(cls, contributed_at: datetime) -> datetime:
        if contributed_at.tzinfo is None:
            raise ValueError("Contribution date must include timezone information")
        return contributed_at.astimezone(UTC)

    @field_validator("note")
    @classmethod
    def normalize_note(cls, note: str | None) -> str | None:
        if note is None:
            return None
        normalized_note = note.strip()
        return normalized_note or None


class SavingsGoalProgressResponse(BaseModel):
    saved_amount: Decimal
    remaining_amount: Decimal
    percent_complete: Decimal
    is_target_met: bool


class SavingsGoalResponse(BaseModel):
    id: uuid.UUID
    name: str
    target_amount: Decimal
    monthly_target_amount: Decimal
    currency: str
    target_date: date | None
    status: SavingsGoalStatus
    note: str | None
    completed_at: datetime | None
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime
    progress: SavingsGoalProgressResponse

    model_config = ConfigDict(from_attributes=True)


class SavingsGoalListResponse(BaseModel):
    items: list[SavingsGoalResponse]
    next_cursor: str | None
    has_more: bool


class SavingsContributionResponse(BaseModel):
    id: uuid.UUID
    goal_id: uuid.UUID
    amount: Decimal
    currency: str
    contributed_at: datetime
    note: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SavingsContributionListResponse(BaseModel):
    items: list[SavingsContributionResponse]
    next_cursor: str | None
    has_more: bool
