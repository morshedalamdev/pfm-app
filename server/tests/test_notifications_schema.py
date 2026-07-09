from __future__ import annotations

import asyncio
from collections.abc import Sequence
from pathlib import Path

from alembic.config import Config
from sqlalchemy import CheckConstraint, ForeignKeyConstraint, Index, inspect

from alembic import command
from app.core.database import Base, build_async_engine
from app.modules.notifications.models import Notification


def build_alembic_config(database_url: str) -> Config:
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def check_constraint_names(constraints: Sequence[CheckConstraint]) -> set[str | None]:
    return {constraint.name for constraint in constraints}


def foreign_key_names(constraints: Sequence[ForeignKeyConstraint]) -> set[str | None]:
    return {constraint.name for constraint in constraints}


def index_names(indexes: set[Index]) -> set[str]:
    return {index.name for index in indexes if index.name is not None}


def test_notification_model_schema() -> None:
    table = Notification.__table__

    assert table.metadata is Base.metadata
    assert set(table.columns.keys()) == {
        "id",
        "user_id",
        "type",
        "title",
        "message",
        "payload",
        "read_at",
        "email_delivery_status",
        "email_requested_at",
        "email_sent_at",
        "email_adapter",
        "email_provider_message_id",
        "email_error",
        "created_at",
        "updated_at",
    }
    assert table.columns.type.type.length == 80
    assert table.columns.title.type.length == 160
    assert table.columns.email_delivery_status.type.length == 20
    assert table.columns.email_adapter.type.length == 40
    assert table.columns.email_provider_message_id.type.length == 255
    assert table.columns.created_at.type.timezone is True
    assert table.columns.updated_at.type.timezone is True
    assert table.columns.read_at.type.timezone is True
    assert table.columns.email_requested_at.type.timezone is True
    assert table.columns.email_sent_at.type.timezone is True
    assert {
        "ck_notifications_email_delivery_status_supported",
        "ck_notifications_email_sent_requires_request",
        "ck_notifications_read_at_not_before_created_at",
    }.issubset(
        check_constraint_names(
            [
                constraint
                for constraint in table.constraints
                if isinstance(constraint, CheckConstraint)
            ]
        )
    )
    assert {"fk_notifications_user_id_users"}.issubset(
        foreign_key_names(
            [
                constraint
                for constraint in table.constraints
                if isinstance(constraint, ForeignKeyConstraint)
            ]
        )
    )
    assert {
        "ix_notifications_user_id_created_at",
        "ix_notifications_unread_user_created_at",
        "ix_notifications_user_id_type",
        "ix_notifications_email_delivery_status",
    }.issubset(index_names(table.indexes))


def test_notification_migration_up_down_up_table(
    disposable_postgres_url: str,
) -> None:
    config = build_alembic_config(disposable_postgres_url)

    command.downgrade(config, "base")
    command.upgrade(config, "202607010703")
    assert asyncio.run(table_exists(disposable_postgres_url, "notifications"))

    command.downgrade(config, "-1")
    assert not asyncio.run(table_exists(disposable_postgres_url, "notifications"))

    command.upgrade(config, "202607010703")
    assert asyncio.run(table_exists(disposable_postgres_url, "notifications"))


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
