from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.database import get_session
from app.modules.auth.repositories import RefreshSessionRepository
from app.modules.auth.schemas import (
    AccessTokenResponse,
    LoginRequest,
    LogoutRequest,
    LogoutResponse,
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


def build_auth_service(session: AsyncSession) -> AuthService:
    return AuthService(
        users=UserRepository(session),
        refresh_sessions=RefreshSessionRepository(session),
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
