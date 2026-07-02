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
