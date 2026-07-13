import uuid
from datetime import UTC, datetime

from app.modules.recurring.models import RecurringRule
from app.modules.recurring.services import build_due_recurring_expense_queue

CURRENT_AT = datetime(2026, 3, 20, 12, tzinfo=UTC)


def recurring_rule(
    *,
    rule_id: str,
    start_at: datetime,
    transaction_type: str = "expense",
    frequency: str = "monthly",
    status: str = "active",
    last_paid_period: str | None = None,
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
