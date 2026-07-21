import secrets
import uuid
from dataclasses import dataclass
from typing import Annotated
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import RedirectResponse, Response

from app.core.config import Settings, get_settings
from app.core.database import get_session
from app.modules.auth.dependencies import CurrentUserDependency
from app.modules.auth.oauth import (
    InvalidOAuthRegistrationTicketError,
    OAuthCallbackError,
    OAuthGateway,
    OAuthProfile,
    OAuthProviderNotConfiguredError,
    create_oauth_registration_ticket,
    decode_oauth_registration_ticket,
    get_oauth_gateway,
)
from app.modules.auth.repositories import (
    OAuthIdentityRepository,
    OAuthLinkIntentRepository,
    OAuthLoginExchangeRepository,
    RefreshSessionRepository,
)
from app.modules.auth.schemas import (
    AccessTokenResponse,
    EmailAuthRouteRequest,
    EmailAuthRouteResponse,
    LoginRequest,
    LogoutRequest,
    LogoutResponse,
    OAuthLinkIntentCreateRequest,
    OAuthLinkIntentResponse,
    OAuthLoginExchangeRequest,
    OAuthProvider,
    OAuthRegisterRequest,
    OAuthRegistrationPreviewResponse,
    OAuthRegistrationTicketRequest,
    PasswordUpdateRequest,
    PasswordUpdateResponse,
    RefreshTokenRequest,
    RegisteredUserResponse,
    RegisterUserRequest,
    SignInMethodsResponse,
)
from app.modules.auth.services import (
    AuthService,
    DuplicateRegistrationError,
    InvalidCredentialsError,
    InvalidCurrentPasswordError,
    InvalidOAuthLinkIntentError,
    InvalidOAuthLoginExchangeError,
    InvalidRefreshTokenError,
    OAuthAccountUnavailableError,
    OAuthAuthService,
    OAuthIdentityAlreadyInUseError,
    OAuthLinkRequiredError,
    OAuthLinkService,
    OAuthProviderAlreadyLinkedError,
    OAuthRegistrationConflictError,
    PasswordReuseError,
)
from app.modules.users.repositories import UserRepository

router = APIRouter(prefix="/auth", tags=["auth"])
SessionDependency = Annotated[AsyncSession, Depends(get_session)]
SettingsDependency = Annotated[Settings, Depends(get_settings)]
OAuthGatewayDependency = Annotated[OAuthGateway, Depends(get_oauth_gateway)]
OAuthLinkIntentQuery = Annotated[
    str | None,
    Query(min_length=32, max_length=512),
]
OAUTH_LINK_FLOW_PREFIX = "pfm_oauth_link_flow_"
OAUTH_LINK_STATE_PREFIX = "pfm-link-"


@dataclass(frozen=True)
class OAuthLinkFlow:
    user_id: uuid.UUID
    provider: OAuthProvider


def build_auth_service(session: AsyncSession) -> AuthService:
    return AuthService(
        users=UserRepository(session),
        refresh_sessions=RefreshSessionRepository(session),
    )


def build_oauth_auth_service(session: AsyncSession) -> OAuthAuthService:
    return OAuthAuthService(
        users=UserRepository(session),
        refresh_sessions=RefreshSessionRepository(session),
        identities=OAuthIdentityRepository(session),
        login_exchanges=OAuthLoginExchangeRepository(session),
    )


def build_oauth_link_service(session: AsyncSession) -> OAuthLinkService:
    return OAuthLinkService(
        users=UserRepository(session),
        identities=OAuthIdentityRepository(session),
        link_intents=OAuthLinkIntentRepository(session),
    )


@router.get("/methods", response_model=SignInMethodsResponse)
async def read_sign_in_methods(
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> SignInMethodsResponse:
    return await build_oauth_link_service(session).get_sign_in_methods(current_user)


@router.post(
    "/oauth/link-intents",
    response_model=OAuthLinkIntentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_oauth_link_intent(
    request: OAuthLinkIntentCreateRequest,
    current_user: CurrentUserDependency,
    session: SessionDependency,
    settings: SettingsDependency,
) -> OAuthLinkIntentResponse:
    try:
        return await build_oauth_link_service(session).create_link_intent(
            current_user,
            request,
            settings,
        )
    except OAuthProviderAlreadyLinkedError as exc:
        provider_label = "Google" if request.provider == "google" else "GitHub"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"{provider_label} is already connected",
        ) from exc


@router.post("/email-route", response_model=EmailAuthRouteResponse)
async def route_email_auth(
    request: EmailAuthRouteRequest,
    session: SessionDependency,
) -> EmailAuthRouteResponse:
    user = await UserRepository(session).get_by_email(request.email)
    return EmailAuthRouteResponse(
        destination="login" if user is not None else "register"
    )


@router.put("/password", response_model=PasswordUpdateResponse)
async def update_password(
    request: PasswordUpdateRequest,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> PasswordUpdateResponse:
    try:
        return await build_auth_service(session).update_password(current_user, request)
    except InvalidCurrentPasswordError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        ) from exc
    except PasswordReuseError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from the current password",
        ) from exc


@router.get("/oauth/{provider}/start")
async def start_oauth(
    provider: OAuthProvider,
    request: Request,
    settings: SettingsDependency,
    gateway: OAuthGatewayDependency,
    session: SessionDependency,
    link_intent: OAuthLinkIntentQuery = None,
) -> Response:
    redirect_uri = (
        f"{settings.oauth_public_api_url}{settings.api_v1_prefix}"
        f"/auth/oauth/{provider}/callback"
    )
    state = secrets.token_urlsafe(32)
    link_flow: OAuthLinkFlow | None = None
    if link_intent is not None:
        try:
            intent = await build_oauth_link_service(session).consume_link_intent(
                link_intent,
                provider,
                settings,
            )
        except InvalidOAuthLinkIntentError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OAuth account connection session is invalid or expired",
            ) from exc
        state = f"{OAUTH_LINK_STATE_PREFIX}{state}"
        link_flow = OAuthLinkFlow(user_id=intent.user_id, provider=provider)
        store_oauth_link_flow(request, state, link_flow)

    try:
        return await gateway.begin(
            request,
            provider,
            redirect_uri,
            state=state,
        )
    except OAuthProviderNotConfiguredError as exc:
        if link_flow is not None:
            clear_oauth_link_flow(request, state, provider)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OAuth provider is not configured",
        ) from exc
    except OAuthCallbackError as exc:
        if link_flow is not None:
            clear_oauth_link_flow(request, state, provider)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OAuth authentication could not be started",
        ) from exc


@router.get("/oauth/{provider}/callback")
async def complete_oauth(
    provider: OAuthProvider,
    request: Request,
    settings: SettingsDependency,
    gateway: OAuthGatewayDependency,
    session: SessionDependency,
) -> RedirectResponse:
    try:
        link_flow = pop_oauth_link_flow(request, provider)
    except ValueError:
        state = request.query_params.get("state")
        if state is not None and state.startswith(OAUTH_LINK_STATE_PREFIX):
            return oauth_link_result_redirect(
                settings,
                provider,
                "callback_failed",
            )
        return oauth_callback_error_redirect(settings, provider, "callback_failed")

    try:
        profile = await gateway.complete(request, provider)
    except OAuthProviderNotConfiguredError:
        if link_flow is not None:
            return oauth_link_result_redirect(
                settings,
                provider,
                "callback_failed",
            )
        return oauth_callback_error_redirect(settings, provider, "not_configured")
    except OAuthCallbackError:
        if link_flow is not None:
            return oauth_link_result_redirect(
                settings,
                provider,
                "callback_failed",
            )
        return oauth_callback_error_redirect(settings, provider, "callback_failed")

    if profile.provider != provider:
        if link_flow is not None:
            return oauth_link_result_redirect(
                settings,
                provider,
                "callback_failed",
            )
        return oauth_callback_error_redirect(settings, provider, "callback_failed")

    if link_flow is not None:
        link_service = build_oauth_link_service(session)
        try:
            await link_service.link_identity(link_flow.user_id, profile)
        except OAuthIdentityAlreadyInUseError:
            return oauth_link_result_redirect(settings, provider, "provider_in_use")
        except OAuthProviderAlreadyLinkedError:
            return oauth_link_result_redirect(settings, provider, "already_linked")
        except (OAuthAccountUnavailableError, SQLAlchemyError):
            return oauth_link_result_redirect(settings, provider, "callback_failed")
        return oauth_link_result_redirect(settings, provider, "connected")

    login_service = build_oauth_auth_service(session)
    try:
        exchange_code = await login_service.resolve_callback(profile, settings)
    except OAuthLinkRequiredError:
        return oauth_callback_error_redirect(settings, provider, "link_required")
    except (OAuthAccountUnavailableError, SQLAlchemyError):
        return oauth_callback_error_redirect(settings, provider, "callback_failed")

    if exchange_code is not None:
        fragment = urlencode({"exchange_code": exchange_code})
        return RedirectResponse(
            url=f"{settings.frontend_base_url}/auth/oauth/callback#{fragment}",
            status_code=status.HTTP_303_SEE_OTHER,
        )

    registration_ticket = create_oauth_registration_ticket(profile, settings)
    fragment = urlencode({"registration_ticket": registration_ticket})
    return RedirectResponse(
        url=f"{settings.frontend_base_url}/auth/oauth/callback#{fragment}",
        status_code=status.HTTP_303_SEE_OTHER,
    )


@router.post(
    "/oauth/registration-preview",
    response_model=OAuthRegistrationPreviewResponse,
)
async def preview_oauth_registration(
    request: OAuthRegistrationTicketRequest,
    settings: SettingsDependency,
) -> OAuthRegistrationPreviewResponse:
    try:
        claims = decode_oauth_registration_ticket(
            request.registration_ticket,
            settings,
        )
    except InvalidOAuthRegistrationTicketError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OAuth registration session is invalid or expired",
        ) from exc
    return OAuthRegistrationPreviewResponse(
        provider=claims.provider,
        email=claims.email,
        full_name=claims.full_name,
    )


@router.post(
    "/oauth/register",
    response_model=AccessTokenResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_oauth_user(
    request: OAuthRegisterRequest,
    session: SessionDependency,
    settings: SettingsDependency,
) -> AccessTokenResponse:
    try:
        claims = decode_oauth_registration_ticket(
            request.registration_ticket,
            settings,
        )
    except InvalidOAuthRegistrationTicketError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OAuth registration session is invalid or expired",
        ) from exc

    service = build_oauth_auth_service(session)
    try:
        return await service.register_oauth_user(
            OAuthProfile(
                provider=claims.provider,
                subject=claims.subject,
                email=claims.email,
                full_name=claims.full_name,
            ),
            request,
            settings,
        )
    except OAuthRegistrationConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="OAuth registration could not be completed",
        ) from exc


@router.post("/oauth/exchange", response_model=AccessTokenResponse)
async def exchange_oauth_login_code(
    request: OAuthLoginExchangeRequest,
    session: SessionDependency,
    settings: SettingsDependency,
) -> AccessTokenResponse:
    service = build_oauth_auth_service(session)
    try:
        return await service.exchange_login_code(request, settings)
    except InvalidOAuthLoginExchangeError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired OAuth login exchange",
        ) from exc


def oauth_callback_error_redirect(
    settings: Settings,
    provider: OAuthProvider,
    error: str,
) -> RedirectResponse:
    query = urlencode({"provider": provider, "error": error})
    return RedirectResponse(
        url=f"{settings.frontend_base_url}/auth/oauth/callback?{query}",
        status_code=status.HTTP_303_SEE_OTHER,
    )


def oauth_link_result_redirect(
    settings: Settings,
    provider: OAuthProvider,
    result: str,
) -> RedirectResponse:
    query = urlencode({"provider": provider, "oauth_link": result})
    return RedirectResponse(
        url=f"{settings.frontend_base_url}/settings/security?{query}",
        status_code=status.HTTP_303_SEE_OTHER,
    )


def oauth_link_flow_key(state: str, provider: OAuthProvider) -> str:
    return f"{OAUTH_LINK_FLOW_PREFIX}{provider}_{state}"


def store_oauth_link_flow(
    request: Request,
    state: str,
    flow: OAuthLinkFlow,
) -> None:
    provider_prefix = f"{OAUTH_LINK_FLOW_PREFIX}{flow.provider}_"
    for key in list(request.session):
        if key.startswith(provider_prefix):
            request.session.pop(key, None)
    request.session[oauth_link_flow_key(state, flow.provider)] = {
        "provider": flow.provider,
        "user_id": str(flow.user_id),
    }


def clear_oauth_link_flow(
    request: Request,
    state: str,
    provider: OAuthProvider,
) -> None:
    request.session.pop(oauth_link_flow_key(state, provider), None)


def pop_oauth_link_flow(
    request: Request,
    provider: OAuthProvider,
) -> OAuthLinkFlow | None:
    state = request.query_params.get("state")
    if state is None:
        return None
    raw_flow = request.session.pop(oauth_link_flow_key(state, provider), None)
    if raw_flow is None:
        if state.startswith(OAUTH_LINK_STATE_PREFIX):
            raise ValueError("Invalid OAuth link flow")
        return None
    if not isinstance(raw_flow, dict) or raw_flow.get("provider") != provider:
        raise ValueError("Invalid OAuth link flow")
    raw_user_id = raw_flow.get("user_id")
    if not isinstance(raw_user_id, str):
        raise ValueError("Invalid OAuth link flow")
    try:
        user_id = uuid.UUID(raw_user_id)
    except ValueError as exc:
        raise ValueError("Invalid OAuth link flow") from exc
    return OAuthLinkFlow(user_id=user_id, provider=provider)


@router.post(
    "/register",
    response_model=RegisteredUserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_user(
    request: RegisterUserRequest,
    session: SessionDependency,
) -> RegisteredUserResponse:
    service = build_auth_service(session)
    try:
        user = await service.register_user(request)
    except DuplicateRegistrationError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Registration could not be completed",
        ) from exc

    return RegisteredUserResponse.model_validate(user)


@router.post("/login", response_model=AccessTokenResponse)
async def login_user(
    request: LoginRequest,
    session: SessionDependency,
    settings: SettingsDependency,
) -> AccessTokenResponse:
    service = build_auth_service(session)
    try:
        return await service.login_user(request, settings)
    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh_tokens(
    request: RefreshTokenRequest,
    session: SessionDependency,
    settings: SettingsDependency,
) -> AccessTokenResponse:
    service = build_auth_service(session)
    try:
        return await service.refresh_tokens(request, settings)
    except InvalidRefreshTokenError as exc:
        raise invalid_refresh_token_http_error() from exc


@router.post("/logout", response_model=LogoutResponse)
async def logout_user(
    request: LogoutRequest,
    session: SessionDependency,
    settings: SettingsDependency,
) -> LogoutResponse:
    service = build_auth_service(session)
    await service.logout_user(
        RefreshTokenRequest(refresh_token=request.refresh_token),
        settings,
    )
    return LogoutResponse(status="ok")


def invalid_refresh_token_http_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid refresh token",
    )
