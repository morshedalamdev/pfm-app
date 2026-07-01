from __future__ import annotations

import asyncio
from collections.abc import Sequence
from pathlib import Path

from alembic.config import Config
from sqlalchemy import (
    CheckConstraint,
    ForeignKeyConstraint,
    Index,
    UniqueConstraint,
    inspect,
)

from alembic import command
from app.core.database import Base, build_async_engine
from app.modules.receipts.models import Receipt


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


def test_receipt_model_schema() -> None:
    table = Receipt.__table__

    assert table.metadata is Base.metadata
    assert set(table.columns.keys()) == {
        "id",
        "user_id",
        "transaction_id",
        "storage_backend",
        "storage_key",
        "original_filename",
        "content_type",
        "size_bytes",
        "checksum_sha256",
        "deleted_at",
        "created_at",
    }
    assert table.columns.storage_backend.type.length == 40
    assert table.columns.storage_key.type.length == 500
    assert table.columns.original_filename.type.length == 255
    assert table.columns.content_type.type.length == 120
    assert table.columns.checksum_sha256.type.length == 64
    assert table.columns.created_at.type.timezone is True
    assert table.columns.deleted_at.type.timezone is True
    assert {
        "ck_receipts_size_bytes_positive",
        "ck_receipts_checksum_sha256_length",
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
        "fk_receipts_user_id_users",
        "fk_receipts_transaction_id_user_id_transactions",
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
        "uq_receipts_id_user_id",
        "uq_receipts_storage_key",
    }.issubset(
        constraint_names(
            [
                constraint
                for constraint in table.constraints
                if isinstance(constraint, UniqueConstraint)
            ]
        )
    )
    assert {
        "ix_receipts_user_id_created_at",
        "ix_receipts_user_id_transaction_id",
        "ix_receipts_active_user_created_at",
    }.issubset(index_names(table.indexes))


def test_receipt_migration_up_down_up_table(
    disposable_postgres_url: str,
) -> None:
    config = build_alembic_config(disposable_postgres_url)

    command.upgrade(config, "head")
    assert asyncio.run(table_exists(disposable_postgres_url, "receipts"))

    command.downgrade(config, "-1")
    assert not asyncio.run(table_exists(disposable_postgres_url, "receipts"))

    command.upgrade(config, "head")
    assert asyncio.run(table_exists(disposable_postgres_url, "receipts"))


async def table_exists(database_url: str, table_name: str) -> bool:
    engine = build_async_engine(database_url)
    try:
        async with engine.connect() as connection:
            return bool(
                await connection.run_sync(
                    lambda sync_connection: inspect(sync_connection).has_table(
                        table_name
                    )
                )
            )
    finally:
        await engine.dispose()
