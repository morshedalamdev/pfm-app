from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.modules.auth.dependencies import CurrentUserDependency
from app.modules.users.repositories import UserRepository
from app.modules.users.schemas import UserResponse, UserUpdateRequest

router = APIRouter(prefix="/users", tags=["users"])
SessionDependency = Annotated[AsyncSession, Depends(get_session)]


@router.get("/me", response_model=UserResponse)
async def read_current_user(current_user: CurrentUserDependency) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_current_user(
    request: UserUpdateRequest,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> UserResponse:
    repository = UserRepository(session)
    updates = request.model_dump(exclude_unset=True)
    for field_name, value in updates.items():
        setattr(current_user, field_name, value)

    try:
        await repository.commit()
    except IntegrityError as exc:
        await repository.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Profile could not be updated",
        ) from exc

    await repository.refresh(current_user)
    return UserResponse.model_validate(current_user)
