from __future__ import annotations

import asyncio
import uuid
from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

import pytest
from alembic.config import Config
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from sqlalchemy import func, select, update
from starlette.responses import RedirectResponse, Response

from alembic import command
from app.core.config import Settings
from app.core.database import (
    build_async_engine,
    build_session_factory,
    get_session,
    get_session_from_factory,
)
from app.core.security import (
    decode_access_token,
    hash_oauth_link_intent_code,
    hash_oauth_login_exchange_code,
    hash_refresh_token,
)
from app.main import create_app
from app.modules.auth.models import (
    OAuthIdentity,
    OAuthLinkIntent,
    OAuthLoginExchange,
    RefreshSession,
)
from app.modules.auth.oauth import (
    OAuthProfile,
    create_oauth_registration_ticket,
    get_oauth_gateway,
)
from app.modules.auth.repositories import (
    OAuthIdentityRepository,
    OAuthLinkIntentRepository,
)
from app.modules.auth.schemas import OAuthProvider
from app.modules.auth.services import InvalidOAuthLinkIntentError, OAuthLinkService
from app.modules.users.models import User
from app.modules.users.repositories import UserRepository


@dataclass
class FakeOAuthGateway:
    profile: OAuthProfile
    started_provider: OAuthProvider | None = None
    started_state: str | None = None

    async def begin(
        self,
        _request: Request,
        provider: OAuthProvider,
        _redirect_uri: str,
        *,
        state: str | None = None,
    ) -> Response:
        self.started_provider = provider
        self.started_state = state
        return RedirectResponse("https://identity.example/authorize")

    async def complete(
        self,
        _request: Request,
        _provider: OAuthProvider,
    ) -> OAuthProfile:
        return self.profile


@dataclass(frozen=True)
class OAuthAccountTestContext:
    app: FastAPI
    client: TestClient
    database_url: str
    settings: Settings
    gateway: FakeOAuthGateway


def build_alembic_config(database_url: str) -> Config:
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def build_oauth_account_settings(database_url: str) -> Settings:
    return Settings(
        _env_file=None,
        app_env="test",
        cors_origins=["https://frontend.example"],
        database_url=database_url,
        frontend_base_url="https://frontend.example",
        oauth_public_api_url="https://api.example",
        google_oauth_client_id="google-client-id",
        google_oauth_client_secret="google-client-secret",
        github_oauth_client_id="github-client-id",
        github_oauth_client_secret="github-client-secret",
        oauth_state_secret_key="state-secret-with-at-least-32-characters",
        oauth_registration_ticket_secret_key=(
            "ticket-secret-with-at-least-32-characters"
        ),
        access_token_secret_key="access-secret-with-at-least-32-characters",
        refresh_token_secret_key="refresh-secret-with-at-least-32-characters",
    )


@pytest.fixture
def oauth_account_context(
    disposable_postgres_url: str,
) -> Iterator[OAuthAccountTestContext]:
    command.upgrade(build_alembic_config(disposable_postgres_url), "head")
    engine = build_async_engine(disposable_postgres_url)
    session_factory = build_session_factory(engine)
    settings = build_oauth_account_settings(disposable_postgres_url)
    gateway = FakeOAuthGateway(
        OAuthProfile(
            provider="google",
            subject="default-subject",
            email="default@example.com",
            full_name="Default User",
        )
    )
    app = create_app(settings)

    async def test_session() -> object:
        async for session in get_session_from_factory(session_factory):
            yield session

    app.dependency_overrides[get_session] = test_session
    app.dependency_overrides[get_oauth_gateway] = lambda: gateway

    try:
        with TestClient(app) as client:
            yield OAuthAccountTestContext(
                app=app,
                client=client,
                database_url=disposable_postgres_url,
                settings=settings,
                gateway=gateway,
            )
    finally:
        asyncio.run(engine.dispose())


def test_sign_in_methods_require_auth_and_report_all_connected_methods(
    oauth_account_context: OAuthAccountTestContext,
) -> None:
    email = "sign-in-methods@example.com"
    register_password_user(oauth_account_context.client, email)
    access_token = login_access_token(oauth_account_context.client, email)
    user = asyncio.run(fetch_user_by_email(oauth_account_context.database_url, email))
    assert user is not None

    unauthenticated = oauth_account_context.client.get("/api/v1/auth/methods")
    password_only = oauth_account_context.client.get(
        "/api/v1/auth/methods",
        headers={"authorization": f"Bearer {access_token}"},
    )
    asyncio.run(
        attach_identity(
            oauth_account_context.database_url,
            user.id,
            "github",
            "methods-github-subject",
        )
    )
    asyncio.run(
        attach_identity(
            oauth_account_context.database_url,
            user.id,
            "google",
            "methods-google-subject",
        )
    )
    all_methods = oauth_account_context.client.get(
        "/api/v1/auth/methods",
        headers={"authorization": f"Bearer {access_token}"},
    )

    assert unauthenticated.status_code == 401
    assert password_only.status_code == 200
    assert password_only.json() == {
        "password_enabled": True,
        "connected_providers": [],
    }
    assert all_methods.status_code == 200
    assert all_methods.json() == {
        "password_enabled": True,
        "connected_providers": ["github", "google"],
    }


def test_oauth_only_account_reports_password_disabled(
    oauth_account_context: OAuthAccountTestContext,
) -> None:
    profile = OAuthProfile(
        provider="google",
        subject="methods-oauth-only-subject",
        email="methods-oauth-only@example.com",
        full_name="OAuth Only",
    )
    ticket = create_oauth_registration_ticket(
        profile,
        oauth_account_context.settings,
    )
    registration = oauth_account_context.client.post(
        "/api/v1/auth/oauth/register",
        json={"registration_ticket": ticket},
    )
    response = oauth_account_context.client.get(
        "/api/v1/auth/methods",
        headers={
            "authorization": f"Bearer {registration.json()['access_token']}",
        },
    )

    assert registration.status_code == 201
    assert response.status_code == 200
    assert response.json() == {
        "password_enabled": False,
        "connected_providers": ["google"],
    }


def test_oauth_only_user_sets_password_and_keeps_same_account_for_both_logins(
    oauth_account_context: OAuthAccountTestContext,
) -> None:
    profile = OAuthProfile(
        provider="google",
        subject="set-password-google-subject",
        email="set-password-oauth@example.com",
        full_name="Set Password OAuth",
    )
    ticket = create_oauth_registration_ticket(
        profile,
        oauth_account_context.settings,
    )
    registration = oauth_account_context.client.post(
        "/api/v1/auth/oauth/register",
        json={"registration_ticket": ticket},
    )
    assert registration.status_code == 201
    original_tokens = registration.json()
    user = asyncio.run(
        fetch_user_by_email(oauth_account_context.database_url, profile.email)
    )
    assert user is not None

    password_update = oauth_account_context.client.put(
        "/api/v1/auth/password",
        headers={
            "authorization": f"Bearer {original_tokens['access_token']}",
        },
        json={"new_password": "NewOAuthHorse42"},
    )
    old_refresh = oauth_account_context.client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": original_tokens["refresh_token"]},
    )
    password_login = oauth_account_context.client.post(
        "/api/v1/auth/login",
        json={"email": profile.email, "password": "NewOAuthHorse42"},
    )

    assert password_update.status_code == 200
    assert password_update.json() == {
        "status": "updated",
        "reauthentication_required": True,
    }
    assert old_refresh.status_code == 401
    original_session = asyncio.run(
        fetch_refresh_session_by_token(
            oauth_account_context.database_url,
            str(original_tokens["refresh_token"]),
            oauth_account_context.settings,
        )
    )
    assert original_session is not None
    assert original_session.revoked_reason == "password_set"
    assert password_login.status_code == 200
    password_claims = decode_access_token(
        password_login.json()["access_token"],
        oauth_account_context.settings,
    )
    assert password_claims.subject == user.id

    methods = oauth_account_context.client.get(
        "/api/v1/auth/methods",
        headers={
            "authorization": f"Bearer {password_login.json()['access_token']}",
        },
    )
    assert methods.json() == {
        "password_enabled": True,
        "connected_providers": ["google"],
    }

    oauth_account_context.gateway.profile = OAuthProfile(
        provider="google",
        subject=profile.subject,
        email="changed-provider-email@example.com",
        full_name="Changed Provider Email",
    )
    oauth_callback = oauth_account_context.client.get(
        "/api/v1/auth/oauth/google/callback",
        follow_redirects=False,
    )
    exchange_code = parse_qs(urlsplit(oauth_callback.headers["location"]).fragment)[
        "exchange_code"
    ][0]
    oauth_login = oauth_account_context.client.post(
        "/api/v1/auth/oauth/exchange",
        json={"exchange_code": exchange_code},
    )
    assert oauth_login.status_code == 200
    oauth_claims = decode_access_token(
        oauth_login.json()["access_token"],
        oauth_account_context.settings,
    )
    assert oauth_claims.subject == user.id
    assert oauth_claims.email == profile.email


def test_link_intent_is_hashed_and_bound_to_authenticated_user_and_provider(
    oauth_account_context: OAuthAccountTestContext,
) -> None:
    email = "link-intent-owner@example.com"
    register_password_user(oauth_account_context.client, email)
    access_token = login_access_token(oauth_account_context.client, email)
    user = asyncio.run(fetch_user_by_email(oauth_account_context.database_url, email))
    assert user is not None
    headers = {"authorization": f"Bearer {access_token}"}

    rejected_override = oauth_account_context.client.post(
        "/api/v1/auth/oauth/link-intents",
        headers=headers,
        json={"provider": "google", "user_id": "00000000-0000-0000-0000-000000000000"},
    )
    response = oauth_account_context.client.post(
        "/api/v1/auth/oauth/link-intents",
        headers=headers,
        json={"provider": "google"},
    )

    assert rejected_override.status_code == 422
    assert response.status_code == 201
    body = response.json()
    assert body["provider"] == "google"
    assert datetime.fromisoformat(body["expires_at"]) > datetime.now(UTC)
    stored = asyncio.run(
        fetch_link_intent(
            oauth_account_context.database_url,
            hash_oauth_link_intent_code(
                body["link_intent"],
                oauth_account_context.settings,
            ),
        )
    )
    assert stored is not None
    assert stored.user_id == user.id
    assert stored.provider == "google"
    assert stored.code_hash != body["link_intent"]
    assert body["link_intent"] not in stored.code_hash


def test_link_intent_rejects_connected_provider_without_creating_secret(
    oauth_account_context: OAuthAccountTestContext,
) -> None:
    email = "already-linked-intent@example.com"
    register_password_user(oauth_account_context.client, email)
    access_token = login_access_token(oauth_account_context.client, email)
    user = asyncio.run(fetch_user_by_email(oauth_account_context.database_url, email))
    assert user is not None
    asyncio.run(
        attach_identity(
            oauth_account_context.database_url,
            user.id,
            "github",
            "already-linked-intent-subject",
        )
    )
    before = asyncio.run(count_link_intents(oauth_account_context.database_url))

    response = oauth_account_context.client.post(
        "/api/v1/auth/oauth/link-intents",
        headers={"authorization": f"Bearer {access_token}"},
        json={"provider": "github"},
    )

    assert response.status_code == 409
    assert response.json()["error"]["message"] == "GitHub is already connected"
    assert asyncio.run(count_link_intents(oauth_account_context.database_url)) == before


def test_link_intent_provider_mismatch_expiry_and_replay_are_rejected(
    oauth_account_context: OAuthAccountTestContext,
) -> None:
    email = "link-intent-lifecycle@example.com"
    register_password_user(oauth_account_context.client, email)
    access_token = login_access_token(oauth_account_context.client, email)
    headers = {"authorization": f"Bearer {access_token}"}
    first = oauth_account_context.client.post(
        "/api/v1/auth/oauth/link-intents",
        headers=headers,
        json={"provider": "google"},
    ).json()["link_intent"]

    with pytest.raises(InvalidOAuthLinkIntentError):
        asyncio.run(
            consume_link_intent(
                oauth_account_context.database_url,
                first,
                "github",
                oauth_account_context.settings,
            )
        )
    consumed = asyncio.run(
        consume_link_intent(
            oauth_account_context.database_url,
            first,
            "google",
            oauth_account_context.settings,
        )
    )
    assert consumed.consumed_at is not None
    with pytest.raises(InvalidOAuthLinkIntentError):
        asyncio.run(
            consume_link_intent(
                oauth_account_context.database_url,
                first,
                "google",
                oauth_account_context.settings,
            )
        )

    second = oauth_account_context.client.post(
        "/api/v1/auth/oauth/link-intents",
        headers=headers,
        json={"provider": "github"},
    ).json()["link_intent"]
    second_hash = hash_oauth_link_intent_code(
        second,
        oauth_account_context.settings,
    )
    asyncio.run(
        set_link_intent_expiry(
            oauth_account_context.database_url,
            second_hash,
            datetime.now(UTC) - timedelta(seconds=1),
        )
    )
    with pytest.raises(InvalidOAuthLinkIntentError):
        asyncio.run(
            consume_link_intent(
                oauth_account_context.database_url,
                second,
                "github",
                oauth_account_context.settings,
            )
        )


def test_parallel_link_intent_consumption_succeeds_once(
    oauth_account_context: OAuthAccountTestContext,
) -> None:
    email = "parallel-link-intent@example.com"
    register_password_user(oauth_account_context.client, email)
    access_token = login_access_token(oauth_account_context.client, email)
    code = oauth_account_context.client.post(
        "/api/v1/auth/oauth/link-intents",
        headers={"authorization": f"Bearer {access_token}"},
        json={"provider": "google"},
    ).json()["link_intent"]

    def consume_once() -> str:
        try:
            asyncio.run(
                consume_link_intent(
                    oauth_account_context.database_url,
                    code,
                    "google",
                    oauth_account_context.settings,
                )
            )
        except InvalidOAuthLinkIntentError:
            return "rejected"
        return "consumed"

    with ThreadPoolExecutor(max_workers=2) as executor:
        outcomes = sorted(executor.map(lambda _index: consume_once(), range(2)))

    assert outcomes == ["consumed", "rejected"]


def test_explicit_link_flow_connects_google_and_github_to_one_user(
    oauth_account_context: OAuthAccountTestContext,
) -> None:
    email = "multi-provider-owner@example.com"
    register_password_user(oauth_account_context.client, email)
    access_token = login_access_token(oauth_account_context.client, email)
    user = asyncio.run(fetch_user_by_email(oauth_account_context.database_url, email))
    assert user is not None

    provider_profiles = [
        OAuthProfile(
            provider="google",
            subject="multi-provider-google-subject",
            email="different-google-email@example.com",
            full_name="Google Identity",
        ),
        OAuthProfile(
            provider="github",
            subject="multi-provider-github-subject",
            email="different-github-email@example.com",
            full_name="GitHub Identity",
        ),
    ]
    for profile in provider_profiles:
        oauth_account_context.gateway.profile = profile
        link_intent, state = begin_provider_link(
            oauth_account_context,
            access_token,
            profile.provider,
        )
        replay = oauth_account_context.client.get(
            f"/api/v1/auth/oauth/{profile.provider}/start",
            params={"link_intent": link_intent},
            follow_redirects=False,
        )
        callback = oauth_account_context.client.get(
            f"/api/v1/auth/oauth/{profile.provider}/callback",
            params={"state": state},
            follow_redirects=False,
        )

        assert replay.status_code == 400
        assert link_intent not in replay.text
        assert callback.status_code == 303
        location = urlsplit(callback.headers["location"])
        assert location.path == "/settings/security"
        assert parse_qs(location.query) == {
            "provider": [profile.provider],
            "oauth_link": ["connected"],
        }
        assert link_intent not in callback.headers["location"]

    google = asyncio.run(
        fetch_identity(
            oauth_account_context.database_url,
            "google",
            "multi-provider-google-subject",
        )
    )
    github = asyncio.run(
        fetch_identity(
            oauth_account_context.database_url,
            "github",
            "multi-provider-github-subject",
        )
    )
    methods = oauth_account_context.client.get(
        "/api/v1/auth/methods",
        headers={"authorization": f"Bearer {access_token}"},
    )
    assert google is not None and google.user_id == user.id
    assert github is not None and github.user_id == user.id
    assert methods.json() == {
        "password_enabled": True,
        "connected_providers": ["github", "google"],
    }

    for profile in provider_profiles:
        oauth_account_context.gateway.profile = profile
        login_callback = oauth_account_context.client.get(
            f"/api/v1/auth/oauth/{profile.provider}/callback",
            follow_redirects=False,
        )
        exchange_code = parse_qs(urlsplit(login_callback.headers["location"]).fragment)[
            "exchange_code"
        ][0]
        exchange = oauth_account_context.client.post(
            "/api/v1/auth/oauth/exchange",
            json={"exchange_code": exchange_code},
        )
        assert exchange.status_code == 200
        claims = decode_access_token(
            exchange.json()["access_token"],
            oauth_account_context.settings,
        )
        assert claims.subject == user.id
        assert claims.email == email


def test_link_flow_rejects_identity_owned_by_another_user(
    oauth_account_context: OAuthAccountTestContext,
) -> None:
    first_email = "provider-owner@example.com"
    second_email = "provider-claimant@example.com"
    register_password_user(oauth_account_context.client, first_email)
    register_password_user(oauth_account_context.client, second_email)
    first_user = asyncio.run(
        fetch_user_by_email(oauth_account_context.database_url, first_email)
    )
    second_user = asyncio.run(
        fetch_user_by_email(oauth_account_context.database_url, second_email)
    )
    assert first_user is not None and second_user is not None
    asyncio.run(
        attach_identity(
            oauth_account_context.database_url,
            first_user.id,
            "github",
            "owned-github-subject",
        )
    )
    access_token = login_access_token(oauth_account_context.client, second_email)
    oauth_account_context.gateway.profile = OAuthProfile(
        provider="github",
        subject="owned-github-subject",
        email="provider-account@example.com",
        full_name="Owned Provider",
    )
    _link_intent, state = begin_provider_link(
        oauth_account_context,
        access_token,
        "github",
    )

    callback = oauth_account_context.client.get(
        "/api/v1/auth/oauth/github/callback",
        params={"state": state},
        follow_redirects=False,
    )
    identity = asyncio.run(
        fetch_identity(
            oauth_account_context.database_url,
            "github",
            "owned-github-subject",
        )
    )

    assert callback.status_code == 303
    assert parse_qs(urlsplit(callback.headers["location"]).query) == {
        "provider": ["github"],
        "oauth_link": ["provider_in_use"],
    }
    assert identity is not None and identity.user_id == first_user.id
    assert identity.user_id != second_user.id


def test_link_flow_does_not_replace_provider_connected_during_callback(
    oauth_account_context: OAuthAccountTestContext,
) -> None:
    email = "link-callback-race@example.com"
    register_password_user(oauth_account_context.client, email)
    access_token = login_access_token(oauth_account_context.client, email)
    user = asyncio.run(fetch_user_by_email(oauth_account_context.database_url, email))
    assert user is not None
    oauth_account_context.gateway.profile = OAuthProfile(
        provider="google",
        subject="callback-new-google-subject",
        email="new-google@example.com",
        full_name="New Google",
    )
    _link_intent, state = begin_provider_link(
        oauth_account_context,
        access_token,
        "google",
    )
    asyncio.run(
        attach_identity(
            oauth_account_context.database_url,
            user.id,
            "google",
            "callback-existing-google-subject",
        )
    )

    callback = oauth_account_context.client.get(
        "/api/v1/auth/oauth/google/callback",
        params={"state": state},
        follow_redirects=False,
    )

    assert callback.status_code == 303
    assert parse_qs(urlsplit(callback.headers["location"]).query) == {
        "provider": ["google"],
        "oauth_link": ["already_linked"],
    }
    assert (
        asyncio.run(
            count_identities_for_user_provider(
                oauth_account_context.database_url,
                email,
                "google",
            )
        )
        == 1
    )
    assert (
        asyncio.run(
            fetch_identity(
                oauth_account_context.database_url,
                "google",
                "callback-new-google-subject",
            )
        )
        is None
    )


def test_invalid_link_intent_never_starts_provider_authorization(
    oauth_account_context: OAuthAccountTestContext,
) -> None:
    invalid_intent = "sensitive-invalid-link-intent" * 3
    oauth_account_context.gateway.started_provider = None
    oauth_account_context.gateway.started_state = None

    response = oauth_account_context.client.get(
        "/api/v1/auth/oauth/google/start",
        params={"link_intent": invalid_intent},
        follow_redirects=False,
    )

    assert response.status_code == 400
    assert invalid_intent not in response.text
    assert oauth_account_context.gateway.started_provider is None
    assert oauth_account_context.gateway.started_state is None


def test_explicit_oauth_registration_creates_account_identity_and_tokens(
    oauth_account_context: OAuthAccountTestContext,
) -> None:
    profile = OAuthProfile(
        provider="google",
        subject="register-google-subject",
        email="oauth-register@example.com",
        full_name="Provider Name",
    )
    ticket = create_oauth_registration_ticket(
        profile,
        oauth_account_context.settings,
    )

    response = oauth_account_context.client.post(
        "/api/v1/auth/oauth/register",
        json={
            "registration_ticket": ticket,
            "phone_number": "  +15550001111 ",
            "occupation": " student ",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["refresh_token"]
    assert ticket not in response.text
    claims = decode_access_token(body["access_token"], oauth_account_context.settings)
    assert claims.email == profile.email

    user = asyncio.run(
        fetch_user_by_email(oauth_account_context.database_url, profile.email)
    )
    identity = asyncio.run(
        fetch_identity(
            oauth_account_context.database_url,
            profile.provider,
            profile.subject,
        )
    )
    assert user is not None
    assert user.password_hash is None
    assert user.full_name == "Provider Name"
    assert user.phone_number == "+15550001111"
    assert user.occupation == "student"
    assert identity is not None
    assert identity.user_id == user.id
    assert (
        asyncio.run(count_refresh_sessions(oauth_account_context.database_url, user.id))
        == 1
    )


def test_oauth_registration_allows_full_name_override_but_not_email_override(
    oauth_account_context: OAuthAccountTestContext,
) -> None:
    profile = OAuthProfile(
        provider="github",
        subject="registration-locked-email-subject",
        email="locked-email@example.com",
        full_name="GitHub Name",
    )
    ticket = create_oauth_registration_ticket(
        profile,
        oauth_account_context.settings,
    )

    rejected = oauth_account_context.client.post(
        "/api/v1/auth/oauth/register",
        json={
            "registration_ticket": ticket,
            "full_name": "Chosen Name",
            "email": "attacker-controlled@example.com",
        },
    )
    accepted = oauth_account_context.client.post(
        "/api/v1/auth/oauth/register",
        json={
            "registration_ticket": ticket,
            "full_name": "  Chosen Name  ",
        },
    )

    assert rejected.status_code == 422
    assert accepted.status_code == 201
    user = asyncio.run(
        fetch_user_by_email(oauth_account_context.database_url, profile.email)
    )
    assert user is not None
    assert user.full_name == "Chosen Name"
    assert (
        asyncio.run(
            fetch_user_by_email(
                oauth_account_context.database_url,
                "attacker-controlled@example.com",
            )
        )
        is None
    )


def test_oauth_registration_replay_and_existing_email_are_conflicts(
    oauth_account_context: OAuthAccountTestContext,
) -> None:
    profile = OAuthProfile(
        provider="google",
        subject="registration-replay-subject",
        email="registration-replay@example.com",
        full_name="Replay User",
    )
    ticket = create_oauth_registration_ticket(
        profile,
        oauth_account_context.settings,
    )

    first = oauth_account_context.client.post(
        "/api/v1/auth/oauth/register",
        json={"registration_ticket": ticket},
    )
    replay = oauth_account_context.client.post(
        "/api/v1/auth/oauth/register",
        json={"registration_ticket": ticket},
    )

    assert first.status_code == 201
    assert replay.status_code == 409
    assert replay.json()["error"]["message"] == (
        "OAuth registration could not be completed"
    )
    assert (
        asyncio.run(
            count_users_by_email(oauth_account_context.database_url, profile.email)
        )
        == 1
    )
    assert (
        asyncio.run(
            count_identities_by_subject(
                oauth_account_context.database_url,
                profile.provider,
                profile.subject,
            )
        )
        == 1
    )


def test_oauth_registration_does_not_attach_ticket_to_existing_email_account(
    oauth_account_context: OAuthAccountTestContext,
) -> None:
    email = "existing-email-ticket@example.com"
    register_password_user(oauth_account_context.client, email)
    ticket = create_oauth_registration_ticket(
        OAuthProfile(
            provider="github",
            subject="existing-email-ticket-subject",
            email=email,
            full_name="Existing Email",
        ),
        oauth_account_context.settings,
    )
    before = asyncio.run(auth_row_counts(oauth_account_context.database_url))

    response = oauth_account_context.client.post(
        "/api/v1/auth/oauth/register",
        json={"registration_ticket": ticket},
    )
    after = asyncio.run(auth_row_counts(oauth_account_context.database_url))

    assert response.status_code == 409
    assert after == before
    assert (
        asyncio.run(
            fetch_identity(
                oauth_account_context.database_url,
                "github",
                "existing-email-ticket-subject",
            )
        )
        is None
    )


def test_invalid_registration_ticket_creates_no_account_rows(
    oauth_account_context: OAuthAccountTestContext,
) -> None:
    before = asyncio.run(auth_row_counts(oauth_account_context.database_url))
    response = oauth_account_context.client.post(
        "/api/v1/auth/oauth/register",
        json={"registration_ticket": "x" * 80},
    )
    after = asyncio.run(auth_row_counts(oauth_account_context.database_url))

    assert response.status_code == 400
    assert response.json()["error"]["message"] == (
        "OAuth registration session is invalid or expired"
    )
    assert after == before


def test_matching_verified_email_requires_explicit_connection(
    oauth_account_context: OAuthAccountTestContext,
) -> None:
    email = "oauth-link-required@example.com"
    register_password_user(oauth_account_context.client, email)
    oauth_account_context.gateway.profile = OAuthProfile(
        provider="google",
        subject="unlinked-google-subject",
        email=email,
        full_name="Unlinked Provider Name",
    )
    before = asyncio.run(auth_row_counts(oauth_account_context.database_url))

    callback = oauth_account_context.client.get(
        "/api/v1/auth/oauth/google/callback",
        follow_redirects=False,
    )
    after = asyncio.run(auth_row_counts(oauth_account_context.database_url))

    assert callback.status_code == 303
    location = urlsplit(callback.headers["location"])
    assert location.path == "/auth/oauth/callback"
    assert parse_qs(location.query) == {
        "provider": ["google"],
        "error": ["link_required"],
    }
    assert location.fragment == ""
    assert after == before
    assert (
        asyncio.run(
            fetch_identity(
                oauth_account_context.database_url,
                "google",
                "unlinked-google-subject",
            )
        )
        is None
    )


def test_known_identity_logs_into_original_user_when_provider_email_changes(
    oauth_account_context: OAuthAccountTestContext,
) -> None:
    original_email = "oauth-stable-subject@example.com"
    register_password_user(oauth_account_context.client, original_email)
    oauth_account_context.gateway.profile = OAuthProfile(
        provider="github",
        subject="stable-github-subject",
        email=original_email,
        full_name="Stable User",
    )
    user = asyncio.run(
        fetch_user_by_email(oauth_account_context.database_url, original_email)
    )
    assert user is not None
    asyncio.run(
        attach_identity(
            oauth_account_context.database_url,
            user.id,
            "github",
            "stable-github-subject",
        )
    )

    oauth_account_context.gateway.profile = OAuthProfile(
        provider="github",
        subject="stable-github-subject",
        email="new-provider-email@example.com",
        full_name="Renamed Provider User",
    )
    second_callback = oauth_account_context.client.get(
        "/api/v1/auth/oauth/github/callback",
        follow_redirects=False,
    )
    exchange_code = parse_qs(urlsplit(second_callback.headers["location"]).fragment)[
        "exchange_code"
    ][0]
    exchange = oauth_account_context.client.post(
        "/api/v1/auth/oauth/exchange",
        json={"exchange_code": exchange_code},
    )

    assert second_callback.status_code == 303
    assert exchange.status_code == 200
    claims = decode_access_token(
        exchange.json()["access_token"],
        oauth_account_context.settings,
    )
    assert claims.email == original_email
    assert (
        asyncio.run(
            fetch_user_by_email(
                oauth_account_context.database_url,
                "new-provider-email@example.com",
            )
        )
        is None
    )


@pytest.mark.parametrize("attempt", range(3))
def test_parallel_known_identity_callbacks_get_unique_exchanges(
    oauth_account_context: OAuthAccountTestContext,
    attempt: int,
) -> None:
    email = f"parallel-oauth-link-{attempt}@example.com"
    register_password_user(oauth_account_context.client, email)
    oauth_account_context.gateway.profile = OAuthProfile(
        provider="google",
        subject=f"parallel-link-subject-{attempt}",
        email=email,
        full_name="Parallel Link",
    )
    user = asyncio.run(fetch_user_by_email(oauth_account_context.database_url, email))
    assert user is not None
    asyncio.run(
        attach_identity(
            oauth_account_context.database_url,
            user.id,
            "google",
            f"parallel-link-subject-{attempt}",
        )
    )
    before = asyncio.run(auth_row_counts(oauth_account_context.database_url))

    def callback_once() -> tuple[int, str]:
        response = oauth_account_context.client.get(
            "/api/v1/auth/oauth/google/callback",
            follow_redirects=False,
        )
        return response.status_code, response.headers["location"]

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(lambda _index: callback_once(), range(2)))

    after = asyncio.run(auth_row_counts(oauth_account_context.database_url))
    assert [status for status, _location in results] == [303, 303]
    fragments = [parse_qs(urlsplit(location).fragment) for _status, location in results]
    assert all("exchange_code" in fragment for fragment in fragments), results
    assert len({fragment["exchange_code"][0] for fragment in fragments}) == 2
    assert after == (
        before[0],
        before[1],
        before[2] + 2,
        before[3],
    )


def test_inactive_existing_user_is_not_linked_or_given_exchange(
    oauth_account_context: OAuthAccountTestContext,
) -> None:
    email = "inactive-oauth-link@example.com"
    register_password_user(oauth_account_context.client, email)
    asyncio.run(set_user_active(oauth_account_context.database_url, email, False))
    oauth_account_context.gateway.profile = OAuthProfile(
        provider="google",
        subject="inactive-google-subject",
        email=email,
        full_name="Inactive User",
    )
    before = asyncio.run(auth_row_counts(oauth_account_context.database_url))

    callback = oauth_account_context.client.get(
        "/api/v1/auth/oauth/google/callback",
        follow_redirects=False,
    )
    after = asyncio.run(auth_row_counts(oauth_account_context.database_url))

    assert callback.status_code == 303
    location = urlsplit(callback.headers["location"])
    assert parse_qs(location.query)["error"] == ["callback_failed"]
    assert location.fragment == ""
    assert after == before


def test_unlinked_subject_does_not_replace_existing_provider_connection(
    oauth_account_context: OAuthAccountTestContext,
) -> None:
    email = "provider-link-conflict@example.com"
    register_password_user(oauth_account_context.client, email)
    oauth_account_context.gateway.profile = OAuthProfile(
        provider="google",
        subject="first-provider-subject",
        email=email,
        full_name="Provider Conflict",
    )
    user = asyncio.run(fetch_user_by_email(oauth_account_context.database_url, email))
    assert user is not None
    asyncio.run(
        attach_identity(
            oauth_account_context.database_url,
            user.id,
            "google",
            "first-provider-subject",
        )
    )

    oauth_account_context.gateway.profile = OAuthProfile(
        provider="google",
        subject="second-provider-subject",
        email=email,
        full_name="Provider Conflict",
    )
    second = oauth_account_context.client.get(
        "/api/v1/auth/oauth/google/callback",
        follow_redirects=False,
    )

    assert parse_qs(urlsplit(second.headers["location"]).query)["error"] == [
        "link_required"
    ]
    assert (
        asyncio.run(
            count_identities_for_user_provider(
                oauth_account_context.database_url,
                email,
                "google",
            )
        )
        == 1
    )


def test_expired_oauth_exchange_is_rejected_and_consumed(
    oauth_account_context: OAuthAccountTestContext,
) -> None:
    email = "expired-oauth-exchange@example.com"
    register_password_user(oauth_account_context.client, email)
    oauth_account_context.gateway.profile = OAuthProfile(
        provider="github",
        subject="expired-exchange-subject",
        email=email,
        full_name="Expired Exchange",
    )
    user = asyncio.run(fetch_user_by_email(oauth_account_context.database_url, email))
    assert user is not None
    asyncio.run(
        attach_identity(
            oauth_account_context.database_url,
            user.id,
            "github",
            "expired-exchange-subject",
        )
    )
    callback = oauth_account_context.client.get(
        "/api/v1/auth/oauth/github/callback",
        follow_redirects=False,
    )
    exchange_code = parse_qs(urlsplit(callback.headers["location"]).fragment)[
        "exchange_code"
    ][0]
    code_hash = hash_oauth_login_exchange_code(
        exchange_code,
        oauth_account_context.settings,
    )
    asyncio.run(
        set_exchange_expiry(
            oauth_account_context.database_url,
            code_hash,
            datetime.now(UTC) - timedelta(seconds=1),
        )
    )

    response = oauth_account_context.client.post(
        "/api/v1/auth/oauth/exchange",
        json={"exchange_code": exchange_code},
    )
    stored_exchange = asyncio.run(
        fetch_exchange_by_hash(oauth_account_context.database_url, code_hash)
    )

    assert response.status_code == 401
    assert stored_exchange is not None
    assert stored_exchange.consumed_at is not None


def test_parallel_oauth_exchange_attempts_only_issue_one_session(
    oauth_account_context: OAuthAccountTestContext,
) -> None:
    email = "parallel-oauth-exchange@example.com"
    register_password_user(oauth_account_context.client, email)
    oauth_account_context.gateway.profile = OAuthProfile(
        provider="google",
        subject="parallel-exchange-subject",
        email=email,
        full_name="Parallel Exchange",
    )
    user = asyncio.run(fetch_user_by_email(oauth_account_context.database_url, email))
    assert user is not None
    asyncio.run(
        attach_identity(
            oauth_account_context.database_url,
            user.id,
            "google",
            "parallel-exchange-subject",
        )
    )
    callback = oauth_account_context.client.get(
        "/api/v1/auth/oauth/google/callback",
        follow_redirects=False,
    )
    exchange_code = parse_qs(urlsplit(callback.headers["location"]).fragment)[
        "exchange_code"
    ][0]

    def exchange_once() -> int:
        return oauth_account_context.client.post(
            "/api/v1/auth/oauth/exchange",
            json={"exchange_code": exchange_code},
        ).status_code

    with ThreadPoolExecutor(max_workers=2) as executor:
        statuses = sorted(executor.map(lambda _index: exchange_once(), range(2)))

    assert statuses == [200, 401]
    assert (
        asyncio.run(count_refresh_sessions(oauth_account_context.database_url, user.id))
        == 1
    )


def test_oauth_exchange_validation_redacts_code(
    oauth_account_context: OAuthAccountTestContext,
) -> None:
    exchange_code = "short-secret-code"
    response = oauth_account_context.client.post(
        "/api/v1/auth/oauth/exchange",
        json={"exchange_code": exchange_code},
    )

    assert response.status_code == 422
    assert exchange_code not in response.text
    assert "[redacted]" in response.text


def register_password_user(client: TestClient, email: str) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "CorrectHorse42"},
    )
    assert response.status_code == 201


def login_access_token(client: TestClient, email: str) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "CorrectHorse42"},
    )
    assert response.status_code == 200
    return str(response.json()["access_token"])


def begin_provider_link(
    context: OAuthAccountTestContext,
    access_token: str,
    provider: OAuthProvider,
) -> tuple[str, str]:
    intent_response = context.client.post(
        "/api/v1/auth/oauth/link-intents",
        headers={"authorization": f"Bearer {access_token}"},
        json={"provider": provider},
    )
    assert intent_response.status_code == 201
    link_intent = str(intent_response.json()["link_intent"])

    start = context.client.get(
        f"/api/v1/auth/oauth/{provider}/start",
        params={"link_intent": link_intent},
        follow_redirects=False,
    )
    assert start.status_code == 307
    assert context.gateway.started_provider == provider
    assert context.gateway.started_state is not None
    return link_intent, context.gateway.started_state


async def attach_identity(
    database_url: str,
    user_id: uuid.UUID,
    provider: str,
    subject: str,
) -> None:
    engine = build_async_engine(database_url)
    session_factory = build_session_factory(engine)
    try:
        async with session_factory() as session:
            session.add(
                OAuthIdentity(
                    user_id=user_id,
                    provider=provider,
                    provider_subject=subject,
                )
            )
            await session.commit()
    finally:
        await engine.dispose()


async def consume_link_intent(
    database_url: str,
    code: str,
    provider: OAuthProvider,
    settings: Settings,
) -> OAuthLinkIntent:
    engine = build_async_engine(database_url)
    session_factory = build_session_factory(engine)
    try:
        async with session_factory() as session:
            service = OAuthLinkService(
                users=UserRepository(session),
                identities=OAuthIdentityRepository(session),
                link_intents=OAuthLinkIntentRepository(session),
            )
            return await service.consume_link_intent(code, provider, settings)
    finally:
        await engine.dispose()


async def fetch_user_by_email(database_url: str, email: str) -> User | None:
    engine = build_async_engine(database_url)
    session_factory = build_session_factory(engine)
    try:
        async with session_factory() as session:
            result = await session.execute(select(User).where(User.email == email))
            return result.scalar_one_or_none()
    finally:
        await engine.dispose()


async def fetch_identity(
    database_url: str,
    provider: str,
    subject: str,
) -> OAuthIdentity | None:
    engine = build_async_engine(database_url)
    session_factory = build_session_factory(engine)
    try:
        async with session_factory() as session:
            result = await session.execute(
                select(OAuthIdentity).where(
                    OAuthIdentity.provider == provider,
                    OAuthIdentity.provider_subject == subject,
                )
            )
            return result.scalar_one_or_none()
    finally:
        await engine.dispose()


async def fetch_exchange_by_hash(
    database_url: str,
    code_hash: str,
) -> OAuthLoginExchange | None:
    engine = build_async_engine(database_url)
    session_factory = build_session_factory(engine)
    try:
        async with session_factory() as session:
            result = await session.execute(
                select(OAuthLoginExchange).where(
                    OAuthLoginExchange.code_hash == code_hash
                )
            )
            return result.scalar_one_or_none()
    finally:
        await engine.dispose()


async def fetch_refresh_session_by_token(
    database_url: str,
    refresh_token: str,
    settings: Settings,
) -> RefreshSession | None:
    engine = build_async_engine(database_url)
    session_factory = build_session_factory(engine)
    try:
        async with session_factory() as session:
            result = await session.execute(
                select(RefreshSession).where(
                    RefreshSession.token_hash
                    == hash_refresh_token(refresh_token, settings)
                )
            )
            return result.scalar_one_or_none()
    finally:
        await engine.dispose()


async def fetch_link_intent(
    database_url: str,
    code_hash: str,
) -> OAuthLinkIntent | None:
    engine = build_async_engine(database_url)
    session_factory = build_session_factory(engine)
    try:
        async with session_factory() as session:
            result = await session.execute(
                select(OAuthLinkIntent).where(OAuthLinkIntent.code_hash == code_hash)
            )
            return result.scalar_one_or_none()
    finally:
        await engine.dispose()


async def auth_row_counts(database_url: str) -> tuple[int, int, int, int]:
    engine = build_async_engine(database_url)
    session_factory = build_session_factory(engine)
    try:
        async with session_factory() as session:
            counts = []
            for model in (User, OAuthIdentity, OAuthLoginExchange, RefreshSession):
                value = await session.scalar(select(func.count()).select_from(model))
                counts.append(int(value or 0))
            return counts[0], counts[1], counts[2], counts[3]
    finally:
        await engine.dispose()


async def count_users_by_email(database_url: str, email: str) -> int:
    engine = build_async_engine(database_url)
    session_factory = build_session_factory(engine)
    try:
        async with session_factory() as session:
            value = await session.scalar(
                select(func.count()).select_from(User).where(User.email == email)
            )
            return int(value or 0)
    finally:
        await engine.dispose()


async def count_identities_by_subject(
    database_url: str,
    provider: str,
    subject: str,
) -> int:
    engine = build_async_engine(database_url)
    session_factory = build_session_factory(engine)
    try:
        async with session_factory() as session:
            value = await session.scalar(
                select(func.count())
                .select_from(OAuthIdentity)
                .where(
                    OAuthIdentity.provider == provider,
                    OAuthIdentity.provider_subject == subject,
                )
            )
            return int(value or 0)
    finally:
        await engine.dispose()


async def count_identities_for_user_provider(
    database_url: str,
    email: str,
    provider: str,
) -> int:
    engine = build_async_engine(database_url)
    session_factory = build_session_factory(engine)
    try:
        async with session_factory() as session:
            value = await session.scalar(
                select(func.count())
                .select_from(OAuthIdentity)
                .join(User, User.id == OAuthIdentity.user_id)
                .where(User.email == email, OAuthIdentity.provider == provider)
            )
            return int(value or 0)
    finally:
        await engine.dispose()


async def count_link_intents(database_url: str) -> int:
    engine = build_async_engine(database_url)
    session_factory = build_session_factory(engine)
    try:
        async with session_factory() as session:
            value = await session.scalar(
                select(func.count()).select_from(OAuthLinkIntent)
            )
            return int(value or 0)
    finally:
        await engine.dispose()


async def count_refresh_sessions(database_url: str, user_id: object) -> int:
    engine = build_async_engine(database_url)
    session_factory = build_session_factory(engine)
    try:
        async with session_factory() as session:
            value = await session.scalar(
                select(func.count())
                .select_from(RefreshSession)
                .where(RefreshSession.user_id == user_id)
            )
            return int(value or 0)
    finally:
        await engine.dispose()


async def set_user_active(database_url: str, email: str, active: bool) -> None:
    engine = build_async_engine(database_url)
    session_factory = build_session_factory(engine)
    try:
        async with session_factory() as session:
            await session.execute(
                update(User).where(User.email == email).values(is_active=active)
            )
            await session.commit()
    finally:
        await engine.dispose()


async def set_exchange_expiry(
    database_url: str,
    code_hash: str,
    expires_at: datetime,
) -> None:
    engine = build_async_engine(database_url)
    session_factory = build_session_factory(engine)
    try:
        async with session_factory() as session:
            await session.execute(
                update(OAuthLoginExchange)
                .where(OAuthLoginExchange.code_hash == code_hash)
                .values(expires_at=expires_at)
            )
            await session.commit()
    finally:
        await engine.dispose()


async def set_link_intent_expiry(
    database_url: str,
    code_hash: str,
    expires_at: datetime,
) -> None:
    engine = build_async_engine(database_url)
    session_factory = build_session_factory(engine)
    try:
        async with session_factory() as session:
            await session.execute(
                update(OAuthLinkIntent)
                .where(OAuthLinkIntent.code_hash == code_hash)
                .values(expires_at=expires_at)
            )
            await session.commit()
    finally:
        await engine.dispose()
