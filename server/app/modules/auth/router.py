from typing import Annotated
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import RedirectResponse, Response

from app.core.config import Settings, get_settings
from app.core.database import get_session
from app.modules.auth.oauth import (
    InvalidOAuthRegistrationTicketError,
    OAuthCallbackError,
    OAuthGateway,
    OAuthProviderNotConfiguredError,
    create_oauth_registration_ticket,
    decode_oauth_registration_ticket,
    get_oauth_gateway,
)
from app.modules.auth.repositories import RefreshSessionRepository
from app.modules.auth.schemas import (
    AccessTokenResponse,
    LoginRequest,
    LogoutRequest,
    LogoutResponse,
    OAuthProvider,
    OAuthRegistrationPreviewResponse,
    OAuthRegistrationTicketRequest,
    RefreshTokenRequest,
    RegisteredUserResponse,
    RegisterUserRequest,
)
from app.modules.auth.services import (
    AuthService,
    DuplicateRegistrationError,
    InvalidCredentialsError,
    InvalidRefreshTokenError,
)
from app.modules.users.repositories import UserRepository

router = APIRouter(prefix="/auth", tags=["auth"])
SessionDependency = Annotated[AsyncSession, Depends(get_session)]
SettingsDependency = Annotated[Settings, Depends(get_settings)]
OAuthGatewayDependency = Annotated[OAuthGateway, Depends(get_oauth_gateway)]


def build_auth_service(session: AsyncSession) -> AuthService:
    return AuthService(
        users=UserRepository(session),
        refresh_sessions=RefreshSessionRepository(session),
    )


@router.get("/oauth/{provider}/start")
async def start_oauth(
    provider: OAuthProvider,
    request: Request,
    settings: SettingsDependency,
    gateway: OAuthGatewayDependency,
) -> Response:
    redirect_uri = (
        f"{settings.oauth_public_api_url}{settings.api_v1_prefix}"
        f"/auth/oauth/{provider}/callback"
    )
    try:
        return await gateway.begin(request, provider, redirect_uri)
    except OAuthProviderNotConfiguredError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OAuth provider is not configured",
        ) from exc
    except OAuthCallbackError as exc:
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
) -> RedirectResponse:
    try:
        profile = await gateway.complete(request, provider)
    except OAuthProviderNotConfiguredError:
        return oauth_callback_error_redirect(settings, provider, "not_configured")
    except OAuthCallbackError:
        return oauth_callback_error_redirect(settings, provider, "callback_failed")

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
