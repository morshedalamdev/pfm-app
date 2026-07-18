from __future__ import annotations

import asyncio
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

import pytest
from alembic.config import Config
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from starlette.responses import RedirectResponse, Response

from alembic import command
from app.core.config import Settings
from app.core.database import (
    build_async_engine,
    build_session_factory,
    get_session,
    get_session_from_factory,
)
from app.main import create_app
from app.modules.auth.models import OAuthIdentity, OAuthLoginExchange
from app.modules.auth.oauth import (
    InvalidOAuthRegistrationTicketError,
    OAuthCallbackError,
    OAuthGateway,
    OAuthProfile,
    OAuthProfileError,
    create_oauth_registration_ticket,
    decode_oauth_registration_ticket,
    get_oauth_gateway,
    normalize_github_profile,
    normalize_google_profile,
)
from app.modules.auth.schemas import OAuthProvider
from app.modules.users.models import User


@dataclass
class FakeOAuthGateway:
    profile: OAuthProfile | None = None
    callback_error: bool = False
    started_provider: OAuthProvider | None = None
    redirect_uri: str | None = None

    async def begin(
        self,
        request: Request,
        provider: OAuthProvider,
        redirect_uri: str,
    ) -> Response:
        self.started_provider = provider
        self.redirect_uri = redirect_uri
        request.session["test_oauth_state"] = "state-value"
        return RedirectResponse("https://identity.example/authorize")

    async def complete(
        self,
        _request: Request,
        _provider: OAuthProvider,
    ) -> OAuthProfile:
        if self.callback_error:
            raise OAuthCallbackError
        assert self.profile is not None
        return self.profile


@dataclass(frozen=True)
class OAuthTestContext:
    app: FastAPI
    client: TestClient
    settings: Settings


def build_alembic_config(database_url: str) -> Config:
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def build_oauth_settings(database_url: str | None = None) -> Settings:
    values: dict[str, object] = {
        "_env_file": None,
        "app_env": "test",
        "cors_origins": ["https://frontend.example"],
        "frontend_base_url": "https://frontend.example",
        "oauth_public_api_url": "https://api.example",
        "google_oauth_client_id": "google-client-id",
        "google_oauth_client_secret": "google-client-secret",
        "github_oauth_client_id": "github-client-id",
        "github_oauth_client_secret": "github-client-secret",
        "oauth_state_secret_key": "state-secret-with-at-least-32-characters",
        "oauth_registration_ticket_secret_key": (
            "ticket-secret-with-at-least-32-characters"
        ),
    }
    if database_url is not None:
        values["database_url"] = database_url
    return Settings(**values)


@pytest.fixture
def oauth_context(
    disposable_postgres_url: str,
) -> Iterator[OAuthTestContext]:
    command.upgrade(build_alembic_config(disposable_postgres_url), "head")
    settings = build_oauth_settings(disposable_postgres_url)
    engine = build_async_engine(disposable_postgres_url)
    session_factory = build_session_factory(engine)
    app = create_app(settings)

    async def test_session() -> object:
        async for session in get_session_from_factory(session_factory):
            yield session

    app.dependency_overrides[get_session] = test_session
    try:
        with TestClient(app) as client:
            yield OAuthTestContext(app=app, client=client, settings=settings)
    finally:
        asyncio.run(engine.dispose())


def test_oauth_gateway_registers_only_configured_provider_scopes() -> None:
    settings = build_oauth_settings()
    gateway = OAuthGateway(settings)

    assert gateway.configured_providers == frozenset({"google", "github"})
    google = gateway.oauth.create_client("google")
    github = gateway.oauth.create_client("github")
    assert google is not None
    assert github is not None
    assert google.client_kwargs["scope"] == "openid email profile"
    assert github.client_kwargs["scope"] == "read:user user:email"
    assert google.client_kwargs["code_challenge_method"] == "S256"
    assert github.client_kwargs["code_challenge_method"] == "S256"


@pytest.mark.parametrize(
    ("provider", "expected_host", "expected_scope"),
    [
        ("google", "accounts.google.com", {"openid", "email", "profile"}),
        ("github", "github.com", {"read:user", "user:email"}),
    ],
)
def test_authlib_oauth_start_generates_provider_redirect_and_signed_state(
    oauth_context: OAuthTestContext,
    provider: OAuthProvider,
    expected_host: str,
    expected_scope: set[str],
) -> None:
    response = oauth_context.client.get(
        f"/api/v1/auth/oauth/{provider}/start",
        follow_redirects=False,
    )

    assert response.status_code == 302
    location = urlsplit(response.headers["location"])
    query = parse_qs(location.query)
    assert location.netloc == expected_host
    assert query["redirect_uri"] == [
        f"https://api.example/api/v1/auth/oauth/{provider}/callback"
    ]
    assert query["client_id"] == [f"{provider}-client-id"]
    assert set(query["scope"][0].split()) == expected_scope
    assert len(query["state"][0]) >= 20
    assert query["code_challenge_method"] == ["S256"]
    assert len(query["code_challenge"][0]) >= 40
    assert "pfm_oauth_state=" in response.headers["set-cookie"]
    if provider == "google":
        assert len(query["nonce"][0]) >= 20
    else:
        assert "nonce" not in query


def test_authlib_callback_rejects_tampered_state_before_token_exchange(
    oauth_context: OAuthTestContext,
) -> None:
    start = oauth_context.client.get(
        "/api/v1/auth/oauth/github/start",
        follow_redirects=False,
    )
    assert start.status_code == 302

    callback = oauth_context.client.get(
        "/api/v1/auth/oauth/github/callback?code=fake&state=tampered",
        follow_redirects=False,
    )

    assert callback.status_code == 303
    location = urlsplit(callback.headers["location"])
    assert parse_qs(location.query) == {
        "provider": ["github"],
        "error": ["callback_failed"],
    }


def test_oauth_start_uses_exact_backend_callback_and_state_cookie(
    oauth_context: OAuthTestContext,
) -> None:
    gateway = FakeOAuthGateway()
    oauth_context.app.dependency_overrides[get_oauth_gateway] = lambda: gateway

    response = oauth_context.client.get(
        "/api/v1/auth/oauth/google/start",
        follow_redirects=False,
    )

    assert response.status_code == 307
    assert response.headers["location"] == "https://identity.example/authorize"
    assert gateway.started_provider == "google"
    assert gateway.redirect_uri == (
        "https://api.example/api/v1/auth/oauth/google/callback"
    )
    cookie = response.headers["set-cookie"]
    assert "pfm_oauth_state=" in cookie
    assert "httponly" in cookie.lower()
    assert "samesite=lax" in cookie.lower()
    assert "path=/api/v1/auth/oauth" in cookie.lower()


def test_unconfigured_provider_start_returns_service_unavailable() -> None:
    settings = Settings(
        _env_file=None,
        app_env="test",
        cors_origins=["https://frontend.example"],
        frontend_base_url="https://frontend.example",
        oauth_public_api_url="https://api.example",
    )
    app = create_app(settings)

    with TestClient(app) as client:
        response = client.get(
            "/api/v1/auth/oauth/google/start",
            follow_redirects=False,
        )

    assert response.status_code == 503
    assert response.json()["error"]["message"] == "OAuth provider is not configured"


@pytest.mark.parametrize(
    ("profile", "expected_provider"),
    [
        (
            OAuthProfile(
                provider="google",
                subject="google-subject",
                email="google.user@example.com",
                full_name="Google User",
            ),
            "google",
        ),
        (
            OAuthProfile(
                provider="github",
                subject="123456",
                email="github.user@example.com",
                full_name="GitHub User",
            ),
            "github",
        ),
    ],
)
def test_oauth_callback_returns_encrypted_registration_ticket_preview(
    oauth_context: OAuthTestContext,
    profile: OAuthProfile,
    expected_provider: OAuthProvider,
) -> None:
    gateway = FakeOAuthGateway(profile=profile)
    oauth_context.app.dependency_overrides[get_oauth_gateway] = lambda: gateway

    response = oauth_context.client.get(
        f"/api/v1/auth/oauth/{expected_provider}/callback",
        follow_redirects=False,
    )

    assert response.status_code == 303
    location = urlsplit(response.headers["location"])
    assert location.scheme == "https"
    assert location.netloc == "frontend.example"
    assert location.path == "/auth/oauth/callback"
    assert location.query == ""
    assert profile.subject not in response.headers["location"]
    registration_ticket = parse_qs(location.fragment)["registration_ticket"][0]

    preview = oauth_context.client.post(
        "/api/v1/auth/oauth/registration-preview",
        json={"registration_ticket": registration_ticket},
    )

    assert preview.status_code == 200
    assert preview.json() == {
        "provider": expected_provider,
        "email": profile.email,
        "full_name": profile.full_name,
    }
    assert "subject" not in preview.text


def test_unknown_oauth_callback_does_not_write_user_information(
    disposable_postgres_url: str,
) -> None:
    command.upgrade(build_alembic_config(disposable_postgres_url), "head")
    settings = build_oauth_settings(disposable_postgres_url)
    gateway = FakeOAuthGateway(
        profile=OAuthProfile(
            provider="google",
            subject="new-google-subject",
            email="not-saved@example.com",
            full_name="Not Saved",
        )
    )
    app = create_app(settings)
    app.dependency_overrides[get_oauth_gateway] = lambda: gateway
    engine = build_async_engine(disposable_postgres_url)
    session_factory = build_session_factory(engine)

    async def test_session() -> object:
        async for session in get_session_from_factory(session_factory):
            yield session

    app.dependency_overrides[get_session] = test_session
    before = asyncio.run(auth_row_counts(disposable_postgres_url))

    try:
        with TestClient(app) as client:
            response = client.get(
                "/api/v1/auth/oauth/google/callback",
                follow_redirects=False,
            )
    finally:
        asyncio.run(engine.dispose())

    after = asyncio.run(auth_row_counts(disposable_postgres_url))
    assert response.status_code == 303
    assert after == before


def test_oauth_callback_failure_redirects_with_generic_error(
    oauth_context: OAuthTestContext,
) -> None:
    gateway = FakeOAuthGateway(callback_error=True)
    oauth_context.app.dependency_overrides[get_oauth_gateway] = lambda: gateway

    response = oauth_context.client.get(
        "/api/v1/auth/oauth/github/callback",
        follow_redirects=False,
    )

    assert response.status_code == 303
    location = urlsplit(response.headers["location"])
    assert location.path == "/auth/oauth/callback"
    assert parse_qs(location.query) == {
        "provider": ["github"],
        "error": ["callback_failed"],
    }


def test_google_profile_requires_verified_email() -> None:
    profile = normalize_google_profile(
        {
            "sub": "google-subject",
            "email": " USER@Example.COM ",
            "email_verified": True,
            "name": "  Google User  ",
        }
    )
    assert profile == OAuthProfile(
        provider="google",
        subject="google-subject",
        email="user@example.com",
        full_name="Google User",
    )

    with pytest.raises(OAuthProfileError):
        normalize_google_profile(
            {
                "sub": "google-subject",
                "email": "user@example.com",
                "email_verified": False,
            }
        )


def test_github_profile_requires_verified_email_and_uses_login_name() -> None:
    profile = normalize_github_profile(
        {"id": 123456, "name": None, "login": "octocat"},
        [
            {
                "email": "unverified@example.com",
                "primary": False,
                "verified": False,
            },
            {
                "email": "OCTOCAT@Example.COM",
                "primary": True,
                "verified": True,
            },
        ],
    )
    assert profile == OAuthProfile(
        provider="github",
        subject="123456",
        email="octocat@example.com",
        full_name="octocat",
    )

    with pytest.raises(OAuthProfileError):
        normalize_github_profile(
            {"id": 123456, "login": "octocat"},
            [
                {
                    "email": "unverified@example.com",
                    "primary": True,
                    "verified": False,
                }
            ],
        )


def test_registration_ticket_rejects_tampering_expiry_and_wrong_audience() -> None:
    settings = build_oauth_settings()
    issued_at = datetime(2026, 7, 18, 8, 0, tzinfo=UTC)
    ticket = create_oauth_registration_ticket(
        OAuthProfile(
            provider="google",
            subject="google-subject",
            email="user@example.com",
            full_name="Example User",
        ),
        settings,
        now=issued_at,
    )

    claims = decode_oauth_registration_ticket(
        ticket,
        settings,
        now=issued_at + timedelta(minutes=5),
    )
    assert claims.email == "user@example.com"

    tamper_index = len(ticket) // 2
    replacement = "A" if ticket[tamper_index] != "A" else "B"
    tampered_ticket = (
        f"{ticket[:tamper_index]}{replacement}{ticket[tamper_index + 1 :]}"
    )
    with pytest.raises(InvalidOAuthRegistrationTicketError):
        decode_oauth_registration_ticket(
            tampered_ticket,
            settings,
            now=issued_at + timedelta(minutes=5),
        )
    with pytest.raises(InvalidOAuthRegistrationTicketError):
        decode_oauth_registration_ticket(
            ticket,
            settings,
            now=issued_at + timedelta(minutes=11),
        )

    wrong_audience_settings = build_oauth_settings()
    wrong_audience_settings.frontend_base_url = "https://other.example"
    with pytest.raises(InvalidOAuthRegistrationTicketError):
        decode_oauth_registration_ticket(
            ticket,
            wrong_audience_settings,
            now=issued_at + timedelta(minutes=5),
        )


def test_registration_ticket_validation_error_is_redacted(
    oauth_context: OAuthTestContext,
) -> None:
    response = oauth_context.client.post(
        "/api/v1/auth/oauth/registration-preview",
        json={"registration_ticket": "secret-ticket"},
    )

    assert response.status_code == 422
    assert "secret-ticket" not in response.text
    assert "[redacted]" in response.text


async def auth_row_counts(database_url: str) -> tuple[int, int, int]:
    engine = build_async_engine(database_url)
    session_factory = build_session_factory(engine)

    try:
        async with session_factory() as session:
            users = await session.scalar(select(func.count()).select_from(User))
            identities = await session.scalar(
                select(func.count()).select_from(OAuthIdentity)
            )
            exchanges = await session.scalar(
                select(func.count()).select_from(OAuthLoginExchange)
            )
            return int(users or 0), int(identities or 0), int(exchanges or 0)
    finally:
        await engine.dispose()
