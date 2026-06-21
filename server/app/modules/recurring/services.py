from __future__ import annotations

import uuid
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
    calculate_next_run_on_or_after,
    initial_next_run_at,
    validate_schedule_bounds,
)
from app.modules.recurring.schemas import (
    RecurringRuleCreateRequest,
    RecurringRuleListResponse,
    RecurringRuleResponse,
    RecurringRuleStatus,
    RecurringRuleUpdateRequest,
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


class RecurringRuleService:
    def __init__(
        self,
        rules: RecurringRuleRepository,
        accounts: AccountRepository,
        categories: CategoryRepository,
    ) -> None:
        self.rules = rules
        self.accounts = accounts
        self.categories = categories

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
            run_count=rule.run_count,
            status=cast(RecurringRuleStatus, rule.status),
            paused_at=rule.paused_at,
            archived_at=rule.archived_at,
            created_at=rule.created_at,
            updated_at=rule.updated_at,
        )
