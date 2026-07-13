from __future__ import annotations

import asyncio
from collections.abc import Sequence
from pathlib import Path

from alembic.config import Config
from sqlalchemy import (
    CheckConstraint,
    ForeignKeyConstraint,
    Index,
    Numeric,
    UniqueConstraint,
    inspect,
)

from alembic import command
from app.core.database import Base, build_async_engine
from app.modules.outbox.models import OutboxEvent
from app.modules.recurring.models import RecurringRule


def build_alembic_config(database_url: str) -> Config:
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def constraint_names(constraints: Sequence[UniqueConstraint]) -> set[str | None]:
    return {constraint.name for constraint in constraints}


def check_constraint_names(constraints: Sequence[CheckConstraint]) -> set[str | None]:
    return {constraint.name for constraint in constraints}


def foreign_key_names(constraints: Sequence[ForeignKeyConstraint]) -> set[str | None]:
    return {constraint.name for constraint in constraints}


def index_names(indexes: set[Index]) -> set[str]:
    return {index.name for index in indexes if index.name is not None}


def assert_numeric_money(column_type: object) -> None:
    assert isinstance(column_type, Numeric)
    assert column_type.precision == 18
    assert column_type.scale == 4


def test_recurring_rule_model_schema() -> None:
    table = RecurringRule.__table__

    assert table.metadata is Base.metadata
    assert set(table.columns.keys()) == {
        "id",
        "user_id",
        "account_id",
        "category_id",
        "transaction_type",
        "amount",
        "currency",
        "description",
        "frequency",
        "interval_count",
        "timezone",
        "start_at",
        "end_at",
        "next_run_at",
        "last_run_at",
        "last_run_key",
        "last_paid_period",
        "run_count",
        "status",
        "paused_at",
        "archived_at",
        "locked_by",
        "locked_at",
        "locked_until",
        "created_at",
        "updated_at",
    }
    assert table.columns.transaction_type.type.length == 20
    assert table.columns.frequency.type.length == 20
    assert table.columns.timezone.type.length == 64
    assert table.columns.last_run_key.type.length == 160
    assert table.columns.last_paid_period.type.length == 7
    assert table.columns.locked_by.type.length == 120
    assert table.columns.start_at.type.timezone is True
    assert table.columns.next_run_at.type.timezone is True
    assert_numeric_money(table.columns.amount.type)
    assert {
        "ck_recurring_rules_transaction_type_supported",
        "ck_recurring_rules_frequency_supported",
        "ck_recurring_rules_status_supported",
        "ck_recurring_rules_amount_positive",
        "ck_recurring_rules_interval_count_positive",
        "ck_recurring_rules_run_count_non_negative",
        "ck_recurring_rules_last_paid_period_format",
        "ck_recurring_rules_lock_state_consistent",
    }.issubset(
        check_constraint_names(
            [
                constraint
                for constraint in table.constraints
                if isinstance(constraint, CheckConstraint)
            ]
        )
    )
    assert {
        "fk_recurring_rules_user_id_users",
        "fk_recurring_rules_account_id_user_id_accounts",
        "fk_recurring_rules_category_id_user_id_categories",
    }.issubset(
        foreign_key_names(
            [
                constraint
                for constraint in table.constraints
                if isinstance(constraint, ForeignKeyConstraint)
            ]
        )
    )
    assert "uq_recurring_rules_id_user_id" in constraint_names(
        [
            constraint
            for constraint in table.constraints
            if isinstance(constraint, UniqueConstraint)
        ]
    )
    assert index_names(table.indexes) == {
        "ix_recurring_rules_user_id_status",
        "ix_recurring_rules_user_id_next_run_at",
        "ix_recurring_rules_due_active_next_run_at",
        "ix_recurring_rules_locked_until",
    }


def test_outbox_event_model_schema() -> None:
    table = OutboxEvent.__table__

    assert table.metadata is Base.metadata
    assert set(table.columns.keys()) == {
        "id",
        "user_id",
        "event_type",
        "aggregate_type",
        "aggregate_id",
        "idempotency_key",
        "payload",
        "status",
        "attempts",
        "max_attempts",
        "available_at",
        "processed_at",
        "error_type",
        "error_message",
        "locked_by",
        "locked_at",
        "locked_until",
        "created_at",
        "updated_at",
    }
    assert table.columns.user_id.nullable is True
    assert table.columns.event_type.type.length == 120
    assert table.columns.aggregate_type.type.length == 80
    assert table.columns.idempotency_key.type.length == 255
    assert table.columns.status.type.length == 20
    assert table.columns.available_at.type.timezone is True
    assert {
        "ck_outbox_events_status_supported",
        "ck_outbox_events_attempts_non_negative",
        "ck_outbox_events_max_attempts_positive",
        "ck_outbox_events_attempts_not_over_max",
        "ck_outbox_events_processed_state_consistent",
        "ck_outbox_events_lock_state_consistent",
    }.issubset(
        check_constraint_names(
            [
                constraint
                for constraint in table.constraints
                if isinstance(constraint, CheckConstraint)
            ]
        )
    )
    assert "fk_outbox_events_user_id_users" in foreign_key_names(
        [
            constraint
            for constraint in table.constraints
            if isinstance(constraint, ForeignKeyConstraint)
        ]
    )
    assert "uq_outbox_events_event_type_idempotency_key" in constraint_names(
        [
            constraint
            for constraint in table.constraints
            if isinstance(constraint, UniqueConstraint)
        ]
    )
    assert index_names(table.indexes) == {
        "ix_outbox_events_user_id",
        "ix_outbox_events_status_available_at",
        "ix_outbox_events_locked_until",
        "ix_outbox_events_aggregate",
    }


def test_recurring_outbox_migration_up_down_up_tables(
    disposable_postgres_url: str,
) -> None:
    config = build_alembic_config(disposable_postgres_url)

    command.downgrade(config, "base")
    command.upgrade(config, "202606210601")
    assert asyncio.run(table_exists(disposable_postgres_url, "recurring_rules"))
    assert asyncio.run(table_exists(disposable_postgres_url, "outbox_events"))

    command.downgrade(config, "-1")
    assert not asyncio.run(table_exists(disposable_postgres_url, "recurring_rules"))
    assert not asyncio.run(table_exists(disposable_postgres_url, "outbox_events"))

    command.upgrade(config, "202606210601")
    assert asyncio.run(table_exists(disposable_postgres_url, "recurring_rules"))
    assert asyncio.run(table_exists(disposable_postgres_url, "outbox_events"))


def test_recurring_outbox_migration_persists_worker_constraints(
    disposable_postgres_url: str,
) -> None:
    config = build_alembic_config(disposable_postgres_url)

    command.downgrade(config, "base")
    command.upgrade(config, "202606210601")

    assert asyncio.run(
        foreign_key_exists(
            disposable_postgres_url,
            "recurring_rules",
            "fk_recurring_rules_account_id_user_id_accounts",
            ["account_id", "user_id"],
        )
    )
    assert asyncio.run(
        index_exists(
            disposable_postgres_url,
            "recurring_rules",
            "ix_recurring_rules_due_active_next_run_at",
        )
    )
    assert asyncio.run(
        unique_constraint_exists(
            disposable_postgres_url,
            "outbox_events",
            "uq_outbox_events_event_type_idempotency_key",
            ["event_type", "idempotency_key"],
        )
    )


def test_recurring_completion_migration_up_down_up(
    disposable_postgres_url: str,
) -> None:
    config = build_alembic_config(disposable_postgres_url)

    command.downgrade(config, "base")
    command.upgrade(config, "202607130602")
    assert asyncio.run(
        column_exists(
            disposable_postgres_url,
            "recurring_rules",
            "last_paid_period",
        )
    )
    assert asyncio.run(
        check_constraint_exists(
            disposable_postgres_url,
            "recurring_rules",
            "ck_recurring_rules_last_paid_period_format",
        )
    )

    command.downgrade(config, "202607120502")
    assert not asyncio.run(
        column_exists(
            disposable_postgres_url,
            "recurring_rules",
            "last_paid_period",
        )
    )

    command.upgrade(config, "202607130602")


async def table_exists(database_url: str, table_name: str) -> bool:
    engine = build_async_engine(database_url)

    try:
        async with engine.connect() as connection:
            return await connection.run_sync(
                lambda sync_connection: inspect(sync_connection).has_table(table_name)
            )
    finally:
        await engine.dispose()


async def column_exists(
    database_url: str,
    table_name: str,
    column_name: str,
) -> bool:
    engine = build_async_engine(database_url)

    try:
        async with engine.connect() as connection:
            columns = await connection.run_sync(
                lambda sync_connection: inspect(sync_connection).get_columns(table_name)
            )
    finally:
        await engine.dispose()

    return any(column["name"] == column_name for column in columns)


async def check_constraint_exists(
    database_url: str,
    table_name: str,
    constraint_name: str,
) -> bool:
    engine = build_async_engine(database_url)

    try:
        async with engine.connect() as connection:
            constraints = await connection.run_sync(
                lambda sync_connection: inspect(sync_connection).get_check_constraints(
                    table_name
                )
            )
    finally:
        await engine.dispose()

    return any(constraint["name"] == constraint_name for constraint in constraints)


async def foreign_key_exists(
    database_url: str,
    table_name: str,
    foreign_key_name: str,
    constrained_columns: list[str],
) -> bool:
    engine = build_async_engine(database_url)

    try:
        async with engine.connect() as connection:
            foreign_keys = await connection.run_sync(
                lambda sync_connection: inspect(sync_connection).get_foreign_keys(
                    table_name
                )
            )
    finally:
        await engine.dispose()

    return any(
        foreign_key["name"] == foreign_key_name
        and foreign_key["constrained_columns"] == constrained_columns
        for foreign_key in foreign_keys
    )


async def index_exists(
    database_url: str,
    table_name: str,
    index_name: str,
) -> bool:
    engine = build_async_engine(database_url)

    try:
        async with engine.connect() as connection:
            indexes = await connection.run_sync(
                lambda sync_connection: inspect(sync_connection).get_indexes(table_name)
            )
    finally:
        await engine.dispose()

    return any(index["name"] == index_name for index in indexes)


async def unique_constraint_exists(
    database_url: str,
    table_name: str,
    constraint_name: str,
    column_names: list[str],
) -> bool:
    engine = build_async_engine(database_url)

    try:
        async with engine.connect() as connection:
            constraints = await connection.run_sync(
                lambda sync_connection: inspect(sync_connection).get_unique_constraints(
                    table_name
                )
            )
    finally:
        await engine.dispose()

    return any(
        constraint["name"] == constraint_name
        and constraint["column_names"] == column_names
        for constraint in constraints
    )
