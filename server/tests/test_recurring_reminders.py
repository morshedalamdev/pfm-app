import uuid
from datetime import UTC, datetime

from app.modules.recurring.models import RecurringRule
from app.modules.recurring.services import (
    build_due_recurring_expense_queue,
    build_due_recurring_income_queue,
)

CURRENT_AT = datetime(2026, 3, 20, 12, tzinfo=UTC)


def recurring_rule(
    *,
    rule_id: str,
    start_at: datetime,
    transaction_type: str = "expense",
    frequency: str = "monthly",
    status: str = "active",
    last_paid_period: str | None = None,
    last_received_period: str | None = None,
    interval_count: int = 1,
    end_at: datetime | None = None,
) -> RecurringRule:
    return RecurringRule(
        id=uuid.UUID(rule_id),
        transaction_type=transaction_type,
        frequency=frequency,
        status=status,
        start_at=start_at,
        timezone="UTC",
        last_paid_period=last_paid_period,
        last_received_period=last_received_period,
        interval_count=interval_count,
        end_at=end_at,
    )


def test_reminder_queue_is_deterministic_and_deduplicated() -> None:
    later_due = recurring_rule(
        rule_id="00000000-0000-0000-0000-000000000002",
        start_at=datetime(2026, 1, 15, 9, tzinfo=UTC),
    )
    earlier_due = recurring_rule(
        rule_id="00000000-0000-0000-0000-000000000001",
        start_at=datetime(2026, 1, 10, 9, tzinfo=UTC),
    )

    queue = build_due_recurring_expense_queue(
        [later_due, earlier_due, earlier_due],
        current_at=CURRENT_AT,
    )

    assert [reminder.rule.id for reminder in queue] == [
        earlier_due.id,
        later_due.id,
    ]
    assert [reminder.reminder_key for reminder in queue] == [
        f"{earlier_due.id}:2026-03",
        f"{later_due.id}:2026-03",
    ]


def test_reminder_queue_excludes_ineligible_rules() -> None:
    income = recurring_rule(
        rule_id="00000000-0000-0000-0000-000000000010",
        start_at=datetime(2026, 1, 1, tzinfo=UTC),
        transaction_type="income",
    )
    inactive = recurring_rule(
        rule_id="00000000-0000-0000-0000-000000000011",
        start_at=datetime(2026, 1, 1, tzinfo=UTC),
        status="paused",
    )
    future = recurring_rule(
        rule_id="00000000-0000-0000-0000-000000000012",
        start_at=datetime(2026, 3, 21, tzinfo=UTC),
    )
    paid = recurring_rule(
        rule_id="00000000-0000-0000-0000-000000000013",
        start_at=datetime(2026, 1, 1, tzinfo=UTC),
        last_paid_period="2026-03",
    )
    off_interval = recurring_rule(
        rule_id="00000000-0000-0000-0000-000000000014",
        start_at=datetime(2026, 2, 1, tzinfo=UTC),
        interval_count=2,
    )
    ended = recurring_rule(
        rule_id="00000000-0000-0000-0000-000000000015",
        start_at=datetime(2026, 1, 1, tzinfo=UTC),
        end_at=datetime(2026, 3, 1, tzinfo=UTC),
    )

    queue = build_due_recurring_expense_queue(
        [income, inactive, future, paid, off_interval, ended],
        current_at=CURRENT_AT,
    )

    assert queue == []


def test_paid_rule_returns_with_a_new_key_in_the_next_month() -> None:
    rule = recurring_rule(
        rule_id="00000000-0000-0000-0000-000000000020",
        start_at=datetime(2026, 1, 15, 9, tzinfo=UTC),
        last_paid_period="2026-03",
    )

    assert (
        build_due_recurring_expense_queue(
            [rule],
            current_at=datetime(2026, 3, 31, 23, 59, tzinfo=UTC),
        )
        == []
    )
    april_queue = build_due_recurring_expense_queue(
        [rule],
        current_at=datetime(2026, 4, 15, 9, tzinfo=UTC),
    )

    assert [reminder.reminder_key for reminder in april_queue] == [f"{rule.id}:2026-04"]
    assert april_queue[0].due_at == datetime(2026, 4, 15, 9, tzinfo=UTC)


def test_prior_month_reminder_is_not_carried_into_the_next_month() -> None:
    rule = recurring_rule(
        rule_id="00000000-0000-0000-0000-000000000021",
        start_at=datetime(2026, 1, 20, 9, tzinfo=UTC),
    )

    march_queue = build_due_recurring_expense_queue(
        [rule],
        current_at=datetime(2026, 3, 31, 23, 59, tzinfo=UTC),
    )
    before_april_due = build_due_recurring_expense_queue(
        [rule],
        current_at=datetime(2026, 4, 1, 0, tzinfo=UTC),
    )
    april_queue = build_due_recurring_expense_queue(
        [rule],
        current_at=datetime(2026, 4, 20, 9, tzinfo=UTC),
    )

    assert [reminder.period_key for reminder in march_queue] == ["2026-03"]
    assert before_april_due == []
    assert [reminder.period_key for reminder in april_queue] == ["2026-04"]


def test_income_reminder_queue_is_deterministic_and_deduplicated() -> None:
    later_due = recurring_rule(
        rule_id="00000000-0000-0000-0000-000000000032",
        start_at=datetime(2026, 1, 15, 9, tzinfo=UTC),
        transaction_type="income",
    )
    earlier_due = recurring_rule(
        rule_id="00000000-0000-0000-0000-000000000031",
        start_at=datetime(2026, 1, 10, 9, tzinfo=UTC),
        transaction_type="income",
    )

    queue = build_due_recurring_income_queue(
        [later_due, earlier_due, earlier_due],
        current_at=CURRENT_AT,
    )

    assert [reminder.rule.id for reminder in queue] == [
        earlier_due.id,
        later_due.id,
    ]
    assert [reminder.reminder_key for reminder in queue] == [
        f"{earlier_due.id}:2026-03",
        f"{later_due.id}:2026-03",
    ]


def test_income_reminder_queue_excludes_ineligible_rules() -> None:
    expense = recurring_rule(
        rule_id="00000000-0000-0000-0000-000000000040",
        start_at=datetime(2026, 1, 1, tzinfo=UTC),
    )
    inactive = recurring_rule(
        rule_id="00000000-0000-0000-0000-000000000041",
        start_at=datetime(2026, 1, 1, tzinfo=UTC),
        transaction_type="income",
        status="paused",
    )
    future = recurring_rule(
        rule_id="00000000-0000-0000-0000-000000000042",
        start_at=datetime(2026, 3, 21, tzinfo=UTC),
        transaction_type="income",
    )
    received = recurring_rule(
        rule_id="00000000-0000-0000-0000-000000000043",
        start_at=datetime(2026, 1, 1, tzinfo=UTC),
        transaction_type="income",
        last_received_period="2026-03",
    )
    off_interval = recurring_rule(
        rule_id="00000000-0000-0000-0000-000000000044",
        start_at=datetime(2026, 2, 1, tzinfo=UTC),
        transaction_type="income",
        interval_count=2,
    )
    ended = recurring_rule(
        rule_id="00000000-0000-0000-0000-000000000045",
        start_at=datetime(2026, 1, 1, tzinfo=UTC),
        transaction_type="income",
        end_at=datetime(2026, 3, 1, tzinfo=UTC),
    )
    non_monthly = recurring_rule(
        rule_id="00000000-0000-0000-0000-000000000046",
        start_at=datetime(2026, 1, 1, tzinfo=UTC),
        transaction_type="income",
        frequency="weekly",
    )

    queue = build_due_recurring_income_queue(
        [expense, inactive, future, received, off_interval, ended, non_monthly],
        current_at=CURRENT_AT,
    )

    assert queue == []


def test_income_and_expense_reminder_queues_coexist_without_cross_matching() -> None:
    expense = recurring_rule(
        rule_id="00000000-0000-0000-0000-000000000051",
        start_at=datetime(2026, 1, 10, 9, tzinfo=UTC),
    )
    income = recurring_rule(
        rule_id="00000000-0000-0000-0000-000000000052",
        start_at=datetime(2026, 1, 11, 9, tzinfo=UTC),
        transaction_type="income",
    )

    expense_queue = build_due_recurring_expense_queue(
        [income, expense],
        current_at=CURRENT_AT,
    )
    income_queue = build_due_recurring_income_queue(
        [expense, income],
        current_at=CURRENT_AT,
    )

    assert [reminder.rule.id for reminder in expense_queue] == [expense.id]
    assert [reminder.rule.id for reminder in income_queue] == [income.id]


def test_received_income_stays_hidden_then_returns_on_next_month_due_date() -> None:
    rule = recurring_rule(
        rule_id="00000000-0000-0000-0000-000000000061",
        start_at=datetime(2026, 1, 15, 9, tzinfo=UTC),
        transaction_type="income",
        last_received_period="2026-03",
    )

    assert (
        build_due_recurring_income_queue(
            [rule],
            current_at=datetime(2026, 3, 31, 23, 59, tzinfo=UTC),
        )
        == []
    )
    assert (
        build_due_recurring_income_queue(
            [rule],
            current_at=datetime(2026, 4, 15, 8, 59, tzinfo=UTC),
        )
        == []
    )
    april_queue = build_due_recurring_income_queue(
        [rule],
        current_at=datetime(2026, 4, 15, 9, tzinfo=UTC),
    )

    assert [reminder.reminder_key for reminder in april_queue] == [f"{rule.id}:2026-04"]
    assert april_queue[0].due_at == datetime(2026, 4, 15, 9, tzinfo=UTC)


def test_unreceived_income_does_not_carry_before_the_next_month_due_date() -> None:
    rule = recurring_rule(
        rule_id="00000000-0000-0000-0000-000000000062",
        start_at=datetime(2026, 1, 20, 9, tzinfo=UTC),
        transaction_type="income",
    )

    march_queue = build_due_recurring_income_queue(
        [rule],
        current_at=datetime(2026, 3, 31, 23, 59, tzinfo=UTC),
    )
    before_april_due = build_due_recurring_income_queue(
        [rule],
        current_at=datetime(2026, 4, 1, 0, tzinfo=UTC),
    )
    april_queue = build_due_recurring_income_queue(
        [rule],
        current_at=datetime(2026, 4, 20, 9, tzinfo=UTC),
    )

    assert [reminder.period_key for reminder in march_queue] == ["2026-03"]
    assert before_april_due == []
    assert [reminder.period_key for reminder in april_queue] == ["2026-04"]


def test_archived_income_never_returns_in_later_months() -> None:
    rule = recurring_rule(
        rule_id="00000000-0000-0000-0000-000000000063",
        start_at=datetime(2026, 1, 10, 9, tzinfo=UTC),
        transaction_type="income",
        status="archived",
    )

    assert (
        build_due_recurring_income_queue(
            [rule],
            current_at=datetime(2026, 3, 10, 9, tzinfo=UTC),
        )
        == []
    )
    assert (
        build_due_recurring_income_queue(
            [rule],
            current_at=datetime(2027, 3, 10, 9, tzinfo=UTC),
        )
        == []
    )


def test_mixed_reminder_completion_is_isolated_by_rule_and_type() -> None:
    due_expense = recurring_rule(
        rule_id="00000000-0000-0000-0000-000000000071",
        start_at=datetime(2026, 1, 10, 9, tzinfo=UTC),
    )
    paid_expense = recurring_rule(
        rule_id="00000000-0000-0000-0000-000000000072",
        start_at=datetime(2026, 1, 11, 9, tzinfo=UTC),
        last_paid_period="2026-03",
    )
    due_income = recurring_rule(
        rule_id="00000000-0000-0000-0000-000000000073",
        start_at=datetime(2026, 1, 12, 9, tzinfo=UTC),
        transaction_type="income",
    )
    received_income = recurring_rule(
        rule_id="00000000-0000-0000-0000-000000000074",
        start_at=datetime(2026, 1, 13, 9, tzinfo=UTC),
        transaction_type="income",
        last_received_period="2026-03",
    )
    rules = [received_income, paid_expense, due_income, due_expense]

    expense_queue = build_due_recurring_expense_queue(
        rules,
        current_at=CURRENT_AT,
    )
    income_queue = build_due_recurring_income_queue(
        rules,
        current_at=CURRENT_AT,
    )

    assert [reminder.rule.id for reminder in expense_queue] == [due_expense.id]
    assert [reminder.rule.id for reminder in income_queue] == [due_income.id]
