from datetime import datetime

from app.modules.recurring.schedule import (
    calculate_monthly_due_at,
    is_monthly_due_window,
    is_monthly_expense_due,
    is_monthly_income_due,
    is_recurring_income_reminder_type,
    is_recurring_period_paid,
    is_recurring_period_received,
    recurring_period_key,
)


def utc(value: str) -> datetime:
    return datetime.fromisoformat(value)


def test_normal_monthly_due_date() -> None:
    due_at = calculate_monthly_due_at(
        first_due_at=utc("2026-01-15T09:00:00+00:00"),
        period_year=2026,
        period_month=3,
        timezone="UTC",
    )

    assert due_at == utc("2026-03-15T09:00:00+00:00")


def test_january_31_clamps_to_february_end() -> None:
    due_at = calculate_monthly_due_at(
        first_due_at=utc("2026-01-31T09:00:00+00:00"),
        period_year=2026,
        period_month=2,
        timezone="UTC",
    )

    assert due_at == utc("2026-02-28T09:00:00+00:00")


def test_march_31_clamps_to_april_end() -> None:
    due_at = calculate_monthly_due_at(
        first_due_at=utc("2026-03-31T09:00:00+00:00"),
        period_year=2026,
        period_month=4,
        timezone="UTC",
    )

    assert due_at == utc("2026-04-30T09:00:00+00:00")


def test_before_first_due_date_is_outside_due_window() -> None:
    assert not is_monthly_due_window(
        first_due_at=utc("2026-03-15T09:00:00+00:00"),
        current_at=utc("2026-03-15T08:59:59+00:00"),
        timezone="UTC",
    )


def test_on_due_date_is_inside_due_window() -> None:
    assert is_monthly_due_window(
        first_due_at=utc("2026-01-15T09:00:00+00:00"),
        current_at=utc("2026-03-15T09:00:00+00:00"),
        timezone="UTC",
    )


def test_after_due_date_within_month_is_inside_due_window() -> None:
    assert is_monthly_due_window(
        first_due_at=utc("2026-01-15T09:00:00+00:00"),
        current_at=utc("2026-03-31T23:59:59+00:00"),
        timezone="UTC",
    )


def test_period_key_uses_rule_timezone_and_paid_period() -> None:
    current_at = utc("2026-03-01T00:30:00+00:00")
    period_key = recurring_period_key(current_at, timezone="America/New_York")

    assert period_key == "2026-02"
    assert is_recurring_period_paid(
        last_paid_period="2026-02",
        period_key=period_key,
    )
    assert not is_monthly_expense_due(
        transaction_type="expense",
        frequency="monthly",
        status="active",
        first_due_at=utc("2026-01-15T14:00:00+00:00"),
        current_at=current_at,
        timezone="America/New_York",
        last_paid_period="2026-02",
    )


def test_inactive_monthly_expense_is_not_due() -> None:
    assert not is_monthly_expense_due(
        transaction_type="expense",
        frequency="monthly",
        status="paused",
        first_due_at=utc("2026-01-15T09:00:00+00:00"),
        current_at=utc("2026-03-20T09:00:00+00:00"),
        timezone="UTC",
        last_paid_period=None,
    )


def test_paid_month_stays_hidden_then_reactivates_on_next_month_due_date() -> None:
    due_options = {
        "transaction_type": "expense",
        "frequency": "monthly",
        "status": "active",
        "first_due_at": utc("2026-01-15T09:00:00+00:00"),
        "timezone": "UTC",
        "last_paid_period": "2026-03",
    }

    assert not is_monthly_expense_due(
        **due_options,
        current_at=utc("2026-03-31T23:59:59+00:00"),
    )
    assert not is_monthly_expense_due(
        **due_options,
        current_at=utc("2026-04-15T08:59:59+00:00"),
    )
    assert is_monthly_expense_due(
        **due_options,
        current_at=utc("2026-04-15T09:00:00+00:00"),
    )


def test_unpaid_prior_month_expires_until_the_new_month_due_date() -> None:
    due_options = {
        "transaction_type": "expense",
        "frequency": "monthly",
        "status": "active",
        "first_due_at": utc("2026-01-20T09:00:00+00:00"),
        "timezone": "UTC",
        "last_paid_period": None,
    }

    assert is_monthly_expense_due(
        **due_options,
        current_at=utc("2026-03-31T23:59:59+00:00"),
    )
    assert not is_monthly_expense_due(
        **due_options,
        current_at=utc("2026-04-01T00:00:00+00:00"),
    )
    assert is_monthly_expense_due(
        **due_options,
        current_at=utc("2026-04-20T09:00:00+00:00"),
    )


def test_income_reminder_type_is_isolated_from_expenses() -> None:
    assert is_recurring_income_reminder_type(transaction_type="income")
    assert not is_recurring_income_reminder_type(transaction_type="expense")


def test_monthly_income_is_not_due_before_due_date() -> None:
    assert not is_monthly_income_due(
        transaction_type="income",
        frequency="monthly",
        status="active",
        first_due_at=utc("2026-01-15T09:00:00+00:00"),
        current_at=utc("2026-03-15T08:59:59+00:00"),
        timezone="UTC",
        last_received_period=None,
    )


def test_monthly_income_is_due_on_date_and_through_month_end() -> None:
    due_options = {
        "transaction_type": "income",
        "frequency": "monthly",
        "status": "active",
        "first_due_at": utc("2026-01-15T09:00:00+00:00"),
        "timezone": "UTC",
        "last_received_period": None,
    }

    assert is_monthly_income_due(
        **due_options,
        current_at=utc("2026-03-15T09:00:00+00:00"),
    )
    assert is_monthly_income_due(
        **due_options,
        current_at=utc("2026-03-31T23:59:59+00:00"),
    )


def test_monthly_income_january_31_clamps_to_february_end() -> None:
    due_options = {
        "transaction_type": "income",
        "frequency": "monthly",
        "status": "active",
        "first_due_at": utc("2026-01-31T09:00:00+00:00"),
        "timezone": "UTC",
        "last_received_period": None,
    }

    assert not is_monthly_income_due(
        **due_options,
        current_at=utc("2026-02-28T08:59:59+00:00"),
    )
    assert is_monthly_income_due(
        **due_options,
        current_at=utc("2026-02-28T09:00:00+00:00"),
    )


def test_monthly_income_march_31_clamps_to_april_end() -> None:
    assert is_monthly_income_due(
        transaction_type="income",
        frequency="monthly",
        status="active",
        first_due_at=utc("2026-03-31T09:00:00+00:00"),
        current_at=utc("2026-04-30T09:00:00+00:00"),
        timezone="UTC",
        last_received_period=None,
    )


def test_received_income_period_is_not_due_again() -> None:
    current_at = utc("2026-03-20T09:00:00+00:00")
    period_key = recurring_period_key(current_at, timezone="UTC")

    assert is_recurring_period_received(
        last_received_period="2026-03",
        period_key=period_key,
    )
    assert not is_monthly_income_due(
        transaction_type="income",
        frequency="monthly",
        status="active",
        first_due_at=utc("2026-01-15T09:00:00+00:00"),
        current_at=current_at,
        timezone="UTC",
        last_received_period="2026-03",
    )


def test_inactive_monthly_income_is_not_due() -> None:
    assert not is_monthly_income_due(
        transaction_type="income",
        frequency="monthly",
        status="paused",
        first_due_at=utc("2026-01-15T09:00:00+00:00"),
        current_at=utc("2026-03-20T09:00:00+00:00"),
        timezone="UTC",
        last_received_period=None,
    )


def test_expense_due_helper_behavior_remains_unchanged() -> None:
    due_options = {
        "transaction_type": "expense",
        "frequency": "monthly",
        "status": "active",
        "first_due_at": utc("2026-01-15T09:00:00+00:00"),
        "timezone": "UTC",
        "last_paid_period": None,
    }

    assert not is_monthly_expense_due(
        **due_options,
        current_at=utc("2026-03-15T08:59:59+00:00"),
    )
    assert is_monthly_expense_due(
        **due_options,
        current_at=utc("2026-03-15T09:00:00+00:00"),
    )
    assert not is_monthly_expense_due(
        **(due_options | {"last_paid_period": "2026-03"}),
        current_at=utc("2026-03-31T23:59:59+00:00"),
    )
