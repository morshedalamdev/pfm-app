from __future__ import annotations

import asyncio
from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
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


def test_refresh_validation_error_redacts_refresh_token_input(
    refresh_context: RefreshTestContext,
) -> None:
    raw_token = "short-sensitive-refresh-token"
    response = refresh_context.client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": raw_token},
    )

    assert response.status_code == 422
    assert response.json()["error"]["details"][0]["input"] == "[redacted]"


def test_parallel_refresh_attempts_do_not_both_succeed(
    refresh_context: RefreshTestContext,
) -> None:
    login_body = register_and_login(refresh_context, "parallel-refresh@example.com")
    refresh_token = login_body["refresh_token"]

    def refresh_once() -> int:
        response = refresh_context.client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        return response.status_code

    with ThreadPoolExecutor(max_workers=2) as executor:
        statuses = sorted(executor.map(lambda _index: refresh_once(), range(2)))

    assert statuses == [200, 401]
    old_session = asyncio.run(fetch_refresh_session(refresh_context, refresh_token))
    assert old_session is not None
    assert old_session.revoked_reason in {"rotated", "reuse_detected"}


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


def test_password_change_requires_current_password_and_revokes_all_sessions(
    refresh_context: RefreshTestContext,
) -> None:
    email = "change-password@example.com"
    first_login = register_and_login(refresh_context, email)
    second_login_response = refresh_context.client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "CorrectHorse42"},
    )
    assert second_login_response.status_code == 200
    second_login = second_login_response.json()
    headers = {"authorization": f"Bearer {second_login['access_token']}"}

    unauthenticated = refresh_context.client.put(
        "/api/v1/auth/password",
        json={"new_password": "BetterHorse43"},
    )
    wrong_current = refresh_context.client.put(
        "/api/v1/auth/password",
        headers=headers,
        json={
            "current_password": "WrongHorse42",
            "new_password": "BetterHorse43",
        },
    )
    reused = refresh_context.client.put(
        "/api/v1/auth/password",
        headers=headers,
        json={
            "current_password": "CorrectHorse42",
            "new_password": "CorrectHorse42",
        },
    )
    first_session_before = asyncio.run(
        fetch_refresh_session(refresh_context, str(first_login["refresh_token"]))
    )
    second_session_before = asyncio.run(
        fetch_refresh_session(refresh_context, str(second_login["refresh_token"]))
    )
    changed = refresh_context.client.put(
        "/api/v1/auth/password",
        headers=headers,
        json={
            "current_password": "CorrectHorse42",
            "new_password": "BetterHorse43",
        },
    )

    assert unauthenticated.status_code == 401
    assert wrong_current.status_code == 400
    assert wrong_current.json()["error"]["message"] == "Current password is incorrect"
    assert reused.status_code == 400
    assert reused.json()["error"]["message"] == (
        "New password must be different from the current password"
    )
    assert first_session_before is not None
    assert second_session_before is not None
    assert first_session_before.revoked_at is None
    assert second_session_before.revoked_at is None
    assert changed.status_code == 200
    assert changed.json() == {
        "status": "updated",
        "reauthentication_required": True,
    }

    for login in (first_login, second_login):
        refresh_token = str(login["refresh_token"])
        refresh = refresh_context.client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        stored = asyncio.run(fetch_refresh_session(refresh_context, refresh_token))
        assert refresh.status_code == 401
        assert stored is not None
        assert stored.revoked_at is not None
        assert stored.revoked_reason == "password_changed"

    old_login = refresh_context.client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "CorrectHorse42"},
    )
    new_login = refresh_context.client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "BetterHorse43"},
    )
    assert old_login.status_code == 401
    assert new_login.status_code == 200


def test_password_update_validation_redacts_both_password_fields(
    refresh_context: RefreshTestContext,
) -> None:
    email = "password-redaction@example.com"
    login = register_and_login(refresh_context, email)
    headers = {"authorization": f"Bearer {login['access_token']}"}

    weak_new = refresh_context.client.put(
        "/api/v1/auth/password",
        headers=headers,
        json={
            "current_password": "CorrectHorse42",
            "new_password": "revealed-weak-value",
        },
    )
    empty_current = refresh_context.client.put(
        "/api/v1/auth/password",
        headers=headers,
        json={"current_password": "", "new_password": "BetterHorse43"},
    )

    assert weak_new.status_code == 422
    assert weak_new.json()["error"]["details"][0]["input"] == "[redacted]"
    assert "revealed-weak-value" not in weak_new.text
    assert empty_current.status_code == 422
    assert empty_current.json()["error"]["details"][0]["input"] == "[redacted]"


def test_parallel_password_changes_only_accept_current_password_once(
    refresh_context: RefreshTestContext,
) -> None:
    email = "parallel-password-change@example.com"
    login = register_and_login(refresh_context, email)
    headers = {"authorization": f"Bearer {login['access_token']}"}
    new_passwords = ["ParallelHorse43", "ParallelHorse44"]

    def change_password(new_password: str) -> int:
        return refresh_context.client.put(
            "/api/v1/auth/password",
            headers=headers,
            json={
                "current_password": "CorrectHorse42",
                "new_password": new_password,
            },
        ).status_code

    with ThreadPoolExecutor(max_workers=2) as executor:
        statuses = sorted(executor.map(change_password, new_passwords))

    successful_logins = [
        refresh_context.client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
        ).status_code
        for password in new_passwords
    ]
    old_login = refresh_context.client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "CorrectHorse42"},
    )

    assert statuses == [200, 400]
    assert sorted(successful_logins) == [200, 401]
    assert old_login.status_code == 401


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
