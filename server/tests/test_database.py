import pytest
from pydantic import ValidationError
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.database import (
    NAMING_CONVENTION,
    Base,
    build_async_engine,
    build_session_factory,
    check_database_connection,
    get_session_from_factory,
)


def test_database_settings_defaults_are_safe_local_values() -> None:
    settings = Settings(_env_file=None)

    assert Settings.model_config["env_file"] == ".env"
    assert (
        settings.database_url == "postgresql+asyncpg://pfm_app@localhost:5432/pfm_app"
    )
    assert settings.migration_database_url is None
    assert settings.database_echo is False
    assert settings.database_pool_size == 5
    assert settings.database_max_overflow == 10
    assert settings.recurring_worker_batch_size == 25
    assert settings.recurring_worker_lock_seconds == 60
    assert settings.recurring_worker_poll_seconds == 30
    assert settings.outbox_worker_batch_size == 25
    assert settings.outbox_worker_lock_seconds == 60
    assert settings.outbox_worker_max_backoff_seconds == 300
    assert settings.outbox_worker_poll_seconds == 30
    assert settings.storage_backend == "local"
    assert settings.local_storage_root == ".local/storage"
    assert settings.email_backend == "console"
    assert settings.email_from_address == "no-reply@localhost"
    assert settings.receipt_max_upload_bytes == 5 * 1024 * 1024
    assert settings.receipt_allowed_content_types == [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
    ]


def test_neon_database_urls_are_normalized_for_sqlalchemy_asyncpg() -> None:
    settings = Settings(
        _env_file=None,
        database_url=(
            "postgresql://user:password@example-pooler.neon.tech/database"
            "?sslmode=require&channel_binding=require"
        ),
        migration_database_url=(
            "postgres://user:password@example.neon.tech/database"
            "?sslmode=require&channel_binding=require"
        ),
    )

    assert settings.database_url == (
        "postgresql+asyncpg://user:password@example-pooler.neon.tech/database"
        "?ssl=require"
    )
    assert settings.migration_database_url == (
        "postgresql+asyncpg://user:password@example.neon.tech/database?ssl=require"
    )


def test_blank_optional_migration_url_becomes_none() -> None:
    settings = Settings(_env_file=None, migration_database_url="")

    assert settings.migration_database_url is None


def test_database_url_rejects_non_async_postgres_drivers() -> None:
    with pytest.raises(ValidationError, match="asyncpg driver"):
        Settings(_env_file=None, database_url="sqlite+aiosqlite:///pfm.db")


def test_production_settings_reject_local_secrets() -> None:
    with pytest.raises(ValidationError, match="ACCESS_TOKEN_SECRET_KEY"):
        Settings(
            _env_file=None,
            app_env="production",
            cors_origins=["https://pfm.example.com"],
        )


def test_production_settings_require_https_cors_origins() -> None:
    with pytest.raises(ValidationError, match="explicit HTTPS origins"):
        Settings(
            _env_file=None,
            app_env="production",
            cors_origins=["http://pfm.example.com"],
            access_token_secret_key="a" * 32,
            refresh_token_secret_key="b" * 32,
        )


def test_production_settings_accept_secure_explicit_values() -> None:
    settings = Settings(
        _env_file=None,
        app_env="production",
        debug=False,
        cors_origins=["https://pfm.example.com"],
        access_token_secret_key="a" * 32,
        refresh_token_secret_key="b" * 32,
    )

    assert settings.app_env == "production"


def test_base_metadata_uses_naming_convention() -> None:
    assert Base.metadata.naming_convention == NAMING_CONVENTION


@pytest.mark.asyncio
async def test_async_database_connection_helper(
    disposable_postgres_url: str,
) -> None:
    engine = build_async_engine(disposable_postgres_url)

    try:
        assert await check_database_connection(engine) is True
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_async_session_factory_executes_against_disposable_postgres(
    disposable_postgres_url: str,
) -> None:
    engine = build_async_engine(disposable_postgres_url)
    session_factory = build_session_factory(engine)

    try:
        async with session_factory() as session:
            assert isinstance(session, AsyncSession)
            result = await session.execute(text("SELECT 42"))
            assert result.scalar_one() == 42
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_session_dependency_yields_request_scoped_session(
    disposable_postgres_url: str,
) -> None:
    engine = build_async_engine(disposable_postgres_url)
    session_factory = build_session_factory(engine)

    try:
        async for session in get_session_from_factory(session_factory):
            result = await session.execute(text("SELECT 7"))
            assert result.scalar_one() == 7
            assert session.is_active
    finally:
        await engine.dispose()
