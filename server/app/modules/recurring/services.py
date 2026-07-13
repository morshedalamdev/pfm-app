from __future__ import annotations

import uuid
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import cast

from app.modules.accounts.models import Account
from app.modules.accounts.repositories import AccountRepository
from app.modules.categories.models import Category
from app.modules.categories.repositories import CategoryRepository
from app.modules.recurring.models import RecurringRule
from app.modules.recurring.pagination import (
    InvalidRecurringRuleCursorError as CursorDecodeError,
)
from app.modules.recurring.pagination import (
    decode_recurring_rule_cursor,
    encode_recurring_rule_cursor,
)
from app.modules.recurring.repositories import RecurringRuleRepository
from app.modules.recurring.schedule import (
    calculate_monthly_due_at,
    calculate_next_run_on_or_after,
    initial_next_run_at,
    is_monthly_expense_due,
    is_monthly_income_due,
    recurring_period_key,
    validate_schedule_bounds,
)
from app.modules.recurring.schemas import (
    RecurringExpensePaidRequest,
    RecurringExpensePaidResponse,
    RecurringExpenseReminderListResponse,
    RecurringExpenseReminderResponse,
    RecurringIncomeReminderListResponse,
    RecurringIncomeReminderResponse,
    RecurringRuleCreateRequest,
    RecurringRuleListResponse,
    RecurringRuleResponse,
    RecurringRuleStatus,
    RecurringRuleUpdateRequest,
)
from app.modules.transactions.schemas import TransactionCreateRequest
from app.modules.transactions.services import (
    InvalidTransactionReferenceError,
    TransactionService,
)
from app.modules.users.models import User


class RecurringRuleNotFoundError(Exception):
    pass


class InvalidRecurringRuleReferenceError(Exception):
    pass


class InvalidRecurringRuleCursorError(Exception):
    pass


class InvalidRecurringRuleStateError(Exception):
    pass


@dataclass(frozen=True)
class DueRecurringExpense:
    rule: RecurringRule
    reminder_key: str
    period_key: str
    due_at: datetime


@dataclass(frozen=True)
class DueRecurringIncome:
    rule: RecurringRule
    reminder_key: str
    period_key: str
    due_at: datetime


class RecurringRuleService:
    def __init__(
        self,
        rules: RecurringRuleRepository,
        accounts: AccountRepository,
        categories: CategoryRepository,
        transactions: TransactionService,
    ) -> None:
        self.rules = rules
        self.accounts = accounts
        self.categories = categories
        self.transactions = transactions

    async def create_rule(
        self,
        request: RecurringRuleCreateRequest,
        current_user: User,
    ) -> RecurringRuleResponse:
        account = await self.get_active_account(request.account_id, current_user)
        category = await self.get_active_category(
            request.category_id,
            current_user,
            request.transaction_type,
        )
        next_run_at = initial_next_run_at(request.start_at)
        validate_schedule_bounds(
            start_at=request.start_at,
            end_at=request.end_at,
            next_run_at=next_run_at,
        )
        rule = RecurringRule(
            user_id=current_user.id,
            account_id=account.id,
            category_id=category.id,
            transaction_type=request.transaction_type,
            amount=request.amount,
            currency=account.currency,
            description=request.description,
            frequency=request.frequency,
            interval_count=request.interval_count,
            timezone=request.timezone,
            start_at=request.start_at,
            end_at=request.end_at,
            next_run_at=next_run_at,
            status="active",
        )
        await self.rules.create(rule)
        await self.rules.commit()
        await self.rules.refresh(rule)
        return self.build_rule_response(rule)

    async def list_rules(
        self,
        current_user: User,
        *,
        status_filter: str,
        cursor: str | None,
        limit: int,
    ) -> RecurringRuleListResponse:
        try:
            page_cursor = decode_recurring_rule_cursor(cursor)
        except CursorDecodeError as exc:
            raise InvalidRecurringRuleCursorError from exc

        rules = await self.rules.list_owned(
            current_user.id,
            status_filter=status_filter,
            cursor=page_cursor,
            limit=limit + 1,
        )
        has_more = len(rules) > limit
        visible_rules = rules[:limit]
        next_cursor = (
            encode_recurring_rule_cursor(
                visible_rules[-1].created_at, visible_rules[-1].id
            )
            if has_more and visible_rules
            else None
        )
        return RecurringRuleListResponse(
            items=[self.build_rule_response(rule) for rule in visible_rules],
            next_cursor=next_cursor,
            has_more=has_more,
        )

    async def get_rule(
        self,
        rule_id: uuid.UUID,
        current_user: User,
    ) -> RecurringRuleResponse:
        rule = await self.get_rule_model(rule_id, current_user)
        return self.build_rule_response(rule)

    async def list_due_expense_reminders(
        self,
        current_user: User,
        *,
        current_at: datetime | None = None,
    ) -> RecurringExpenseReminderListResponse:
        effective_current_at = current_at or datetime.now(UTC)
        rules = await self.rules.list_active_monthly_expenses(current_user.id)
        reminders = build_due_recurring_expense_queue(
            rules,
            current_at=effective_current_at,
        )
        return RecurringExpenseReminderListResponse(
            items=[
                RecurringExpenseReminderResponse(
                    reminder_key=reminder.reminder_key,
                    period_key=reminder.period_key,
                    due_at=reminder.due_at,
                    rule=self.build_rule_response(reminder.rule),
                )
                for reminder in reminders
            ]
        )

    async def list_due_income_reminders(
        self,
        current_user: User,
        *,
        current_at: datetime | None = None,
    ) -> RecurringIncomeReminderListResponse:
        effective_current_at = current_at or datetime.now(UTC)
        rules = await self.rules.list_active_monthly_incomes(current_user.id)
        reminders = build_due_recurring_income_queue(
            rules,
            current_at=effective_current_at,
        )
        return RecurringIncomeReminderListResponse(
            items=[
                RecurringIncomeReminderResponse(
                    reminder_key=reminder.reminder_key,
                    period_key=reminder.period_key,
                    due_at=reminder.due_at,
                    rule=self.build_rule_response(reminder.rule),
                )
                for reminder in reminders
            ]
        )

    async def mark_expense_paid(
        self,
        rule_id: uuid.UUID,
        request: RecurringExpensePaidRequest,
        current_user: User,
        *,
        current_at: datetime | None = None,
    ) -> RecurringExpensePaidResponse:
        effective_current_at = current_at or datetime.now(UTC)
        rule = await self.rules.get_owned_for_update(rule_id, current_user.id)
        if rule is None:
            raise RecurringRuleNotFoundError
        if (
            rule.status != "active"
            or rule.archived_at is not None
            or rule.transaction_type != "expense"
            or rule.frequency != "monthly"
        ):
            raise InvalidRecurringRuleStateError

        period_key = recurring_period_key(
            effective_current_at,
            timezone=rule.timezone,
        )
        is_replay = rule.last_paid_period == period_key
        if not is_replay and (
            (rule.end_at is not None and effective_current_at >= rule.end_at)
            or not is_monthly_expense_due(
                transaction_type=rule.transaction_type,
                frequency=rule.frequency,
                status=rule.status,
                first_due_at=rule.start_at,
                current_at=effective_current_at,
                timezone=rule.timezone,
                last_paid_period=rule.last_paid_period,
                interval_count=rule.interval_count,
            )
        ):
            raise InvalidRecurringRuleStateError

        transaction_request = TransactionCreateRequest(
            account_id=rule.account_id,
            category_id=rule.category_id,
            type="expense",
            amount=rule.amount,
            transaction_at=request.paid_at,
            description=rule.description,
        )
        try:
            transaction = await self.transactions.create_transaction(
                transaction_request,
                current_user,
                f"recurring-expense-paid:{rule.id}:{period_key}",
                commit=False,
            )
        except InvalidTransactionReferenceError as exc:
            raise InvalidRecurringRuleReferenceError from exc

        rule.last_paid_period = period_key
        try:
            await self.rules.commit()
            await self.rules.refresh(rule)
        except Exception:
            await self.rules.rollback()
            raise
        return RecurringExpensePaidResponse(
            transaction=transaction,
            rule=self.build_rule_response(rule),
        )

    async def update_rule(
        self,
        rule_id: uuid.UUID,
        request: RecurringRuleUpdateRequest,
        current_user: User,
    ) -> RecurringRuleResponse:
        rule = await self.get_rule_model(rule_id, current_user)
        if rule.status == "archived":
            raise InvalidRecurringRuleStateError

        update_data = request.model_dump(exclude_unset=True)
        transaction_type = str(
            update_data.get("transaction_type", rule.transaction_type)
        )
        account_id = update_data.get("account_id", rule.account_id)
        category_id = update_data.get("category_id", rule.category_id)
        account = await self.get_active_account(account_id, current_user)
        category = await self.get_active_category(
            category_id,
            current_user,
            transaction_type,
        )

        rule.account_id = account.id
        rule.category_id = category.id
        rule.currency = account.currency
        for field_name in {
            "transaction_type",
            "amount",
            "description",
            "frequency",
            "interval_count",
            "timezone",
            "start_at",
            "end_at",
        }:
            if field_name in update_data:
                setattr(rule, field_name, update_data[field_name])

        rule.next_run_at = calculate_next_run_on_or_after(
            start_at=rule.start_at,
            frequency=rule.frequency,
            interval_count=rule.interval_count,
            timezone=rule.timezone,
            not_before_at=datetime.now(UTC),
        )
        validate_schedule_bounds(
            start_at=rule.start_at,
            end_at=rule.end_at,
            next_run_at=rule.next_run_at,
        )
        await self.rules.commit()
        await self.rules.refresh(rule)
        return self.build_rule_response(rule)

    async def pause_rule(
        self,
        rule_id: uuid.UUID,
        current_user: User,
    ) -> RecurringRuleResponse:
        rule = await self.get_rule_model(rule_id, current_user)
        if rule.status == "archived":
            raise InvalidRecurringRuleStateError
        if rule.status != "paused":
            rule.status = "paused"
            rule.paused_at = datetime.now(UTC)
            await self.rules.commit()
            await self.rules.refresh(rule)
        return self.build_rule_response(rule)

    async def resume_rule(
        self,
        rule_id: uuid.UUID,
        current_user: User,
    ) -> RecurringRuleResponse:
        rule = await self.get_rule_model(rule_id, current_user)
        if rule.status == "archived":
            raise InvalidRecurringRuleStateError
        if rule.status != "active":
            now = datetime.now(UTC)
            next_run_at = calculate_next_run_on_or_after(
                start_at=rule.start_at,
                frequency=rule.frequency,
                interval_count=rule.interval_count,
                timezone=rule.timezone,
                not_before_at=now,
            )
            validate_schedule_bounds(
                start_at=rule.start_at,
                end_at=rule.end_at,
                next_run_at=next_run_at,
            )
            rule.status = "active"
            rule.paused_at = None
            rule.next_run_at = next_run_at
            await self.rules.commit()
            await self.rules.refresh(rule)
        return self.build_rule_response(rule)

    async def archive_rule(
        self,
        rule_id: uuid.UUID,
        current_user: User,
    ) -> RecurringRuleResponse:
        rule = await self.get_rule_model(rule_id, current_user)
        if rule.status != "archived":
            rule.status = "archived"
            rule.archived_at = datetime.now(UTC)
            await self.rules.commit()
            await self.rules.refresh(rule)
        return self.build_rule_response(rule)

    async def get_rule_model(
        self,
        rule_id: uuid.UUID,
        current_user: User,
    ) -> RecurringRule:
        rule = await self.rules.get_owned(rule_id, current_user.id)
        if rule is None:
            raise RecurringRuleNotFoundError
        return rule

    async def get_active_account(
        self,
        account_id: uuid.UUID,
        current_user: User,
    ) -> Account:
        account = await self.accounts.get_owned(account_id, current_user.id)
        if account is None or account.archived_at is not None:
            raise InvalidRecurringRuleReferenceError
        return account

    async def get_active_category(
        self,
        category_id: uuid.UUID,
        current_user: User,
        transaction_type: str,
    ) -> Category:
        category = await self.categories.get_owned(category_id, current_user.id)
        if (
            category is None
            or category.archived_at is not None
            or category.kind != transaction_type
        ):
            raise InvalidRecurringRuleReferenceError
        return category

    def build_rule_response(self, rule: RecurringRule) -> RecurringRuleResponse:
        return RecurringRuleResponse(
            id=rule.id,
            account_id=rule.account_id,
            category_id=rule.category_id,
            transaction_type=rule.transaction_type,
            amount=rule.amount,
            currency=rule.currency,
            description=rule.description,
            frequency=rule.frequency,
            interval_count=rule.interval_count,
            timezone=rule.timezone,
            start_at=rule.start_at,
            end_at=rule.end_at,
            next_run_at=rule.next_run_at,
            last_run_at=rule.last_run_at,
            last_run_key=rule.last_run_key,
            last_paid_period=rule.last_paid_period,
            last_received_period=rule.last_received_period,
            run_count=rule.run_count,
            status=cast(RecurringRuleStatus, rule.status),
            paused_at=rule.paused_at,
            archived_at=rule.archived_at,
            created_at=rule.created_at,
            updated_at=rule.updated_at,
        )


def build_due_recurring_expense_queue(
    rules: Sequence[RecurringRule],
    *,
    current_at: datetime,
) -> list[DueRecurringExpense]:
    reminders: dict[str, DueRecurringExpense] = {}
    for rule in rules:
        if rule.end_at is not None and current_at >= rule.end_at:
            continue
        if not is_monthly_expense_due(
            transaction_type=rule.transaction_type,
            frequency=rule.frequency,
            status=rule.status,
            first_due_at=rule.start_at,
            current_at=current_at,
            timezone=rule.timezone,
            last_paid_period=rule.last_paid_period,
            interval_count=rule.interval_count,
        ):
            continue
        period_key = recurring_period_key(current_at, timezone=rule.timezone)
        period_year, period_month = (int(part) for part in period_key.split("-"))
        due_at = calculate_monthly_due_at(
            first_due_at=rule.start_at,
            period_year=period_year,
            period_month=period_month,
            timezone=rule.timezone,
        )
        reminder_key = f"{rule.id}:{period_key}"
        reminders.setdefault(
            reminder_key,
            DueRecurringExpense(
                rule=rule,
                reminder_key=reminder_key,
                period_key=period_key,
                due_at=due_at,
            ),
        )
    return sorted(
        reminders.values(),
        key=lambda reminder: (reminder.due_at, reminder.rule.id),
    )


def build_due_recurring_income_queue(
    rules: Sequence[RecurringRule],
    *,
    current_at: datetime,
) -> list[DueRecurringIncome]:
    reminders: dict[str, DueRecurringIncome] = {}
    for rule in rules:
        if rule.end_at is not None and current_at >= rule.end_at:
            continue
        if not is_monthly_income_due(
            transaction_type=rule.transaction_type,
            frequency=rule.frequency,
            status=rule.status,
            first_due_at=rule.start_at,
            current_at=current_at,
            timezone=rule.timezone,
            last_received_period=rule.last_received_period,
            interval_count=rule.interval_count,
        ):
            continue
        period_key = recurring_period_key(current_at, timezone=rule.timezone)
        period_year, period_month = (int(part) for part in period_key.split("-"))
        due_at = calculate_monthly_due_at(
            first_due_at=rule.start_at,
            period_year=period_year,
            period_month=period_month,
            timezone=rule.timezone,
        )
        reminder_key = f"{rule.id}:{period_key}"
        reminders.setdefault(
            reminder_key,
            DueRecurringIncome(
                rule=rule,
                reminder_key=reminder_key,
                period_key=period_key,
                due_at=due_at,
            ),
        )
    return sorted(
        reminders.values(),
        key=lambda reminder: (reminder.due_at, reminder.rule.id),
    )
