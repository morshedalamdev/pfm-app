from __future__ import annotations

import asyncio
from collections.abc import Sequence
from pathlib import Path

from alembic.config import Config
from sqlalchemy import Index, UniqueConstraint, inspect

from alembic import command
from app.core.database import Base, build_async_engine
from app.modules.auth.models import RefreshSession
from app.modules.auth.repositories import RefreshSessionRepository
from app.modules.auth.services import AuthService
from app.modules.users.models import User
from app.modules.users.repositories import UserRepository


def build_alembic_config(database_url: str) -> Config:
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def constraint_names(constraints: Sequence[UniqueConstraint]) -> set[str | None]:
    return {constraint.name for constraint in constraints}


def index_names(indexes: set[Index]) -> set[str]:
    return {index.name for index in indexes if index.name is not None}


def test_user_model_schema() -> None:
    table = User.__table__

    assert table.metadata is Base.metadata
    assert set(table.columns.keys()) == {
        "id",
        "email",
        "password_hash",
        "full_name",
        "phone_number",
        "occupation",
        "about",
        "is_active",
        "created_at",
        "updated_at",
    }
    assert table.columns.email.type.length == 320
    assert table.columns.password_hash.type.length == 255
    assert table.columns.full_name.type.length == 120
    assert table.columns.phone_number.type.length == 32
    assert table.columns.occupation.type.length == 80
    assert table.columns.about.type.length == 1000
    assert table.columns.is_active.nullable is False
    assert "uq_users_email" in constraint_names(
        [
            constraint
            for constraint in table.constraints
            if isinstance(constraint, UniqueConstraint)
        ]
    )


def test_refresh_session_model_schema() -> None:
    table = RefreshSession.__table__

    assert table.metadata is Base.metadata
    assert set(table.columns.keys()) == {
        "id",
        "user_id",
        "token_hash",
        "session_family_id",
        "parent_session_id",
        "replaced_by_session_id",
        "expires_at",
        "revoked_at",
        "revoked_reason",
        "created_at",
        "updated_at",
    }
    assert table.columns.token_hash.type.length == 255
    assert table.columns.revoked_reason.type.length == 120
    assert "uq_refresh_sessions_token_hash" in constraint_names(
        [
            constraint
            for constraint in table.constraints
            if isinstance(constraint, UniqueConstraint)
        ]
    )
    assert index_names(table.indexes) == {
        "ix_refresh_sessions_user_id",
        "ix_refresh_sessions_session_family_id",
        "ix_refresh_sessions_expires_at",
        "ix_refresh_sessions_revoked_at",
    }


def test_auth_service_composes_repository_skeletons() -> None:
    users = UserRepository.__new__(UserRepository)
    refresh_sessions = RefreshSessionRepository.__new__(RefreshSessionRepository)
    service = AuthService(users, refresh_sessions)

    assert service.users is users
    assert service.refresh_sessions is refresh_sessions


def test_auth_migration_up_down_up_tables(
    disposable_postgres_url: str,
) -> None:
    config = build_alembic_config(disposable_postgres_url)

    command.downgrade(config, "base")
    command.upgrade(config, "202606150201")
    assert asyncio.run(table_exists(disposable_postgres_url, "users")) is True
    assert (
        asyncio.run(table_exists(disposable_postgres_url, "refresh_sessions")) is True
    )

    command.downgrade(config, "-1")
    assert asyncio.run(table_exists(disposable_postgres_url, "users")) is False
    assert (
        asyncio.run(table_exists(disposable_postgres_url, "refresh_sessions")) is False
    )

    command.upgrade(config, "202606150201")
    assert asyncio.run(table_exists(disposable_postgres_url, "users")) is True
    assert (
        asyncio.run(table_exists(disposable_postgres_url, "refresh_sessions")) is True
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
