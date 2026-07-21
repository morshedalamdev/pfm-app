from __future__ import annotations

import hashlib
import hmac
import secrets
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from pwdlib import PasswordHash

from app.core.config import Settings
from app.modules.users.models import User

password_hash = PasswordHash.recommended()
ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_BYTES = 48
OAUTH_LOGIN_EXCHANGE_BYTES = 48
OAUTH_LOGIN_EXCHANGE_HASH_CONTEXT = b"pfm-oauth-login-exchange\x00"
OAUTH_LINK_INTENT_BYTES = 48
OAUTH_LINK_INTENT_HASH_CONTEXT = b"pfm-oauth-link-intent\x00"


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def create_refresh_token() -> str:
    return secrets.token_urlsafe(REFRESH_TOKEN_BYTES)


def hash_refresh_token(token: str, settings: Settings) -> str:
    return hmac.new(
        settings.refresh_token_secret_key.get_secret_value().encode("utf-8"),
        token.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def create_oauth_login_exchange_code() -> str:
    return secrets.token_urlsafe(OAUTH_LOGIN_EXCHANGE_BYTES)


def hash_oauth_login_exchange_code(code: str, settings: Settings) -> str:
    return hmac.new(
        settings.oauth_state_secret_key.get_secret_value().encode("utf-8"),
        OAUTH_LOGIN_EXCHANGE_HASH_CONTEXT + code.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def create_oauth_link_intent_code() -> str:
    return secrets.token_urlsafe(OAUTH_LINK_INTENT_BYTES)


def hash_oauth_link_intent_code(code: str, settings: Settings) -> str:
    return hmac.new(
        settings.oauth_state_secret_key.get_secret_value().encode("utf-8"),
        OAUTH_LINK_INTENT_HASH_CONTEXT + code.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


@dataclass(frozen=True)
class AccessTokenClaims:
    subject: uuid.UUID
    email: str


class InvalidAccessTokenError(Exception):
    pass


class ExpiredAccessTokenError(InvalidAccessTokenError):
    pass


def create_access_token(
    user: User,
    settings: Settings,
    *,
    now: datetime | None = None,
    expires_delta: timedelta | None = None,
) -> str:
    issued_at = now or datetime.now(UTC)
    lifetime = expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    expires_at = issued_at + lifetime
    payload: dict[str, Any] = {
        "sub": str(user.id),
        "email": user.email,
        "typ": ACCESS_TOKEN_TYPE,
        "iat": issued_at,
        "exp": expires_at,
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(
        payload,
        settings.access_token_secret_key.get_secret_value(),
        algorithm=settings.access_token_algorithm,
    )


def decode_access_token(token: str, settings: Settings) -> AccessTokenClaims:
    try:
        payload = jwt.decode(
            token,
            settings.access_token_secret_key.get_secret_value(),
            algorithms=[settings.access_token_algorithm],
        )
    except jwt.ExpiredSignatureError as exc:
        raise ExpiredAccessTokenError from exc
    except jwt.InvalidTokenError as exc:
        raise InvalidAccessTokenError from exc

    if payload.get("typ") != ACCESS_TOKEN_TYPE:
        raise InvalidAccessTokenError

    subject = payload.get("sub")
    email = payload.get("email")
    if not isinstance(subject, str) or not isinstance(email, str):
        raise InvalidAccessTokenError

    try:
        user_id = uuid.UUID(subject)
    except ValueError as exc:
        raise InvalidAccessTokenError from exc

    return AccessTokenClaims(subject=user_id, email=email)
