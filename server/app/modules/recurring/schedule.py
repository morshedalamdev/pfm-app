from __future__ import annotations

import calendar
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


class InvalidRecurringScheduleError(Exception):
    pass


def validate_timezone(timezone: str) -> str:
    normalized_timezone = timezone.strip()
    if not normalized_timezone:
        raise InvalidRecurringScheduleError("Timezone is required")
    try:
        ZoneInfo(normalized_timezone)
    except ZoneInfoNotFoundError as exc:
        raise InvalidRecurringScheduleError("Timezone is invalid") from exc
    return normalized_timezone


def normalize_aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        raise InvalidRecurringScheduleError("Datetime must include timezone")
    return value.astimezone(UTC)


def initial_next_run_at(start_at: datetime) -> datetime:
    return normalize_aware_utc(start_at)


def calculate_next_run_after(
    *,
    start_at: datetime,
    frequency: str,
    interval_count: int,
    timezone: str,
    after_at: datetime,
) -> datetime:
    if interval_count <= 0:
        raise InvalidRecurringScheduleError("Interval count must be positive")
    zone = ZoneInfo(validate_timezone(timezone))
    start_local = normalize_aware_utc(start_at).astimezone(zone)
    after_local = normalize_aware_utc(after_at).astimezone(zone)

    if frequency == "daily":
        return _next_timedelta_occurrence(
            start_local,
            after_local,
            step=timedelta(days=interval_count),
        ).astimezone(UTC)
    if frequency == "weekly":
        return _next_timedelta_occurrence(
            start_local,
            after_local,
            step=timedelta(weeks=interval_count),
        ).astimezone(UTC)
    if frequency == "monthly":
        return _next_monthly_occurrence(
            start_local,
            after_local,
            interval_months=interval_count,
        ).astimezone(UTC)
    if frequency == "yearly":
        return _next_monthly_occurrence(
            start_local,
            after_local,
            interval_months=interval_count * 12,
        ).astimezone(UTC)

    raise InvalidRecurringScheduleError("Frequency is invalid")


def calculate_next_run_on_or_after(
    *,
    start_at: datetime,
    frequency: str,
    interval_count: int,
    timezone: str,
    not_before_at: datetime,
) -> datetime:
    start_at_utc = normalize_aware_utc(start_at)
    not_before_at_utc = normalize_aware_utc(not_before_at)
    if start_at_utc >= not_before_at_utc:
        return start_at_utc
    return calculate_next_run_after(
        start_at=start_at_utc,
        frequency=frequency,
        interval_count=interval_count,
        timezone=timezone,
        after_at=not_before_at_utc,
    )


def recurring_period_key(value: datetime, *, timezone: str) -> str:
    zone = ZoneInfo(validate_timezone(timezone))
    local_value = normalize_aware_utc(value).astimezone(zone)
    return f"{local_value.year:04d}-{local_value.month:02d}"


def calculate_monthly_due_at(
    *,
    first_due_at: datetime,
    period_year: int,
    period_month: int,
    timezone: str,
) -> datetime:
    if period_year < 1 or period_month not in range(1, 13):
        raise InvalidRecurringScheduleError("Due period is invalid")

    zone = ZoneInfo(validate_timezone(timezone))
    first_due_local = normalize_aware_utc(first_due_at).astimezone(zone)
    due_day = min(
        first_due_local.day,
        calendar.monthrange(period_year, period_month)[1],
    )
    return first_due_local.replace(
        year=period_year,
        month=period_month,
        day=due_day,
    ).astimezone(UTC)


def is_monthly_due_window(
    *,
    first_due_at: datetime,
    current_at: datetime,
    timezone: str,
) -> bool:
    zone = ZoneInfo(validate_timezone(timezone))
    first_due_local = normalize_aware_utc(first_due_at).astimezone(zone)
    current_at_utc = normalize_aware_utc(current_at)
    current_local = current_at_utc.astimezone(zone)
    first_period = (first_due_local.year, first_due_local.month)
    current_period = (current_local.year, current_local.month)
    if current_period < first_period:
        return False

    due_at = calculate_monthly_due_at(
        first_due_at=first_due_at,
        period_year=current_local.year,
        period_month=current_local.month,
        timezone=timezone,
    )
    return current_at_utc >= due_at


def is_recurring_period_paid(
    *,
    last_paid_period: str | None,
    period_key: str,
) -> bool:
    return last_paid_period == period_key


def is_monthly_expense_due(
    *,
    transaction_type: str,
    frequency: str,
    status: str,
    first_due_at: datetime,
    current_at: datetime,
    timezone: str,
    last_paid_period: str | None,
) -> bool:
    if transaction_type != "expense" or frequency != "monthly" or status != "active":
        return False
    current_period = recurring_period_key(current_at, timezone=timezone)
    return is_monthly_due_window(
        first_due_at=first_due_at,
        current_at=current_at,
        timezone=timezone,
    ) and not is_recurring_period_paid(
        last_paid_period=last_paid_period,
        period_key=current_period,
    )


def validate_schedule_bounds(
    *,
    start_at: datetime,
    end_at: datetime | None,
    next_run_at: datetime,
) -> None:
    start_at_utc = normalize_aware_utc(start_at)
    next_run_at_utc = normalize_aware_utc(next_run_at)
    if end_at is not None:
        end_at_utc = normalize_aware_utc(end_at)
        if end_at_utc <= start_at_utc:
            raise InvalidRecurringScheduleError("End date must be after start date")
        if next_run_at_utc >= end_at_utc:
            raise InvalidRecurringScheduleError("Next run falls outside the rule range")


def _next_timedelta_occurrence(
    start_local: datetime,
    after_local: datetime,
    *,
    step: timedelta,
) -> datetime:
    if start_local > after_local:
        return start_local
    elapsed = after_local - start_local
    steps = elapsed // step + 1
    return start_local + (step * steps)


def _next_monthly_occurrence(
    start_local: datetime,
    after_local: datetime,
    *,
    interval_months: int,
) -> datetime:
    occurrence_index = 0
    candidate = start_local
    while candidate <= after_local:
        occurrence_index += 1
        candidate = _add_months_from_anchor(
            start_local,
            interval_months * occurrence_index,
        )
    return candidate


def _add_months_from_anchor(anchor: datetime, months: int) -> datetime:
    month_index = (anchor.month - 1) + months
    year = anchor.year + (month_index // 12)
    month = (month_index % 12) + 1
    day = min(anchor.day, calendar.monthrange(year, month)[1])
    return anchor.replace(year=year, month=month, day=day)
