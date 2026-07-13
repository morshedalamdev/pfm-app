from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.money import PositiveMoney
from app.modules.recurring.schedule import (
    InvalidRecurringScheduleError,
    normalize_aware_utc,
    validate_timezone,
)
from app.modules.transactions.schemas import TransactionResponse

RecurringTransactionType = Literal["income", "expense"]
RecurringFrequency = Literal["daily", "weekly", "monthly", "yearly"]
RecurringRuleStatus = Literal["active", "paused", "archived"]
RecurringRuleListStatus = Literal["all", "active", "paused", "archived"]


class RecurringRuleCreateRequest(BaseModel):
    account_id: uuid.UUID
    category_id: uuid.UUID
    transaction_type: RecurringTransactionType
    amount: PositiveMoney
    description: str | None = Field(default=None, max_length=500)
    frequency: RecurringFrequency
    interval_count: int = Field(default=1, ge=1, le=365)
    timezone: str = Field(default="UTC", min_length=1, max_length=64)
    start_at: datetime
    end_at: datetime | None = None

    @field_validator("amount", mode="before")
    @classmethod
    def reject_float_money(cls, amount: object) -> object:
        if isinstance(amount, float):
            raise ValueError("Money values must be decimal strings")
        return amount

    @field_validator("description")
    @classmethod
    def normalize_description(cls, description: str | None) -> str | None:
        if description is None:
            return None
        normalized_description = description.strip()
        return normalized_description or None

    @field_validator("timezone")
    @classmethod
    def normalize_timezone(cls, timezone: str) -> str:
        try:
            return validate_timezone(timezone)
        except InvalidRecurringScheduleError as exc:
            raise ValueError(str(exc)) from exc

    @field_validator("start_at", "end_at")
    @classmethod
    def normalize_datetime(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        try:
            return normalize_aware_utc(value)
        except InvalidRecurringScheduleError as exc:
            raise ValueError(str(exc)) from exc

    @model_validator(mode="after")
    def validate_bounds(self) -> RecurringRuleCreateRequest:
        if self.end_at is not None and self.end_at <= self.start_at:
            raise ValueError("End date must be after start date")
        return self


class RecurringRuleUpdateRequest(BaseModel):
    account_id: uuid.UUID | None = None
    category_id: uuid.UUID | None = None
    transaction_type: RecurringTransactionType | None = None
    amount: PositiveMoney | None = None
    description: str | None = Field(default=None, max_length=500)
    frequency: RecurringFrequency | None = None
    interval_count: int | None = Field(default=None, ge=1, le=365)
    timezone: str | None = Field(default=None, min_length=1, max_length=64)
    start_at: datetime | None = None
    end_at: datetime | None = None

    @field_validator("amount", mode="before")
    @classmethod
    def reject_float_money(cls, amount: object) -> object:
        if isinstance(amount, float):
            raise ValueError("Money values must be decimal strings")
        return amount

    @field_validator("description")
    @classmethod
    def normalize_description(cls, description: str | None) -> str | None:
        if description is None:
            return None
        normalized_description = description.strip()
        return normalized_description or None

    @field_validator("timezone")
    @classmethod
    def normalize_timezone(cls, timezone: str | None) -> str | None:
        if timezone is None:
            return None
        try:
            return validate_timezone(timezone)
        except InvalidRecurringScheduleError as exc:
            raise ValueError(str(exc)) from exc

    @field_validator("start_at", "end_at")
    @classmethod
    def normalize_datetime(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        try:
            return normalize_aware_utc(value)
        except InvalidRecurringScheduleError as exc:
            raise ValueError(str(exc)) from exc


class RecurringRuleResponse(BaseModel):
    id: uuid.UUID
    account_id: uuid.UUID
    category_id: uuid.UUID
    transaction_type: str
    amount: Decimal
    currency: str
    description: str | None
    frequency: str
    interval_count: int
    timezone: str
    start_at: datetime
    end_at: datetime | None
    next_run_at: datetime
    last_run_at: datetime | None
    last_run_key: str | None
    last_paid_period: str | None
    run_count: int
    status: RecurringRuleStatus
    paused_at: datetime | None
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RecurringRuleListResponse(BaseModel):
    items: list[RecurringRuleResponse]
    next_cursor: str | None
    has_more: bool


class RecurringExpensePaidRequest(BaseModel):
    paid_at: datetime

    @field_validator("paid_at")
    @classmethod
    def normalize_paid_at(cls, paid_at: datetime) -> datetime:
        try:
            return normalize_aware_utc(paid_at)
        except InvalidRecurringScheduleError as exc:
            raise ValueError(str(exc)) from exc


class RecurringExpensePaidResponse(BaseModel):
    transaction: TransactionResponse
    rule: RecurringRuleResponse


class RecurringExpenseReminderResponse(BaseModel):
    reminder_key: str
    period_key: str
    due_at: datetime
    rule: RecurringRuleResponse


class RecurringExpenseReminderListResponse(BaseModel):
    items: list[RecurringExpenseReminderResponse]
