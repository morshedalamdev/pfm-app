from __future__ import annotations

import asyncio
from collections.abc import Iterator
from pathlib import Path

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient

from alembic import command
from app.core.config import Settings
from app.core.database import (
    build_async_engine,
    build_session_factory,
    get_session,
    get_session_from_factory,
)
from app.main import create_app


def build_alembic_config(database_url: str) -> Config:
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


@pytest.fixture
def profile_client(disposable_postgres_url: str) -> Iterator[TestClient]:
    command.upgrade(build_alembic_config(disposable_postgres_url), "head")
    engine = build_async_engine(disposable_postgres_url)
    session_factory = build_session_factory(engine)
    app = create_app(
        Settings(
            app_env="test",
            database_url=disposable_postgres_url,
            access_token_secret_key="test-access-token-secret-with-at-least-32-bytes",
            refresh_token_secret_key="test-refresh-token-secret-with-32-bytes",
        )
    )

    async def test_session() -> object:
        async for session in get_session_from_factory(session_factory):
            yield session

    app.dependency_overrides[get_session] = test_session

    try:
        with TestClient(app) as client:
            yield client
    finally:
        asyncio.run(engine.dispose())


def test_current_user_profile_can_be_updated(profile_client: TestClient) -> None:
    tokens = register_and_login(profile_client, "profile-owner@example.com")

    response = profile_client.patch(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
        json={
            "email": "  Profile.Owner+Updated@Example.COM ",
            "full_name": "  Profile Owner  ",
            "phone_number": "  +15551234567 ",
            "occupation": "  business ",
            "about": "  Building a calmer money cockpit. ",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "profile.owner+updated@example.com"
    assert body["full_name"] == "Profile Owner"
    assert body["phone_number"] == "+15551234567"
    assert body["occupation"] == "business"
    assert body["about"] == "Building a calmer money cockpit."
    assert "password" not in body
    assert "password_hash" not in body

    me_response = profile_client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert me_response.status_code == 200
    assert me_response.json()["full_name"] == "Profile Owner"


def test_current_user_profile_rejects_duplicate_email(
    profile_client: TestClient,
) -> None:
    register_and_login(profile_client, "taken-profile@example.com")
    tokens = register_and_login(profile_client, "profile-conflict@example.com")

    response = profile_client.patch(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
        json={"email": "TAKEN-PROFILE@example.com"},
    )

    assert response.status_code == 409
    assert response.json()["error"]["message"] == "Profile could not be updated"


def test_current_user_profile_patch_requires_auth(profile_client: TestClient) -> None:
    response = profile_client.patch(
        "/api/v1/users/me",
        json={"full_name": "No Token"},
    )

    assert response.status_code == 401


def register_and_login(client: TestClient, email: str) -> dict[str, object]:
    password = "CorrectHorse42"
    register_response = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )
    assert register_response.status_code == 201

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_response.status_code == 200
    return dict(login_response.json())
