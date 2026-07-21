from __future__ import annotations

import base64
import hashlib
import secrets
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any, cast

import httpx
from authlib.integrations.base_client.errors import (  # type: ignore[import-untyped]
    OAuthError,
)
from authlib.integrations.starlette_client import OAuth  # type: ignore[import-untyped]
from cryptography.fernet import Fernet, InvalidToken
from fastapi import Depends, Request
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from starlette.responses import Response

from app.core.config import Settings, get_settings
from app.modules.auth.schemas import OAuthProvider
from app.modules.auth.validation import normalize_email

GOOGLE_ISSUER = "https://accounts.google.com"
GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_ACCESS_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_API_BASE_URL = "https://api.github.com/"
REGISTRATION_TICKET_TYPE = "oauth_registration"
REGISTRATION_TICKET_VERSION = 1


class OAuthProviderNotConfiguredError(Exception):
    pass


class OAuthCallbackError(Exception):
    pass


class OAuthProfileError(OAuthCallbackError):
    pass


class InvalidOAuthRegistrationTicketError(Exception):
    pass


@dataclass(frozen=True)
class OAuthProfile:
    provider: OAuthProvider
    subject: str
    email: str
    full_name: str


class OAuthRegistrationClaims(BaseModel):
    version: int
    token_type: str
    issuer: str
    audience: str
    provider: OAuthProvider
    subject: str = Field(min_length=1, max_length=255)
    email: str = Field(min_length=3, max_length=320)
    full_name: str = Field(min_length=1, max_length=120)
    issued_at: int
    expires_at: int
    token_id: str = Field(min_length=32, max_length=128)

    model_config = ConfigDict(extra="forbid")


class OAuthGateway:
    def __init__(self, settings: Settings, oauth: OAuth | None = None) -> None:
        self.settings = settings
        self.oauth = oauth or build_oauth_registry(settings)

    @property
    def configured_providers(self) -> frozenset[OAuthProvider]:
        providers: set[OAuthProvider] = set()
        if (
            self.settings.google_oauth_client_id is not None
            and self.settings.google_oauth_client_secret is not None
        ):
            providers.add("google")
        if (
            self.settings.github_oauth_client_id is not None
            and self.settings.github_oauth_client_secret is not None
        ):
            providers.add("github")
        return frozenset(providers)

    async def begin(
        self,
        request: Request,
        provider: OAuthProvider,
        redirect_uri: str,
        *,
        state: str | None = None,
    ) -> Response:
        client = self._require_client(provider)
        authorize_kwargs: dict[str, str] = {}
        if state is not None:
            authorize_kwargs["state"] = state
        if provider == "google":
            authorize_kwargs["nonce"] = secrets.token_urlsafe(32)

        try:
            response = await client.authorize_redirect(
                request,
                redirect_uri,
                **authorize_kwargs,
            )
        except (OAuthError, httpx.HTTPError, ValueError, TypeError) as exc:
            raise OAuthCallbackError from exc
        return cast(Response, response)

    async def complete(
        self,
        request: Request,
        provider: OAuthProvider,
    ) -> OAuthProfile:
        client = self._require_client(provider)
        try:
            token = await client.authorize_access_token(request)
            if not isinstance(token, Mapping):
                raise OAuthProfileError
            if provider == "google":
                return normalize_google_profile(token.get("userinfo"))
            return await self._complete_github(client, token)
        except OAuthCallbackError:
            raise
        except (OAuthError, httpx.HTTPError, ValueError, TypeError) as exc:
            raise OAuthCallbackError from exc

    def _require_client(self, provider: OAuthProvider) -> Any:
        if provider not in self.configured_providers:
            raise OAuthProviderNotConfiguredError
        client = self.oauth.create_client(provider)
        if client is None:
            raise OAuthProviderNotConfiguredError
        return client

    async def _complete_github(
        self,
        client: Any,
        token: Mapping[str, Any],
    ) -> OAuthProfile:
        profile_response = await client.get("user", token=token)
        emails_response = await client.get("user/emails", token=token)
        profile_response.raise_for_status()
        emails_response.raise_for_status()
        return normalize_github_profile(
            profile_response.json(),
            emails_response.json(),
        )


def build_oauth_registry(settings: Settings) -> OAuth:
    oauth = OAuth()
    if (
        settings.google_oauth_client_id is not None
        and settings.google_oauth_client_secret is not None
    ):
        oauth.register(
            name="google",
            client_id=settings.google_oauth_client_id,
            client_secret=settings.google_oauth_client_secret.get_secret_value(),
            issuer=GOOGLE_ISSUER,
            authorization_endpoint=GOOGLE_AUTHORIZE_URL,
            token_endpoint=GOOGLE_ACCESS_TOKEN_URL,
            userinfo_endpoint=GOOGLE_USERINFO_URL,
            jwks_uri=GOOGLE_JWKS_URL,
            id_token_signing_alg_values_supported=["RS256"],
            client_kwargs={
                "scope": "openid email profile",
                "code_challenge_method": "S256",
            },
        )
    if (
        settings.github_oauth_client_id is not None
        and settings.github_oauth_client_secret is not None
    ):
        oauth.register(
            name="github",
            client_id=settings.github_oauth_client_id,
            client_secret=settings.github_oauth_client_secret.get_secret_value(),
            access_token_url=GITHUB_ACCESS_TOKEN_URL,
            authorize_url=GITHUB_AUTHORIZE_URL,
            api_base_url=GITHUB_API_BASE_URL,
            client_kwargs={
                "scope": "read:user user:email",
                "code_challenge_method": "S256",
            },
        )
    return oauth


def get_oauth_gateway(
    settings: Annotated[Settings, Depends(get_settings)],
) -> OAuthGateway:
    return OAuthGateway(settings)


def normalize_google_profile(raw_profile: object) -> OAuthProfile:
    if not isinstance(raw_profile, Mapping):
        raise OAuthProfileError
    if raw_profile.get("email_verified") is not True:
        raise OAuthProfileError

    subject = required_string(raw_profile.get("sub"), max_length=255)
    email = normalized_provider_email(raw_profile.get("email"))
    full_name = normalized_full_name(raw_profile.get("name"), email)
    return OAuthProfile(
        provider="google",
        subject=subject,
        email=email,
        full_name=full_name,
    )


def normalize_github_profile(
    raw_profile: object,
    raw_emails: object,
) -> OAuthProfile:
    if not isinstance(raw_profile, Mapping) or not isinstance(raw_emails, Sequence):
        raise OAuthProfileError

    raw_subject = raw_profile.get("id")
    if isinstance(raw_subject, bool) or not isinstance(raw_subject, (int, str)):
        raise OAuthProfileError
    subject = required_string(str(raw_subject), max_length=255)

    primary_email: object | None = None
    for candidate in raw_emails:
        if (
            isinstance(candidate, Mapping)
            and candidate.get("primary") is True
            and candidate.get("verified") is True
        ):
            primary_email = candidate.get("email")
            break
    email = normalized_provider_email(primary_email)
    full_name = normalized_full_name(
        raw_profile.get("name") or raw_profile.get("login"),
        email,
    )
    return OAuthProfile(
        provider="github",
        subject=subject,
        email=email,
        full_name=full_name,
    )


def create_oauth_registration_ticket(
    profile: OAuthProfile,
    settings: Settings,
    *,
    now: datetime | None = None,
) -> str:
    issued_at = now or datetime.now(UTC)
    expires_at = issued_at + timedelta(
        minutes=settings.oauth_registration_ticket_expire_minutes
    )
    claims = OAuthRegistrationClaims(
        version=REGISTRATION_TICKET_VERSION,
        token_type=REGISTRATION_TICKET_TYPE,
        issuer=settings.oauth_public_api_url,
        audience=settings.frontend_base_url,
        provider=profile.provider,
        subject=profile.subject,
        email=profile.email,
        full_name=profile.full_name,
        issued_at=int(issued_at.timestamp()),
        expires_at=int(expires_at.timestamp()),
        token_id=secrets.token_urlsafe(32),
    )
    return (
        registration_ticket_cipher(settings)
        .encrypt_at_time(
            claims.model_dump_json().encode("utf-8"),
            current_time=claims.issued_at,
        )
        .decode("ascii")
    )


def decode_oauth_registration_ticket(
    ticket: str,
    settings: Settings,
    *,
    now: datetime | None = None,
) -> OAuthRegistrationClaims:
    current_time = int((now or datetime.now(UTC)).timestamp())
    try:
        payload = registration_ticket_cipher(settings).decrypt_at_time(
            ticket.encode("ascii"),
            ttl=settings.oauth_registration_ticket_expire_minutes * 60,
            current_time=current_time,
        )
        claims = OAuthRegistrationClaims.model_validate_json(payload)
    except (InvalidToken, UnicodeEncodeError, ValidationError, ValueError) as exc:
        raise InvalidOAuthRegistrationTicketError from exc

    if (
        claims.version != REGISTRATION_TICKET_VERSION
        or claims.token_type != REGISTRATION_TICKET_TYPE
        or claims.issuer != settings.oauth_public_api_url
        or claims.audience != settings.frontend_base_url
        or claims.issued_at > current_time
        or claims.expires_at < current_time
    ):
        raise InvalidOAuthRegistrationTicketError
    return claims


def registration_ticket_cipher(settings: Settings) -> Fernet:
    secret = settings.oauth_registration_ticket_secret_key.get_secret_value()
    key = base64.urlsafe_b64encode(hashlib.sha256(secret.encode("utf-8")).digest())
    return Fernet(key)


def required_string(value: object, *, max_length: int) -> str:
    if not isinstance(value, str):
        raise OAuthProfileError
    normalized = value.strip()
    if not normalized or len(normalized) > max_length:
        raise OAuthProfileError
    return normalized


def normalized_provider_email(value: object) -> str:
    if not isinstance(value, str):
        raise OAuthProfileError
    try:
        return normalize_email(value)
    except ValueError as exc:
        raise OAuthProfileError from exc


def normalized_full_name(value: object, email: str) -> str:
    if isinstance(value, str) and value.strip():
        return value.strip()[:120]
    return email.partition("@")[0][:120]
