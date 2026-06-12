import contextlib
import shutil
import socket
import subprocess
from collections.abc import Iterator
from pathlib import Path

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


def find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def postgres_bin(name: str) -> str | None:
    direct = shutil.which(name)
    if direct:
        return direct

    pg_config = shutil.which("pg_config")
    if not pg_config:
        return None

    result = subprocess.run(
        [pg_config, "--bindir"],
        check=True,
        capture_output=True,
        text=True,
    )
    candidate = Path(result.stdout.strip()) / name
    return str(candidate) if candidate.exists() else None


@pytest.fixture(scope="session")
def disposable_postgres_url(tmp_path_factory: pytest.TempPathFactory) -> Iterator[str]:
    initdb = postgres_bin("initdb")
    pg_ctl = postgres_bin("pg_ctl")
    if not initdb or not pg_ctl:
        pytest.skip("PostgreSQL server binaries are not available")

    data_dir = tmp_path_factory.mktemp("postgres-data")
    log_path = tmp_path_factory.mktemp("postgres-log") / "postgres.log"
    port = find_free_port()

    subprocess.run(
        [initdb, "-D", str(data_dir), "-A", "trust", "-U", "pfm_test"],
        check=True,
        capture_output=True,
        text=True,
    )

    subprocess.run(
        [
            pg_ctl,
            "-D",
            str(data_dir),
            "-l",
            str(log_path),
            "-o",
            f"-F -h 127.0.0.1 -p {port}",
            "-w",
            "start",
        ],
        check=True,
        capture_output=True,
        text=True,
    )

    try:
        yield f"postgresql+asyncpg://pfm_test@127.0.0.1:{port}/postgres"
    finally:
        with contextlib.suppress(subprocess.CalledProcessError):
            subprocess.run(
                [pg_ctl, "-D", str(data_dir), "-m", "fast", "-w", "stop"],
                check=True,
                capture_output=True,
                text=True,
            )


def test_database_settings_defaults_are_safe_local_values() -> None:
    settings = Settings()

    assert (
        settings.database_url == "postgresql+asyncpg://pfm_app@localhost:5432/pfm_app"
    )
    assert settings.database_echo is False
    assert settings.database_pool_size == 5
    assert settings.database_max_overflow == 10


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
