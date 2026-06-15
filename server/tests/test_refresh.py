from __future__ import annotations

import asyncio
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from alembic.config import Config
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select

from alembic import command
from app.core.config import Settings
from app.core.database import (
    build_async_engine,
    build_session_factory,
    get_session,
    get_session_from_factory,
)
from app.core.security import decode_access_token, hash_refresh_token
from app.main import create_app
from app.modules.auth.models import RefreshSession


@dataclass(frozen=True)
class RefreshTestContext:
    client: TestClient
    database_url: str
    settings: Settings


def build_alembic_config(database_url: str) -> Config:
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


@pytest.fixture
def refresh_context(disposable_postgres_url: str) -> Iterator[RefreshTestContext]:
    command.upgrade(build_alembic_config(disposable_postgres_url), "head")
    engine = build_async_engine(disposable_postgres_url)
    session_factory = build_session_factory(engine)
    settings = build_refresh_test_settings(disposable_postgres_url)
    app = create_refresh_test_app(settings)

    async def test_session() -> object:
        async for session in get_session_from_factory(session_factory):
            yield session

    app.dependency_overrides[get_session] = test_session

    try:
        with TestClient(app) as client:
            yield RefreshTestContext(
                client=client,
                database_url=disposable_postgres_url,
                settings=settings,
            )
    finally:
        asyncio.run(engine.dispose())


def build_refresh_test_settings(database_url: str) -> Settings:
    return Settings(
        app_name="PFM Test API",
        app_env="test",
        debug=False,
        cors_origins=["http://testserver"],
        database_url=database_url,
        access_token_secret_key="test-access-token-secret-with-at-least-32-bytes",
        refresh_token_secret_key="test-refresh-token-secret-with-at-least-32-bytes",
        access_token_expire_minutes=15,
        refresh_token_expire_days=30,
    )


def create_refresh_test_app(settings: Settings) -> FastAPI:
    return create_app(settings)


def test_login_creates_hashed_refresh_session(
    refresh_context: RefreshTestContext,
) -> None:
    login_body = register_and_login(refresh_context, "stored-refresh@example.com")
    refresh_token = login_body["refresh_token"]
    refresh_session = asyncio.run(fetch_refresh_session(refresh_context, refresh_token))

    assert refresh_session is not None
    assert refresh_session.token_hash == hash_refresh_token(
        refresh_token,
        refresh_context.settings,
    )
    assert refresh_session.token_hash != refresh_token
    assert refresh_session.revoked_at is None
    assert refresh_session.replaced_by_session_id is None


def test_refresh_success_rotates_token_and_access_token(
    refresh_context: RefreshTestContext,
) -> None:
    login_body = register_and_login(refresh_context, "refresh-success@example.com")
    old_refresh_token = login_body["refresh_token"]

    response = refresh_context.client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": old_refresh_token},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["expires_in"] == 900
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["refresh_token"] != old_refresh_token
    assert decode_access_token(
        body["access_token"], refresh_context.settings
    ).email == ("refresh-success@example.com")

    old_session = asyncio.run(fetch_refresh_session(refresh_context, old_refresh_token))
    new_session = asyncio.run(
        fetch_refresh_session(refresh_context, body["refresh_token"])
    )
    assert old_session is not None
    assert new_session is not None
    assert old_session.revoked_reason == "rotated"
    assert old_session.replaced_by_session_id == new_session.id
    assert new_session.parent_session_id == old_session.id
    assert new_session.session_family_id == old_session.session_family_id


def test_refresh_reuse_rejects_and_revokes_session_family(
    refresh_context: RefreshTestContext,
) -> None:
    login_body = register_and_login(refresh_context, "reuse@example.com")
    old_refresh_token = login_body["refresh_token"]
    rotate_response = refresh_context.client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": old_refresh_token},
    )
    new_refresh_token = rotate_response.json()["refresh_token"]

    reuse_response = refresh_context.client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": old_refresh_token},
    )
    new_token_response = refresh_context.client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": new_refresh_token},
    )

    assert reuse_response.status_code == 401
    assert reuse_response.json()["error"]["message"] == "Invalid refresh token"
    assert new_token_response.status_code == 401
    new_session = asyncio.run(fetch_refresh_session(refresh_context, new_refresh_token))
    assert new_session is not None
    assert new_session.revoked_reason == "reuse_detected"


def test_refresh_expired_token_is_rejected(
    refresh_context: RefreshTestContext,
) -> None:
    login_body = register_and_login(refresh_context, "expired-refresh@example.com")
    refresh_token = login_body["refresh_token"]
    asyncio.run(
        set_refresh_session_expiry(
            refresh_context,
            refresh_token,
            datetime.now(UTC) - timedelta(seconds=1),
        )
    )

    response = refresh_context.client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )

    assert response.status_code == 401
    refresh_session = asyncio.run(fetch_refresh_session(refresh_context, refresh_token))
    assert refresh_session is not None
    assert refresh_session.revoked_reason == "expired"


def test_logout_revokes_refresh_token(
    refresh_context: RefreshTestContext,
) -> None:
    login_body = register_and_login(refresh_context, "logout@example.com")
    refresh_token = login_body["refresh_token"]

    logout_response = refresh_context.client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refresh_token},
    )
    refresh_response = refresh_context.client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )

    assert logout_response.status_code == 200
    assert logout_response.json() == {"status": "ok"}
    assert refresh_response.status_code == 401
    refresh_session = asyncio.run(fetch_refresh_session(refresh_context, refresh_token))
    assert refresh_session is not None
    assert refresh_session.revoked_reason == "logout"


def test_revoked_refresh_token_cannot_be_reused_successfully(
    refresh_context: RefreshTestContext,
) -> None:
    login_body = register_and_login(refresh_context, "revoked@example.com")
    refresh_token = login_body["refresh_token"]
    logout_response = refresh_context.client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refresh_token},
    )
    second_logout_response = refresh_context.client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refresh_token},
    )
    refresh_response = refresh_context.client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )

    assert logout_response.status_code == 200
    assert second_logout_response.status_code == 200
    assert refresh_response.status_code == 401


def register_and_login(
    refresh_context: RefreshTestContext,
    email: str,
) -> dict[str, str | int]:
    password = "CorrectHorse42"
    register_response = refresh_context.client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    assert register_response.status_code == 201

    login_response = refresh_context.client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_response.status_code == 200
    return login_response.json()


async def fetch_refresh_session(
    refresh_context: RefreshTestContext,
    refresh_token: str,
) -> RefreshSession | None:
    engine = build_async_engine(refresh_context.database_url)
    session_factory = build_session_factory(engine)

    try:
        async with session_factory() as session:
            result = await session.execute(
                select(RefreshSession).where(
                    RefreshSession.token_hash
                    == hash_refresh_token(refresh_token, refresh_context.settings)
                )
            )
            return result.scalar_one_or_none()
    finally:
        await engine.dispose()


async def set_refresh_session_expiry(
    refresh_context: RefreshTestContext,
    refresh_token: str,
    expires_at: datetime,
) -> None:
    engine = build_async_engine(refresh_context.database_url)
    session_factory = build_session_factory(engine)

    try:
        async with session_factory() as session:
            result = await session.execute(
                select(RefreshSession).where(
                    RefreshSession.token_hash
                    == hash_refresh_token(refresh_token, refresh_context.settings)
                )
            )
            refresh_session = result.scalar_one()
            refresh_session.expires_at = expires_at
            await session.commit()
    finally:
        await engine.dispose()
