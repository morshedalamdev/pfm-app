from __future__ import annotations

import asyncio
import uuid
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import timedelta
from pathlib import Path
from unittest.mock import patch

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
from app.core.security import create_access_token, decode_access_token
from app.main import create_app
from app.modules.users.models import User


@dataclass(frozen=True)
class AuthTestContext:
    client: TestClient
    database_url: str
    settings: Settings


def build_alembic_config(database_url: str) -> Config:
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


@pytest.fixture
def auth_context(disposable_postgres_url: str) -> Iterator[AuthTestContext]:
    command.upgrade(build_alembic_config(disposable_postgres_url), "head")
    engine = build_async_engine(disposable_postgres_url)
    session_factory = build_session_factory(engine)
    settings = build_auth_test_settings(disposable_postgres_url)
    app = create_auth_test_app(settings)

    async def test_session() -> object:
        async for session in get_session_from_factory(session_factory):
            yield session

    app.dependency_overrides[get_session] = test_session

    try:
        with TestClient(app) as client:
            yield AuthTestContext(
                client=client,
                database_url=disposable_postgres_url,
                settings=settings,
            )
    finally:
        asyncio.run(engine.dispose())


def build_auth_test_settings(database_url: str) -> Settings:
    return Settings(
        app_name="PFM Test API",
        app_env="test",
        debug=False,
        cors_origins=["http://testserver"],
        database_url=database_url,
        access_token_secret_key="test-access-token-secret-with-at-least-32-bytes",
        access_token_expire_minutes=15,
    )


def create_auth_test_app(settings: Settings) -> FastAPI:
    return create_app(settings)


def test_login_returns_access_token_and_protected_user(
    auth_context: AuthTestContext,
) -> None:
    register_user(auth_context, "login-success@example.com", "CorrectHorse42")

    response = auth_context.client.post(
        "/api/v1/auth/login",
        json={"email": " LOGIN-SUCCESS@EXAMPLE.COM ", "password": "CorrectHorse42"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["expires_in"] == 900
    assert body["access_token"]

    claims = decode_access_token(body["access_token"], auth_context.settings)
    assert claims.email == "login-success@example.com"

    me_response = auth_context.client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {body['access_token']}"},
    )
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "login-success@example.com"


def test_login_invalid_credentials_are_generic(
    auth_context: AuthTestContext,
) -> None:
    register_user(auth_context, "invalid-login@example.com", "CorrectHorse42")

    response = auth_context.client.post(
        "/api/v1/auth/login",
        json={"email": "invalid-login@example.com", "password": "WrongHorse42"},
    )

    assert response.status_code == 401
    assert response.json() == {
        "error": {
            "code": "http_error",
            "message": "Invalid email or password",
        },
    }


def test_login_validation_error_redacts_password_input(
    auth_context: AuthTestContext,
) -> None:
    response = auth_context.client.post(
        "/api/v1/auth/login",
        json={"email": "valid@example.com", "password": ""},
    )

    assert response.status_code == 422
    assert response.json()["error"]["details"][0]["input"] == "[redacted]"


def test_login_inactive_user_is_rejected_generically(
    auth_context: AuthTestContext,
) -> None:
    register_user(auth_context, "inactive@example.com", "CorrectHorse42")
    asyncio.run(
        set_user_active(auth_context.database_url, "inactive@example.com", False)
    )

    response = auth_context.client.post(
        "/api/v1/auth/login",
        json={"email": "inactive@example.com", "password": "CorrectHorse42"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Invalid email or password"


def test_protected_user_rejects_malformed_token(
    auth_context: AuthTestContext,
) -> None:
    response = auth_context.client.get(
        "/api/v1/users/me",
        headers={"Authorization": "Bearer not-a-jwt"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Invalid authentication credentials"


def test_protected_user_requires_bearer_credentials(
    auth_context: AuthTestContext,
) -> None:
    response = auth_context.client.get("/api/v1/users/me")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert response.json()["error"]["message"] == "Invalid authentication credentials"


def test_protected_user_rejects_token_for_missing_user(
    auth_context: AuthTestContext,
) -> None:
    token = create_access_token(
        User(
            id=uuid.uuid4(),
            email="missing-token-user@example.com",
            password_hash="unused",
        ),
        auth_context.settings,
    )

    response = auth_context.client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Invalid authentication credentials"


def test_protected_user_does_not_mask_unexpected_decode_failures(
    auth_context: AuthTestContext,
) -> None:
    with (
        patch(
            "app.modules.auth.dependencies.decode_access_token",
            side_effect=RuntimeError("unexpected decode failure"),
        ),
        TestClient(
            auth_context.client.app,
            raise_server_exceptions=False,
        ) as client,
    ):
        response = client.get(
            "/api/v1/users/me",
            headers={"Authorization": "Bearer syntactically-unimportant"},
        )

    assert response.status_code == 500
    assert response.json()["error"]["message"] == "Internal server error"


def test_protected_user_rejects_expired_token(
    auth_context: AuthTestContext,
) -> None:
    register_user(auth_context, "expired@example.com", "CorrectHorse42")
    user = asyncio.run(
        fetch_user_by_email(auth_context.database_url, "expired@example.com")
    )
    assert user is not None
    expired_token = create_access_token(
        user,
        auth_context.settings,
        expires_delta=timedelta(seconds=-1),
    )

    response = auth_context.client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Invalid authentication credentials"


def test_protected_user_rejects_invalid_signature(
    auth_context: AuthTestContext,
) -> None:
    register_user(auth_context, "bad-signature@example.com", "CorrectHorse42")
    user = asyncio.run(
        fetch_user_by_email(auth_context.database_url, "bad-signature@example.com")
    )
    assert user is not None
    wrong_settings = Settings(
        app_env="test",
        database_url=auth_context.database_url,
        access_token_secret_key="different-test-secret-with-at-least-32-bytes",
    )
    token = create_access_token(user, wrong_settings)

    response = auth_context.client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Invalid authentication credentials"


def register_user(
    auth_context: AuthTestContext,
    email: str,
    password: str,
) -> None:
    response = auth_context.client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    assert response.status_code == 201


async def fetch_user_by_email(database_url: str, email: str) -> User | None:
    engine = build_async_engine(database_url)
    session_factory = build_session_factory(engine)

    try:
        async with session_factory() as session:
            result = await session.execute(select(User).where(User.email == email))
            return result.scalar_one_or_none()
    finally:
        await engine.dispose()


async def set_user_active(database_url: str, email: str, is_active: bool) -> None:
    engine = build_async_engine(database_url)
    session_factory = build_session_factory(engine)

    try:
        async with session_factory() as session:
            result = await session.execute(select(User).where(User.email == email))
            user = result.scalar_one()
            user.is_active = is_active
            await session.commit()
    finally:
        await engine.dispose()
