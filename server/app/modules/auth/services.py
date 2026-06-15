from __future__ import annotations

from sqlalchemy.exc import IntegrityError

from app.core.config import Settings
from app.core.security import create_access_token, hash_password, verify_password
from app.modules.auth.repositories import RefreshSessionRepository
from app.modules.auth.schemas import (
    AccessTokenResponse,
    LoginRequest,
    RegisterUserRequest,
)
from app.modules.users.models import User
from app.modules.users.repositories import UserRepository


class DuplicateRegistrationError(Exception):
    pass


class InvalidCredentialsError(Exception):
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
        if not verify_password(request.password, user.password_hash):
            raise InvalidCredentialsError
        if not user.is_active:
            raise InvalidCredentialsError

        access_token = create_access_token(user, settings)
        return AccessTokenResponse(
            access_token=access_token,
            expires_in=settings.access_token_expire_minutes * 60,
        )
