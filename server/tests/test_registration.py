from __future__ import annotations

import asyncio
from collections.abc import Iterator
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
from app.core.security import verify_password
from app.main import create_app
from app.modules.users.models import User


def build_alembic_config(database_url: str) -> Config:
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


@pytest.fixture
def registration_client(disposable_postgres_url: str) -> Iterator[TestClient]:
    command.upgrade(build_alembic_config(disposable_postgres_url), "head")
    engine = build_async_engine(disposable_postgres_url)
    session_factory = build_session_factory(engine)
    app = create_registration_test_app(disposable_postgres_url)

    async def test_session() -> object:
        async for session in get_session_from_factory(session_factory):
            yield session

    app.dependency_overrides[get_session] = test_session

    try:
        with TestClient(app) as client:
            yield client
    finally:
        asyncio.run(engine.dispose())


def create_registration_test_app(database_url: str) -> FastAPI:
    return create_app(
        Settings(
            app_name="PFM Test API",
            app_env="test",
            debug=False,
            cors_origins=["http://testserver"],
            database_url=database_url,
        ),
    )


def test_register_user_success_stores_normalized_email_and_argon2_hash(
    registration_client: TestClient,
    disposable_postgres_url: str,
) -> None:
    response = registration_client.post(
        "/api/v1/auth/register",
        json={
            "email": "  New.User+Signup@Example.COM ",
            "password": "CorrectHorse42",
            "full_name": "  New User ",
            "phone_number": "  +15550001111 ",
            "occupation": " student ",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "new.user+signup@example.com"
    assert body["full_name"] == "New User"
    assert body["phone_number"] == "+15550001111"
    assert body["occupation"] == "student"
    assert body["is_active"] is True
    assert body["id"]
    assert body["created_at"]
    assert "password" not in body
    assert "password_hash" not in body

    user = asyncio.run(
        fetch_user_by_email(disposable_postgres_url, "new.user+signup@example.com")
    )
    assert user is not None
    assert user.password_hash != "CorrectHorse42"
    assert user.password_hash.startswith("$argon2")
    assert verify_password("CorrectHorse42", user.password_hash) is True
    assert user.full_name == "New User"
    assert user.phone_number == "+15550001111"
    assert user.occupation == "student"


def test_register_user_duplicate_email_returns_deterministic_error(
    registration_client: TestClient,
) -> None:
    payload = {"email": "dupe@example.com", "password": "CorrectHorse42"}

    first_response = registration_client.post("/api/v1/auth/register", json=payload)
    second_response = registration_client.post(
        "/api/v1/auth/register",
        json={"email": " DUPE@EXAMPLE.COM ", "password": "CorrectHorse42"},
    )

    assert first_response.status_code == 201
    assert second_response.status_code == 409
    assert second_response.json() == {
        "error": {
            "code": "http_error",
            "message": "Registration could not be completed",
        },
    }


def test_register_user_rejects_invalid_email(
    registration_client: TestClient,
) -> None:
    response = registration_client.post(
        "/api/v1/auth/register",
        json={"email": "not-an-email", "password": "CorrectHorse42"},
    )

    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "validation_error"
    assert body["error"]["message"] == "Request validation failed"


def test_register_user_rejects_weak_password_without_echoing_password(
    registration_client: TestClient,
) -> None:
    response = registration_client.post(
        "/api/v1/auth/register",
        json={"email": "weak@example.com", "password": "short"},
    )

    assert response.status_code == 422
    body_text = response.text
    assert "validation_error" in body_text
    assert "short" not in body_text
    assert "[redacted]" in body_text


def test_register_user_response_never_serializes_sensitive_values(
    registration_client: TestClient,
) -> None:
    plaintext_password = "CorrectHorse42"

    response = registration_client.post(
        "/api/v1/auth/register",
        json={"email": "safe-response@example.com", "password": plaintext_password},
    )

    body_text = response.text
    assert response.status_code == 201
    assert plaintext_password not in body_text
    assert "password" not in body_text
    assert "argon2" not in body_text


async def fetch_user_by_email(database_url: str, email: str) -> User | None:
    engine = build_async_engine(database_url)
    session_factory = build_session_factory(engine)

    try:
        async with session_factory() as session:
            result = await session.execute(select(User).where(User.email == email))
            return result.scalar_one_or_none()
    finally:
        await engine.dispose()
