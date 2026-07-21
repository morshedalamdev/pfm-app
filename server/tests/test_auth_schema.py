from __future__ import annotations

import asyncio
from collections.abc import Sequence
from pathlib import Path

from alembic.config import Config
from sqlalchemy import Index, UniqueConstraint, inspect

from alembic import command
from app.core.database import Base, build_async_engine
from app.modules.auth.models import (
    OAuthIdentity,
    OAuthLinkIntent,
    OAuthLoginExchange,
    RefreshSession,
)
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
        "base_currency",
        "base_currency_changed_at",
        "home_balance_source_type",
        "home_balance_source_id",
        "is_active",
        "created_at",
        "updated_at",
    }
    assert table.columns.email.type.length == 320
    assert table.columns.password_hash.type.length == 255
    assert table.columns.password_hash.nullable is True
    assert table.columns.full_name.type.length == 120
    assert table.columns.phone_number.type.length == 32
    assert table.columns.occupation.type.length == 80
    assert table.columns.about.type.length == 1000
    assert table.columns.base_currency.type.length == 3
    assert table.columns.base_currency.nullable is False
    assert table.columns.base_currency_changed_at.nullable is True
    assert table.columns.home_balance_source_type.type.length == 20
    assert table.columns.home_balance_source_type.nullable is True
    assert table.columns.home_balance_source_id.nullable is True
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


def test_oauth_identity_model_schema() -> None:
    table = OAuthIdentity.__table__

    assert table.metadata is Base.metadata
    assert set(table.columns.keys()) == {
        "id",
        "user_id",
        "provider",
        "provider_subject",
        "created_at",
        "updated_at",
    }
    assert table.columns.provider.type.length == 20
    assert table.columns.provider_subject.type.length == 255
    assert constraint_names(
        [
            constraint
            for constraint in table.constraints
            if isinstance(constraint, UniqueConstraint)
        ]
    ) == {
        "uq_oauth_identities_provider_subject",
        "uq_oauth_identities_user_provider",
    }
    assert index_names(table.indexes) == {"ix_oauth_identities_user_id"}


def test_oauth_login_exchange_model_schema() -> None:
    table = OAuthLoginExchange.__table__

    assert table.metadata is Base.metadata
    assert set(table.columns.keys()) == {
        "id",
        "user_id",
        "code_hash",
        "expires_at",
        "consumed_at",
        "created_at",
    }
    assert table.columns.code_hash.type.length == 64
    assert table.columns.consumed_at.nullable is True
    assert "uq_oauth_login_exchanges_code_hash" in constraint_names(
        [
            constraint
            for constraint in table.constraints
            if isinstance(constraint, UniqueConstraint)
        ]
    )
    assert index_names(table.indexes) == {
        "ix_oauth_login_exchanges_user_id",
        "ix_oauth_login_exchanges_expires_at",
        "ix_oauth_login_exchanges_consumed_at",
    }


def test_oauth_link_intent_model_schema() -> None:
    table = OAuthLinkIntent.__table__

    assert table.metadata is Base.metadata
    assert set(table.columns.keys()) == {
        "id",
        "user_id",
        "provider",
        "code_hash",
        "expires_at",
        "consumed_at",
        "created_at",
    }
    assert table.columns.provider.type.length == 20
    assert table.columns.code_hash.type.length == 64
    assert table.columns.consumed_at.nullable is True
    assert "uq_oauth_link_intents_code_hash" in constraint_names(
        [
            constraint
            for constraint in table.constraints
            if isinstance(constraint, UniqueConstraint)
        ]
    )
    assert index_names(table.indexes) == {
        "ix_oauth_link_intents_user_id",
        "ix_oauth_link_intents_expires_at",
        "ix_oauth_link_intents_consumed_at",
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


def test_oauth_migration_up_down_up_schema(
    disposable_postgres_url: str,
) -> None:
    config = build_alembic_config(disposable_postgres_url)

    command.upgrade(config, "head")
    assert asyncio.run(table_exists(disposable_postgres_url, "oauth_identities"))
    assert asyncio.run(table_exists(disposable_postgres_url, "oauth_login_exchanges"))
    assert asyncio.run(table_exists(disposable_postgres_url, "oauth_link_intents"))
    assert asyncio.run(
        column_is_nullable(disposable_postgres_url, "users", "password_hash")
    )

    command.downgrade(config, "202607180901")
    assert asyncio.run(table_exists(disposable_postgres_url, "oauth_identities"))
    assert asyncio.run(table_exists(disposable_postgres_url, "oauth_login_exchanges"))
    assert not asyncio.run(table_exists(disposable_postgres_url, "oauth_link_intents"))

    command.upgrade(config, "head")
    command.downgrade(config, "202607130703")
    assert not asyncio.run(table_exists(disposable_postgres_url, "oauth_identities"))
    assert not asyncio.run(
        table_exists(disposable_postgres_url, "oauth_login_exchanges")
    )
    assert not asyncio.run(table_exists(disposable_postgres_url, "oauth_link_intents"))
    assert not asyncio.run(
        column_is_nullable(disposable_postgres_url, "users", "password_hash")
    )

    command.upgrade(config, "head")
    assert asyncio.run(table_exists(disposable_postgres_url, "oauth_identities"))
    assert asyncio.run(table_exists(disposable_postgres_url, "oauth_login_exchanges"))
    assert asyncio.run(table_exists(disposable_postgres_url, "oauth_link_intents"))
    assert asyncio.run(
        column_is_nullable(disposable_postgres_url, "users", "password_hash")
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


async def column_is_nullable(
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
            return next(
                bool(column["nullable"])
                for column in columns
                if column["name"] == column_name
            )
    finally:
        await engine.dispose()
