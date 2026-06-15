from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.modules.auth.repositories import RefreshSessionRepository
from app.modules.auth.schemas import RegisteredUserResponse, RegisterUserRequest
from app.modules.auth.services import AuthService, DuplicateRegistrationError
from app.modules.users.repositories import UserRepository

router = APIRouter(prefix="/auth", tags=["auth"])
SessionDependency = Annotated[AsyncSession, Depends(get_session)]


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
