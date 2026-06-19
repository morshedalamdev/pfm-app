from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.money import PositiveMoney

BudgetPeriodType = Literal["monthly", "custom"]
BudgetProgressStatus = Literal["on_track", "over_budget"]


class BudgetCreateRequest(BaseModel):
    category_id: uuid.UUID | None = None
    period_type: BudgetPeriodType
    period_start: date
    period_end: date
    limit_amount: PositiveMoney
    currency: str = Field(default="USD", min_length=3, max_length=3)

    @field_validator("currency", mode="before")
    @classmethod
    def normalize_currency(cls, currency: object) -> object:
        if not isinstance(currency, str):
            return currency
        normalized_currency = currency.strip().upper()
        if len(normalized_currency) != 3 or not normalized_currency.isalpha():
            raise ValueError("Currency must be a three-letter ISO code")
        return normalized_currency

    @field_validator("limit_amount", mode="before")
    @classmethod
    def reject_float_money(cls, limit_amount: object) -> object:
        if isinstance(limit_amount, float):
            raise ValueError("Money values must be decimal strings")
        return limit_amount

    @model_validator(mode="after")
    def validate_period(self) -> BudgetCreateRequest:
        validate_budget_period(self.period_type, self.period_start, self.period_end)
        return self


class BudgetUpdateRequest(BaseModel):
    category_id: uuid.UUID | None = None
    period_type: BudgetPeriodType | None = None
    period_start: date | None = None
    period_end: date | None = None
    limit_amount: PositiveMoney | None = None
    currency: str | None = Field(default=None, min_length=3, max_length=3)

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

    @field_validator("limit_amount", mode="before")
    @classmethod
    def reject_float_money(cls, limit_amount: object) -> object:
        if isinstance(limit_amount, float):
            raise ValueError("Money values must be decimal strings")
        return limit_amount


class BudgetProgressResponse(BaseModel):
    spent_amount: Decimal
    remaining_amount: Decimal
    percent_used: Decimal
    status: BudgetProgressStatus


class BudgetResponse(BaseModel):
    id: uuid.UUID
    category_id: uuid.UUID | None
    category_name: str | None
    period_type: str
    period_start: date
    period_end: date
    limit_amount: Decimal
    currency: str
    is_archived: bool
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime
    progress: BudgetProgressResponse

    model_config = ConfigDict(from_attributes=True)


class BudgetListResponse(BaseModel):
    items: list[BudgetResponse]
    next_cursor: str | None
    has_more: bool


def validate_budget_period(
    period_type: str,
    period_start: date,
    period_end: date,
) -> None:
    if period_start >= period_end:
        raise ValueError("Budget period start must be before period end")
    if period_type == "monthly" and (
        period_start.day != 1 or period_end != next_month_start(period_start)
    ):
        raise ValueError("Monthly budgets must match one calendar month")


def next_month_start(period_start: date) -> date:
    if period_start.month == 12:
        return date(period_start.year + 1, 1, 1)
    return date(period_start.year, period_start.month + 1, 1)
