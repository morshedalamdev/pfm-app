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
from app.modules.accounts.models import Account
from app.modules.categories.models import Category
from app.modules.idempotency.models import IdempotencyRecord
from app.modules.transactions.models import Transaction, TransferLink


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


def test_account_model_schema() -> None:
    table = Account.__table__

    assert table.metadata is Base.metadata
    assert set(table.columns.keys()) == {
        "id",
        "user_id",
        "name",
        "type",
        "currency",
        "opening_balance",
        "loan_balance_adjustment",
        "is_archived",
        "archived_at",
        "is_disabled",
        "disabled_at",
        "is_default",
        "created_at",
        "updated_at",
    }
    assert table.columns.name.type.length == 120
    assert table.columns.type.type.length == 40
    assert table.columns.currency.type.length == 3
    assert_numeric_money(table.columns.opening_balance.type)
    assert_numeric_money(table.columns.loan_balance_adjustment.type)
    assert "uq_accounts_id_user_id" in constraint_names(
        [
            constraint
            for constraint in table.constraints
            if isinstance(constraint, UniqueConstraint)
        ]
    )
    assert "ck_accounts_opening_balance_non_negative" in check_constraint_names(
        [
            constraint
            for constraint in table.constraints
            if isinstance(constraint, CheckConstraint)
        ]
    )
    assert {
        "ck_accounts_disabled_state_consistent",
        "ck_accounts_default_account_active",
    }.issubset(
        check_constraint_names(
            [
                constraint
                for constraint in table.constraints
                if isinstance(constraint, CheckConstraint)
            ]
        )
    )
    assert index_names(table.indexes) == {
        "ix_accounts_user_id",
        "ix_accounts_user_id_archived_at",
        "ix_accounts_user_id_disabled_at",
        "ix_accounts_user_id_name",
        "uq_accounts_one_active_default_per_user",
    }


def test_category_model_schema() -> None:
    table = Category.__table__

    assert table.metadata is Base.metadata
    assert set(table.columns.keys()) == {
        "id",
        "user_id",
        "name",
        "kind",
        "icon_key",
        "is_default",
        "is_archived",
        "archived_at",
        "created_at",
        "updated_at",
    }
    assert table.columns.name.type.length == 120
    assert table.columns.kind.type.length == 20
    assert table.columns.icon_key.type.length == 80
    assert {
        "uq_categories_id_user_id",
        "uq_categories_user_kind_name",
    }.issubset(
        constraint_names(
            [
                constraint
                for constraint in table.constraints
                if isinstance(constraint, UniqueConstraint)
            ]
        )
    )
    assert "ck_categories_kind_supported" in check_constraint_names(
        [
            constraint
            for constraint in table.constraints
            if isinstance(constraint, CheckConstraint)
        ]
    )
    assert index_names(table.indexes) == {
        "ix_categories_user_id",
        "ix_categories_user_id_kind",
        "ix_categories_user_id_archived_at",
    }


def test_transaction_model_schema() -> None:
    table = Transaction.__table__

    assert table.metadata is Base.metadata
    assert set(table.columns.keys()) == {
        "id",
        "user_id",
        "account_id",
        "category_id",
        "type",
        "amount",
        "currency",
        "transaction_at",
        "description",
        "voided_at",
        "created_at",
        "updated_at",
    }
    assert table.columns.category_id.nullable is True
    assert table.columns.transaction_at.type.timezone is True
    assert table.columns.type.type.length == 32
    assert_numeric_money(table.columns.amount.type)
    assert {
        "ck_transactions_type_supported",
        "ck_transactions_amount_positive",
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
        "fk_transactions_account_id_user_id_accounts",
        "fk_transactions_category_id_user_id_categories",
        "fk_transactions_user_id_users",
    }.issubset(
        foreign_key_names(
            [
                constraint
                for constraint in table.constraints
                if isinstance(constraint, ForeignKeyConstraint)
            ]
        )
    )
    assert index_names(table.indexes) == {
        "ix_transactions_user_id_transaction_at",
        "ix_transactions_user_id_account_id_transaction_at",
        "ix_transactions_user_id_category_id_transaction_at",
        "ix_transactions_user_id_type_transaction_at",
        "ix_transactions_reports_active_user_at",
    }


def test_transfer_link_model_schema() -> None:
    table = TransferLink.__table__

    assert table.metadata is Base.metadata
    assert set(table.columns.keys()) == {
        "id",
        "user_id",
        "debit_transaction_id",
        "credit_transaction_id",
        "amount",
        "currency",
        "created_at",
    }
    assert_numeric_money(table.columns.amount.type)
    assert {
        "ck_transfer_links_amount_positive",
        "ck_transfer_links_distinct_transaction_rows",
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
        "fk_transfer_links_debit_transaction_id_user_id_transactions",
        "fk_transfer_links_credit_transaction_id_user_id_transactions",
        "fk_transfer_links_user_id_users",
    }.issubset(
        foreign_key_names(
            [
                constraint
                for constraint in table.constraints
                if isinstance(constraint, ForeignKeyConstraint)
            ]
        )
    )
    assert {
        "uq_transfer_links_debit_transaction_id",
        "uq_transfer_links_credit_transaction_id",
    }.issubset(
        constraint_names(
            [
                constraint
                for constraint in table.constraints
                if isinstance(constraint, UniqueConstraint)
            ]
        )
    )
    assert index_names(table.indexes) == {"ix_transfer_links_user_id_created_at"}


def test_idempotency_record_model_schema() -> None:
    table = IdempotencyRecord.__table__

    assert table.metadata is Base.metadata
    assert set(table.columns.keys()) == {
        "id",
        "user_id",
        "operation",
        "idempotency_key",
        "request_hash",
        "response_status_code",
        "response_body",
        "locked_until",
        "expires_at",
        "created_at",
        "updated_at",
    }
    assert table.columns.operation.type.length == 120
    assert table.columns.idempotency_key.type.length == 255
    assert table.columns.request_hash.type.length == 128
    assert "uq_idempotency_records_user_operation_key" in constraint_names(
        [
            constraint
            for constraint in table.constraints
            if isinstance(constraint, UniqueConstraint)
        ]
    )
    assert index_names(table.indexes) == {
        "ix_idempotency_records_user_id",
        "ix_idempotency_records_expires_at",
    }


def test_finance_migration_up_down_up_tables(
    disposable_postgres_url: str,
) -> None:
    config = build_alembic_config(disposable_postgres_url)

    command.downgrade(config, "base")
    command.upgrade(config, "202606150301")
    for table_name in {
        "accounts",
        "categories",
        "transactions",
        "transfer_links",
        "idempotency_records",
    }:
        assert asyncio.run(table_exists(disposable_postgres_url, table_name)) is True

    command.downgrade(config, "-1")
    for table_name in {
        "accounts",
        "categories",
        "transactions",
        "transfer_links",
        "idempotency_records",
    }:
        assert asyncio.run(table_exists(disposable_postgres_url, table_name)) is False

    command.upgrade(config, "202606150301")
    for table_name in {
        "accounts",
        "categories",
        "transactions",
        "transfer_links",
        "idempotency_records",
    }:
        assert asyncio.run(table_exists(disposable_postgres_url, table_name)) is True


def test_finance_migration_persists_ownership_constraints(
    disposable_postgres_url: str,
) -> None:
    config = build_alembic_config(disposable_postgres_url)

    command.downgrade(config, "base")
    command.upgrade(config, "202606150301")

    assert asyncio.run(
        foreign_key_exists(
            disposable_postgres_url,
            "transactions",
            "fk_transactions_account_id_user_id_accounts",
            ["account_id", "user_id"],
        )
    )
    assert asyncio.run(
        foreign_key_exists(
            disposable_postgres_url,
            "transactions",
            "fk_transactions_category_id_user_id_categories",
            ["category_id", "user_id"],
        )
    )
    assert asyncio.run(
        foreign_key_exists(
            disposable_postgres_url,
            "transfer_links",
            "fk_transfer_links_debit_transaction_id_user_id_transactions",
            ["debit_transaction_id", "user_id"],
        )
    )


async def table_exists(database_url: str, table_name: str) -> bool:
    engine = build_async_engine(database_url)

    try:
        async with engine.connect() as connection:
            return await connection.run_sync(
                lambda sync_connection: inspect(sync_connection).has_table(table_name)
            )
    finally:
        await engine.dispose()


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
