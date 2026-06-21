from __future__ import annotations

import uuid
from calendar import month_abbr
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal

from app.modules.reports.repositories import BudgetAggregate, ReportRepository
from app.modules.reports.schemas import (
    CashFlowBucketResponse,
    CashFlowReportResponse,
    DashboardChartBucketResponse,
    DashboardPeriod,
    DashboardReportResponse,
    MonthlyReportQuery,
    MonthlySummaryReportResponse,
    MonthlyTopExpenseResponse,
    MonthlyTrendMostExpensiveDayResponse,
    MonthlyTrendResponse,
    ReportDateRangeQuery,
    ReportDateTimeRangeQuery,
    ReportInterval,
    ReportRangeResponse,
    ReportTransactionType,
    SpendingByCategoryItemResponse,
    SpendingByCategoryReportResponse,
)
from app.modules.users.models import User

BASE_CURRENCY = "USD"
ZERO_AMOUNT = Decimal("0.0000")
HUNDRED_PERCENT = Decimal("100")
TOP_EXPENSE_LIMIT = 5
REPORT_QUANT = Decimal("0.0001")


@dataclass(frozen=True)
class DashboardBucket:
    label: str
    start_at: datetime
    end_at: datetime
    is_current: bool


@dataclass(frozen=True)
class ReportBucket:
    label: str
    start_at: datetime
    end_at: datetime


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

    async def get_monthly_summary_report(
        self,
        current_user: User,
        *,
        query: MonthlyReportQuery,
    ) -> MonthlySummaryReportResponse:
        report_start, report_end = month_key_range(query.month)
        previous_start, previous_end = previous_month_range(report_start.date())
        day_buckets = report_buckets(report_start, report_end, "day")

        (
            income_amount,
            expense_amount,
        ) = await self.reports.calculate_period_income_expense(
            current_user.id,
            start_at=report_start,
            end_at=report_end,
        )
        savings_amount = await self.reports.calculate_savings_contributions(
            current_user.id,
            start_at=report_start,
            end_at=report_end,
        )
        previous_savings_amount = await self.reports.calculate_savings_contributions(
            current_user.id,
            start_at=previous_start,
            end_at=previous_end,
        )
        active_savings_goal_count = await self.reports.count_active_savings_goals(
            current_user.id
        )
        budget_aggregates = await self.reports.list_budget_aggregates_for_month(
            current_user.id,
            month_start=report_start.date(),
            month_end=report_end.date(),
        )
        budget_used_percent = budget_percent_used(budget_aggregates)
        category_budget_map = category_budget_aggregate_map(budget_aggregates)
        top_expenses = await self.reports.list_expense_category_aggregates(
            current_user.id,
            start_at=report_start,
            end_at=report_end,
            limit=TOP_EXPENSE_LIMIT,
        )
        daily_expense_amounts = [
            await self.reports.calculate_expense_amount(
                current_user.id,
                start_at=bucket.start_at,
                end_at=bucket.end_at,
            )
            for bucket in day_buckets
        ]
        most_expensive_day = monthly_most_expensive_day(
            day_buckets,
            daily_expense_amounts,
        )

        return MonthlySummaryReportResponse(
            month=query.month,
            range=ReportRangeResponse(start_at=report_start, end_at=report_end),
            currency=BASE_CURRENCY,
            savings_amount=savings_amount,
            savings_month_over_month_percent=month_over_month_percent(
                current_amount=savings_amount,
                previous_amount=previous_savings_amount,
            ),
            income_amount=income_amount,
            expense_amount=expense_amount,
            net_flow_amount=income_amount - expense_amount,
            active_savings_goal_count=active_savings_goal_count,
            budget_used_percent=budget_used_percent,
            top_expenses=[
                MonthlyTopExpenseResponse(
                    category_id=expense.category_id,
                    category_name=expense.category_name,
                    amount=expense.amount,
                    transaction_count=expense.transaction_count,
                    budget_limit_amount=(
                        category_budget_map[expense.category_id].limit_amount
                        if expense.category_id in category_budget_map
                        else None
                    ),
                    budget_percent_used=(
                        percent(
                            category_budget_map[expense.category_id].spent_amount,
                            category_budget_map[expense.category_id].limit_amount,
                        )
                        if expense.category_id in category_budget_map
                        else None
                    ),
                )
                for expense in top_expenses
            ],
            trends=MonthlyTrendResponse(
                average_daily_spending=average_daily_amount(
                    expense_amount,
                    day_count=len(day_buckets),
                ),
                most_expensive_day=most_expensive_day,
                budget_adherence_percent=budget_used_percent,
            ),
        )

    async def get_cash_flow_report(
        self,
        current_user: User,
        *,
        query: ReportDateRangeQuery,
    ) -> CashFlowReportResponse:
        buckets = report_buckets(query.date_from, query.date_to, query.interval)
        bucket_responses = []
        for bucket in buckets:
            (
                income_amount,
                expense_amount,
            ) = await self.reports.calculate_period_income_expense(
                current_user.id,
                start_at=bucket.start_at,
                end_at=bucket.end_at,
            )
            bucket_responses.append(
                CashFlowBucketResponse(
                    label=bucket.label,
                    start_at=bucket.start_at,
                    end_at=bucket.end_at,
                    income_amount=income_amount,
                    expense_amount=expense_amount,
                    net_flow_amount=income_amount - expense_amount,
                )
            )

        return CashFlowReportResponse(
            range=ReportRangeResponse(start_at=query.date_from, end_at=query.date_to),
            interval=query.interval,
            currency=BASE_CURRENCY,
            buckets=bucket_responses,
        )

    async def get_spending_by_category_report(
        self,
        current_user: User,
        *,
        query: ReportDateTimeRangeQuery,
    ) -> SpendingByCategoryReportResponse:
        category_expenses = await self.reports.list_expense_category_aggregates(
            current_user.id,
            start_at=query.date_from,
            end_at=query.date_to,
        )
        total_amount = sum(
            (category.amount for category in category_expenses),
            ZERO_AMOUNT,
        )
        return SpendingByCategoryReportResponse(
            range=ReportRangeResponse(start_at=query.date_from, end_at=query.date_to),
            currency=BASE_CURRENCY,
            total_amount=total_amount,
            items=[
                SpendingByCategoryItemResponse(
                    category_id=category.category_id,
                    category_name=category.category_name,
                    icon_key=category.icon_key,
                    amount=category.amount,
                    percent=percent(category.amount, total_amount),
                )
                for category in category_expenses
            ],
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


def month_key_range(month: str) -> tuple[datetime, datetime]:
    year = int(month[:4])
    month_number = int(month[-2:])
    start_date = date(year, month_number, 1)
    return at_utc_start(start_date), at_utc_start(next_month_start(start_date))


def previous_month_range(month_start: date) -> tuple[datetime, datetime]:
    if month_start.month == 1:
        previous_start = date(month_start.year - 1, 12, 1)
    else:
        previous_start = date(month_start.year, month_start.month - 1, 1)
    return at_utc_start(previous_start), at_utc_start(month_start)


def report_buckets(
    start_at: datetime,
    end_at: datetime,
    interval: ReportInterval,
) -> list[ReportBucket]:
    buckets: list[ReportBucket] = []
    current_start = start_at
    while current_start < end_at:
        next_start = min(next_report_boundary(current_start, interval), end_at)
        buckets.append(
            ReportBucket(
                label=report_bucket_label(current_start, interval),
                start_at=current_start,
                end_at=next_start,
            )
        )
        current_start = next_start
    return buckets


def next_report_boundary(value: datetime, interval: ReportInterval) -> datetime:
    if interval == "day":
        return at_utc_start(value.date() + timedelta(days=1))
    if interval == "week":
        return at_utc_start(
            value.date() + timedelta(days=days_until_next_sunday(value.date()))
        )
    return at_utc_start(next_month_start(value.date()))


def days_until_next_sunday(value: date) -> int:
    days = (7 - days_since_sunday(value)) % 7
    return days or 7


def report_bucket_label(value: datetime, interval: ReportInterval) -> str:
    bucket_date = value.date()
    if interval == "week":
        return f"Week of {month_abbr[bucket_date.month]} {bucket_date.day}"
    if interval == "month":
        return f"{month_abbr[bucket_date.month]} {bucket_date.year}"
    return f"{month_abbr[bucket_date.month]} {bucket_date.day}"


def month_over_month_percent(
    *,
    current_amount: Decimal,
    previous_amount: Decimal,
) -> Decimal:
    if previous_amount == ZERO_AMOUNT:
        return ZERO_AMOUNT if current_amount == ZERO_AMOUNT else HUNDRED_PERCENT
    return quantize_report_decimal(
        ((current_amount - previous_amount) / previous_amount) * HUNDRED_PERCENT
    )


def percent(amount: Decimal, total: Decimal) -> Decimal:
    if total == ZERO_AMOUNT:
        return ZERO_AMOUNT
    return quantize_report_decimal((amount / total) * HUNDRED_PERCENT)


def average_daily_amount(amount: Decimal, *, day_count: int) -> Decimal:
    if day_count == 0:
        return ZERO_AMOUNT
    return quantize_report_decimal(amount / Decimal(day_count))


def quantize_report_decimal(amount: Decimal) -> Decimal:
    return amount.quantize(REPORT_QUANT)


def budget_percent_used(budgets: list[BudgetAggregate]) -> Decimal | None:
    if not budgets:
        return None
    scoped_budgets = [budget for budget in budgets if budget.category_id is None]
    if not scoped_budgets:
        scoped_budgets = budgets
    limit_amount = sum((budget.limit_amount for budget in scoped_budgets), ZERO_AMOUNT)
    spent_amount = sum((budget.spent_amount for budget in scoped_budgets), ZERO_AMOUNT)
    if limit_amount == ZERO_AMOUNT:
        return None
    return percent(spent_amount, limit_amount)


def category_budget_aggregate_map(
    budgets: list[BudgetAggregate],
) -> dict[uuid.UUID | None, BudgetAggregate]:
    category_budgets = [budget for budget in budgets if budget.category_id is not None]
    budget_map: dict[uuid.UUID | None, BudgetAggregate] = {}
    for budget in category_budgets:
        existing = budget_map.get(budget.category_id)
        if existing is None:
            budget_map[budget.category_id] = budget
        else:
            budget_map[budget.category_id] = BudgetAggregate(
                category_id=budget.category_id,
                limit_amount=existing.limit_amount + budget.limit_amount,
                spent_amount=existing.spent_amount + budget.spent_amount,
            )
    return budget_map


def monthly_most_expensive_day(
    buckets: list[ReportBucket],
    amounts: list[Decimal],
) -> MonthlyTrendMostExpensiveDayResponse | None:
    if not buckets or not amounts:
        return None
    max_index, max_amount = max(enumerate(amounts), key=lambda item: item[1])
    if max_amount == ZERO_AMOUNT:
        return None
    return MonthlyTrendMostExpensiveDayResponse(
        date=buckets[max_index].start_at.date(),
        amount=max_amount,
    )
