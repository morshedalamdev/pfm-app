from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy.exc import IntegrityError

from app.core.config import Settings
from app.core.security import (
    create_access_token,
    create_oauth_link_intent_code,
    create_oauth_login_exchange_code,
    create_refresh_token,
    hash_oauth_link_intent_code,
    hash_oauth_login_exchange_code,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.modules.auth.models import (
    OAuthIdentity,
    OAuthLinkIntent,
    OAuthLoginExchange,
    RefreshSession,
)
from app.modules.auth.oauth import OAuthProfile
from app.modules.auth.repositories import (
    OAuthIdentityRepository,
    OAuthLinkIntentRepository,
    OAuthLoginExchangeRepository,
    RefreshSessionRepository,
)
from app.modules.auth.schemas import (
    AccessTokenResponse,
    LoginRequest,
    OAuthLinkIntentCreateRequest,
    OAuthLinkIntentResponse,
    OAuthLoginExchangeRequest,
    OAuthProvider,
    OAuthRegisterRequest,
    RefreshTokenRequest,
    RegisterUserRequest,
    SignInMethodsResponse,
)
from app.modules.users.models import User
from app.modules.users.repositories import UserRepository


class DuplicateRegistrationError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class InvalidRefreshTokenError(Exception):
    pass


class OAuthAccountUnavailableError(Exception):
    pass


class OAuthLinkRequiredError(Exception):
    pass


class OAuthRegistrationConflictError(Exception):
    pass


class InvalidOAuthLoginExchangeError(Exception):
    pass


class OAuthProviderAlreadyLinkedError(Exception):
    pass


class InvalidOAuthLinkIntentError(Exception):
    pass


class OAuthIdentityAlreadyInUseError(Exception):
    pass


class AuthService:
    def __init__(
        self,
        users: UserRepository,
        refresh_sessions: RefreshSessionRepository,
    ) -> None:
        self.users = users
        self.refresh_sessions = refresh_sessions

    async def register_user(self, request: RegisterUserRequest) -> User:
        existing_user = await self.users.get_by_email(request.email)
        if existing_user is not None:
            raise DuplicateRegistrationError

        user = User(
            email=request.email,
            password_hash=hash_password(request.password),
            full_name=request.full_name,
            phone_number=request.phone_number,
            occupation=request.occupation,
        )

        try:
            await self.users.create(user)
            await self.users.commit()
        except IntegrityError as exc:
            await self.users.rollback()
            raise DuplicateRegistrationError from exc

        return user

    async def login_user(
        self,
        request: LoginRequest,
        settings: Settings,
    ) -> AccessTokenResponse:
        user = await self.users.get_by_email(request.email)
        if user is None:
            raise InvalidCredentialsError
        if user.password_hash is None or not verify_password(
            request.password,
            user.password_hash,
        ):
            raise InvalidCredentialsError
        if not user.is_active:
            raise InvalidCredentialsError

        refresh_token, _refresh_session_id = await self.create_refresh_session(
            user,
            settings,
        )
        access_token = create_access_token(user, settings)
        return AccessTokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.access_token_expire_minutes * 60,
        )

    async def refresh_tokens(
        self,
        request: RefreshTokenRequest,
        settings: Settings,
    ) -> AccessTokenResponse:
        now = datetime.now(UTC)
        refresh_session = await self.refresh_sessions.get_by_token_hash_for_update(
            hash_refresh_token(request.refresh_token, settings)
        )
        if refresh_session is None:
            raise InvalidRefreshTokenError

        if (
            refresh_session.revoked_at is not None
            or refresh_session.replaced_by_session_id is not None
        ):
            await self.revoke_refresh_family(
                refresh_session.session_family_id,
                now,
                "reuse_detected",
            )
            await self.refresh_sessions.commit()
            raise InvalidRefreshTokenError

        if refresh_session.expires_at <= now:
            refresh_session.revoked_at = now
            refresh_session.revoked_reason = "expired"
            await self.refresh_sessions.commit()
            raise InvalidRefreshTokenError

        user = await self.users.get_by_id(refresh_session.user_id)
        if user is None or not user.is_active:
            refresh_session.revoked_at = now
            refresh_session.revoked_reason = "invalid_user"
            await self.refresh_sessions.commit()
            raise InvalidRefreshTokenError

        new_refresh_token, new_refresh_session_id = await self.create_refresh_session(
            user,
            settings,
            now=now,
            session_family_id=refresh_session.session_family_id,
            parent_session_id=refresh_session.id,
            commit=False,
        )
        refresh_session.revoked_at = now
        refresh_session.revoked_reason = "rotated"
        refresh_session.replaced_by_session_id = new_refresh_session_id
        await self.refresh_sessions.commit()

        return AccessTokenResponse(
            access_token=create_access_token(user, settings),
            refresh_token=new_refresh_token,
            expires_in=settings.access_token_expire_minutes * 60,
        )

    async def logout_user(
        self,
        request: RefreshTokenRequest,
        settings: Settings,
    ) -> None:
        refresh_session = await self.refresh_sessions.get_by_token_hash_for_update(
            hash_refresh_token(request.refresh_token, settings)
        )
        if refresh_session is not None and refresh_session.revoked_at is None:
            refresh_session.revoked_at = datetime.now(UTC)
            refresh_session.revoked_reason = "logout"
        await self.refresh_sessions.commit()

    async def create_refresh_session(
        self,
        user: User,
        settings: Settings,
        *,
        now: datetime | None = None,
        session_family_id: uuid.UUID | None = None,
        parent_session_id: uuid.UUID | None = None,
        commit: bool = True,
    ) -> tuple[str, uuid.UUID]:
        created_at = now or datetime.now(UTC)
        refresh_token = create_refresh_token()
        refresh_session_id = uuid.uuid4()
        refresh_session = RefreshSession(
            id=refresh_session_id,
            user_id=user.id,
            token_hash=hash_refresh_token(refresh_token, settings),
            session_family_id=session_family_id or uuid.uuid4(),
            parent_session_id=parent_session_id,
            expires_at=created_at + timedelta(days=settings.refresh_token_expire_days),
        )
        await self.refresh_sessions.create(refresh_session)
        if commit:
            await self.refresh_sessions.commit()
        return refresh_token, refresh_session_id

    async def revoke_refresh_family(
        self,
        session_family_id: uuid.UUID,
        revoked_at: datetime,
        reason: str,
    ) -> None:
        sessions = await self.refresh_sessions.list_active_by_family_for_update(
            session_family_id
        )
        for refresh_session in sessions:
            refresh_session.revoked_at = revoked_at
            refresh_session.revoked_reason = reason


class OAuthAuthService:
    def __init__(
        self,
        users: UserRepository,
        refresh_sessions: RefreshSessionRepository,
        identities: OAuthIdentityRepository,
        login_exchanges: OAuthLoginExchangeRepository,
    ) -> None:
        self.users = users
        self.refresh_sessions = refresh_sessions
        self.identities = identities
        self.login_exchanges = login_exchanges
        self.auth = AuthService(users, refresh_sessions)

    async def resolve_callback(
        self,
        profile: OAuthProfile,
        settings: Settings,
    ) -> str | None:
        identity = await self.identities.get_by_provider_subject(
            profile.provider,
            profile.subject,
        )
        if identity is not None:
            user = await self.users.get_by_id(identity.user_id)
            return await self._create_exchange_for_active_user(user, settings)

        user = await self.users.get_by_email(profile.email)
        if user is None:
            return None
        if not user.is_active:
            raise OAuthAccountUnavailableError
        raise OAuthLinkRequiredError

    async def register_oauth_user(
        self,
        profile: OAuthProfile,
        request: OAuthRegisterRequest,
        settings: Settings,
    ) -> AccessTokenResponse:
        if (
            await self.identities.get_by_provider_subject(
                profile.provider,
                profile.subject,
            )
            is not None
            or await self.users.get_by_email(profile.email) is not None
        ):
            raise OAuthRegistrationConflictError

        user = User(
            email=profile.email,
            password_hash=None,
            full_name=request.full_name or profile.full_name,
            phone_number=request.phone_number,
            occupation=request.occupation,
        )
        try:
            await self.users.create(user)
            await self.identities.create(
                OAuthIdentity(
                    user_id=user.id,
                    provider=profile.provider,
                    provider_subject=profile.subject,
                )
            )
            refresh_token, _session_id = await self.auth.create_refresh_session(
                user,
                settings,
                commit=False,
            )
            await self.refresh_sessions.commit()
        except IntegrityError as exc:
            await self.refresh_sessions.rollback()
            raise OAuthRegistrationConflictError from exc

        return self._token_response(user, refresh_token, settings)

    async def exchange_login_code(
        self,
        request: OAuthLoginExchangeRequest,
        settings: Settings,
    ) -> AccessTokenResponse:
        now = datetime.now(UTC)
        exchange = await self.login_exchanges.get_by_code_hash_for_update(
            hash_oauth_login_exchange_code(request.exchange_code, settings)
        )
        if exchange is None or exchange.consumed_at is not None:
            raise InvalidOAuthLoginExchangeError
        if exchange.expires_at <= now:
            exchange.consumed_at = now
            await self.refresh_sessions.commit()
            raise InvalidOAuthLoginExchangeError

        user = await self.users.get_by_id(exchange.user_id)
        if user is None or not user.is_active:
            exchange.consumed_at = now
            await self.refresh_sessions.commit()
            raise InvalidOAuthLoginExchangeError

        exchange.consumed_at = now
        refresh_token, _session_id = await self.auth.create_refresh_session(
            user,
            settings,
            now=now,
            commit=False,
        )
        await self.refresh_sessions.commit()
        return self._token_response(user, refresh_token, settings)

    async def _create_exchange_for_active_user(
        self,
        user: User | None,
        settings: Settings,
    ) -> str:
        if user is None or not user.is_active:
            raise OAuthAccountUnavailableError
        return await self._create_login_exchange(user, settings, commit=True)

    async def _create_login_exchange(
        self,
        user: User,
        settings: Settings,
        *,
        commit: bool,
    ) -> str:
        now = datetime.now(UTC)
        code = create_oauth_login_exchange_code()
        await self.login_exchanges.create(
            OAuthLoginExchange(
                user_id=user.id,
                code_hash=hash_oauth_login_exchange_code(code, settings),
                expires_at=now
                + timedelta(seconds=settings.oauth_login_exchange_expire_seconds),
            )
        )
        if commit:
            await self.refresh_sessions.commit()
        return code

    @staticmethod
    def _token_response(
        user: User,
        refresh_token: str,
        settings: Settings,
    ) -> AccessTokenResponse:
        return AccessTokenResponse(
            access_token=create_access_token(user, settings),
            refresh_token=refresh_token,
            expires_in=settings.access_token_expire_minutes * 60,
        )


class OAuthLinkService:
    def __init__(
        self,
        users: UserRepository,
        identities: OAuthIdentityRepository,
        link_intents: OAuthLinkIntentRepository,
    ) -> None:
        self.users = users
        self.identities = identities
        self.link_intents = link_intents

    async def get_sign_in_methods(self, user: User) -> SignInMethodsResponse:
        identities = await self.identities.list_by_user(user.id)
        connected: list[OAuthProvider] = []
        for identity in identities:
            if identity.provider == "google":
                connected.append("google")
            elif identity.provider == "github":
                connected.append("github")
        return SignInMethodsResponse(
            password_enabled=user.password_hash is not None,
            connected_providers=connected,
        )

    async def create_link_intent(
        self,
        user: User,
        request: OAuthLinkIntentCreateRequest,
        settings: Settings,
        *,
        now: datetime | None = None,
    ) -> OAuthLinkIntentResponse:
        if (
            await self.identities.get_by_user_provider(user.id, request.provider)
            is not None
        ):
            raise OAuthProviderAlreadyLinkedError

        created_at = now or datetime.now(UTC)
        code = create_oauth_link_intent_code()
        intent = OAuthLinkIntent(
            user_id=user.id,
            provider=request.provider,
            code_hash=hash_oauth_link_intent_code(code, settings),
            expires_at=created_at
            + timedelta(seconds=settings.oauth_link_intent_expire_seconds),
        )
        try:
            await self.link_intents.create(intent)
            await self.link_intents.commit()
        except IntegrityError:
            await self.link_intents.rollback()
            raise

        return OAuthLinkIntentResponse(
            link_intent=code,
            provider=request.provider,
            expires_at=intent.expires_at,
        )

    async def consume_link_intent(
        self,
        code: str,
        provider: OAuthProvider,
        settings: Settings,
        *,
        now: datetime | None = None,
    ) -> OAuthLinkIntent:
        consumed_at = now or datetime.now(UTC)
        intent = await self.link_intents.get_by_code_hash_for_update(
            hash_oauth_link_intent_code(code, settings)
        )
        if (
            intent is None
            or intent.consumed_at is not None
            or intent.expires_at <= consumed_at
            or intent.provider != provider
        ):
            await self.link_intents.rollback()
            raise InvalidOAuthLinkIntentError

        user = await self.users.get_by_id(intent.user_id)
        if user is None or not user.is_active:
            await self.link_intents.rollback()
            raise InvalidOAuthLinkIntentError

        intent.consumed_at = consumed_at
        await self.link_intents.commit()
        return intent

    async def link_identity(
        self,
        user_id: uuid.UUID,
        profile: OAuthProfile,
    ) -> None:
        user = await self.users.get_by_id(user_id)
        if user is None or not user.is_active:
            raise OAuthAccountUnavailableError

        subject_identity = await self.identities.get_by_provider_subject(
            profile.provider,
            profile.subject,
        )
        if subject_identity is not None:
            if subject_identity.user_id != user_id:
                raise OAuthIdentityAlreadyInUseError
            return

        provider_identity = await self.identities.get_by_user_provider(
            user_id,
            profile.provider,
        )
        if provider_identity is not None:
            if provider_identity.provider_subject != profile.subject:
                raise OAuthProviderAlreadyLinkedError
            return

        try:
            await self.identities.create(
                OAuthIdentity(
                    user_id=user_id,
                    provider=profile.provider,
                    provider_subject=profile.subject,
                )
            )
            await self.identities.commit()
        except IntegrityError as exc:
            await self.identities.rollback()
            raced_subject = await self.identities.get_by_provider_subject(
                profile.provider,
                profile.subject,
            )
            if raced_subject is not None:
                if raced_subject.user_id == user_id:
                    return
                raise OAuthIdentityAlreadyInUseError from exc

            raced_provider = await self.identities.get_by_user_provider(
                user_id,
                profile.provider,
            )
            if (
                raced_provider is not None
                and raced_provider.provider_subject == profile.subject
            ):
                return
            if raced_provider is not None:
                raise OAuthProviderAlreadyLinkedError from exc
            raise
