from __future__ import annotations

from calendar import month_abbr
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta

from app.modules.reports.repositories import ReportRepository
from app.modules.reports.schemas import (
    DashboardChartBucketResponse,
    DashboardPeriod,
    DashboardReportResponse,
    ReportRangeResponse,
    ReportTransactionType,
)
from app.modules.users.models import User

BASE_CURRENCY = "USD"


@dataclass(frozen=True)
class DashboardBucket:
    label: str
    start_at: datetime
    end_at: datetime
    is_current: bool


class ReportService:
    def __init__(self, reports: ReportRepository) -> None:
        self.reports = reports

    async def get_dashboard_report(
        self,
        current_user: User,
        *,
        period: DashboardPeriod,
        transaction_type: ReportTransactionType,
        as_of: date | None,
    ) -> DashboardReportResponse:
        reference_date = as_of or datetime.now(UTC).date()
        report_start, report_end = dashboard_period_range(period, reference_date)
        buckets = dashboard_buckets(period, reference_date, report_start, report_end)

        available_balance = await self.reports.calculate_active_available_balance(
            current_user.id
        )
        (
            income_amount,
            expense_amount,
        ) = await self.reports.calculate_period_income_expense(
            current_user.id,
            start_at=report_start,
            end_at=report_end,
        )
        bucket_responses = [
            DashboardChartBucketResponse(
                label=bucket.label,
                start_at=bucket.start_at,
                end_at=bucket.end_at,
                amount=await self.reports.calculate_bucket_amount(
                    current_user.id,
                    transaction_type=transaction_type,
                    start_at=bucket.start_at,
                    end_at=bucket.end_at,
                ),
                is_current=bucket.is_current,
            )
            for bucket in buckets
        ]

        return DashboardReportResponse(
            period=period,
            type=transaction_type,
            range=ReportRangeResponse(start_at=report_start, end_at=report_end),
            currency=BASE_CURRENCY,
            available_balance=available_balance,
            income_amount=income_amount,
            expense_amount=expense_amount,
            net_flow_amount=income_amount - expense_amount,
            buckets=bucket_responses,
        )


def dashboard_period_range(
    period: DashboardPeriod,
    reference_date: date,
) -> tuple[datetime, datetime]:
    if period == "week":
        start_date = reference_date - timedelta(days=days_since_sunday(reference_date))
        end_date = start_date + timedelta(days=7)
        return at_utc_start(start_date), at_utc_start(end_date)

    if period == "month":
        start_date = reference_date.replace(day=1)
        return at_utc_start(start_date), at_utc_start(next_month_start(start_date))

    start_date = date(reference_date.year, 1, 1)
    end_date = date(reference_date.year + 1, 1, 1)
    return at_utc_start(start_date), at_utc_start(end_date)


def dashboard_buckets(
    period: DashboardPeriod,
    reference_date: date,
    report_start: datetime,
    report_end: datetime,
) -> list[DashboardBucket]:
    if period == "week":
        return daily_dashboard_buckets(
            reference_date, report_start, report_end, label_style="weekday"
        )
    if period == "month":
        return daily_dashboard_buckets(
            reference_date, report_start, report_end, label_style="month_day"
        )
    return monthly_dashboard_buckets(reference_date, report_start, report_end)


def daily_dashboard_buckets(
    reference_date: date,
    report_start: datetime,
    report_end: datetime,
    *,
    label_style: str,
) -> list[DashboardBucket]:
    buckets: list[DashboardBucket] = []
    current_start = report_start
    while current_start < report_end:
        next_start = current_start + timedelta(days=1)
        bucket_date = current_start.date()
        buckets.append(
            DashboardBucket(
                label=day_label(bucket_date, label_style),
                start_at=current_start,
                end_at=next_start,
                is_current=bucket_date == reference_date,
            )
        )
        current_start = next_start
    return buckets


def monthly_dashboard_buckets(
    reference_date: date,
    report_start: datetime,
    report_end: datetime,
) -> list[DashboardBucket]:
    buckets: list[DashboardBucket] = []
    current_date = report_start.date()
    while at_utc_start(current_date) < report_end:
        next_date = next_month_start(current_date)
        buckets.append(
            DashboardBucket(
                label=month_abbr[current_date.month],
                start_at=at_utc_start(current_date),
                end_at=at_utc_start(next_date),
                is_current=current_date.month == reference_date.month,
            )
        )
        current_date = next_date
    return buckets


def day_label(bucket_date: date, label_style: str) -> str:
    if label_style == "month_day":
        return str(bucket_date.day)
    if days_since_sunday(bucket_date) == 0:
        return "Sun"
    if days_since_sunday(bucket_date) == 1:
        return "Mon"
    if days_since_sunday(bucket_date) == 2:
        return "Tue"
    if days_since_sunday(bucket_date) == 3:
        return "Wed"
    if days_since_sunday(bucket_date) == 4:
        return "Thu"
    if days_since_sunday(bucket_date) == 5:
        return "Fri"
    return "Sat"


def days_since_sunday(value: date) -> int:
    return (value.weekday() + 1) % 7


def at_utc_start(value: date) -> datetime:
    return datetime.combine(value, time.min, tzinfo=UTC)


def next_month_start(value: date) -> date:
    if value.month == 12:
        return date(value.year + 1, 1, 1)
    return date(value.year, value.month + 1, 1)
