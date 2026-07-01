import pytest
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
    settings = Settings()

    assert (
        settings.database_url == "postgresql+asyncpg://pfm_app@localhost:5432/pfm_app"
    )
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
