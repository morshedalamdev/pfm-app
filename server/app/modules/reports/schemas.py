from __future__ import annotations

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, Field, WithJsonSchema, field_validator, model_validator

REPORT_DECIMAL_STRING_SCHEMA = {
    "type": "string",
    "pattern": r"^(?!^[-+.]*$)[+-]?0*\d*\.?\d*$",
    "description": "Decimal string serialized from Python Decimal.",
    "examples": ["12.3400"],
}

type ReportAmount = Annotated[
    Decimal,
    Field(max_digits=18, decimal_places=4),
    WithJsonSchema(REPORT_DECIMAL_STRING_SCHEMA),
]
type ReportPercent = Annotated[
    Decimal,
    Field(max_digits=9, decimal_places=4),
    WithJsonSchema(REPORT_DECIMAL_STRING_SCHEMA),
]
type CurrencyCode = Annotated[
    str,
    Field(min_length=3, max_length=3, pattern=r"^[A-Z]{3}$"),
]
type MonthKey = Annotated[
    str,
    Field(pattern=r"^\d{4}-\d{2}$"),
]

type DashboardPeriod = Literal["week", "month", "year"]
type ReportTransactionType = Literal["income", "expense"]
type ReportInterval = Literal["day", "week", "month"]


class DashboardReportQuery(BaseModel):
    period: DashboardPeriod
    type: ReportTransactionType
    as_of: date | None = None


class MonthlyReportQuery(BaseModel):
    month: MonthKey

    @field_validator("month")
    @classmethod
    def validate_month(cls, month: str) -> str:
        month_number = int(month[-2:])
        if month_number < 1 or month_number > 12:
            raise ValueError("Month must use YYYY-MM format with a valid month")
        return month


class ReportDateTimeRangeQuery(BaseModel):
    date_from: datetime
    date_to: datetime

    @field_validator("date_from", "date_to")
    @classmethod
    def normalize_datetime(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Report date ranges must include timezone information")
        return value.astimezone(UTC)

    @model_validator(mode="after")
    def validate_range(self) -> ReportDateTimeRangeQuery:
        if self.date_from >= self.date_to:
            raise ValueError("Report date_from must be before date_to")
        return self


class ReportDateRangeQuery(ReportDateTimeRangeQuery):
    interval: ReportInterval


class ReportRangeResponse(BaseModel):
    start_at: datetime
    end_at: datetime
    timezone: Literal["UTC"] = "UTC"


class DashboardChartBucketResponse(BaseModel):
    label: str
    start_at: datetime
    end_at: datetime
    amount: ReportAmount
    is_current: bool = False


class DashboardReportResponse(BaseModel):
    period: DashboardPeriod
    type: ReportTransactionType
    range: ReportRangeResponse
    currency: CurrencyCode
    available_balance: ReportAmount
    income_amount: ReportAmount
    expense_amount: ReportAmount
    net_flow_amount: ReportAmount
    buckets: list[DashboardChartBucketResponse]


class MonthlyTrendMostExpensiveDayResponse(BaseModel):
    date: date
    amount: ReportAmount


class MonthlyTrendResponse(BaseModel):
    average_daily_spending: ReportAmount
    most_expensive_day: MonthlyTrendMostExpensiveDayResponse | None
    budget_adherence_percent: ReportPercent | None


class MonthlyTopExpenseResponse(BaseModel):
    category_id: uuid.UUID | None
    category_name: str
    amount: ReportAmount
    transaction_count: int = Field(ge=0)
    budget_limit_amount: ReportAmount | None
    budget_percent_used: ReportPercent | None


class MonthlySummaryReportResponse(BaseModel):
    month: MonthKey
    range: ReportRangeResponse
    currency: CurrencyCode
    savings_amount: ReportAmount
    savings_month_over_month_percent: ReportPercent
    income_amount: ReportAmount
    expense_amount: ReportAmount
    net_flow_amount: ReportAmount
    active_savings_goal_count: int = Field(ge=0)
    budget_used_percent: ReportPercent | None
    top_expenses: list[MonthlyTopExpenseResponse]
    trends: MonthlyTrendResponse


class CashFlowBucketResponse(BaseModel):
    label: str
    start_at: datetime
    end_at: datetime
    income_amount: ReportAmount
    expense_amount: ReportAmount
    net_flow_amount: ReportAmount


class CashFlowReportResponse(BaseModel):
    range: ReportRangeResponse
    interval: ReportInterval
    currency: CurrencyCode
    buckets: list[CashFlowBucketResponse]


class SpendingByCategoryItemResponse(BaseModel):
    category_id: uuid.UUID | None
    category_name: str
    icon_key: str | None
    amount: ReportAmount
    percent: ReportPercent


class SpendingByCategoryReportResponse(BaseModel):
    range: ReportRangeResponse
    currency: CurrencyCode
    total_amount: ReportAmount
    items: list[SpendingByCategoryItemResponse]
