from fastapi import APIRouter

from app.modules.auth.dependencies import CurrentUserDependency
from app.modules.users.schemas import UserResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def read_current_user(current_user: CurrentUserDependency) -> UserResponse:
    return UserResponse.model_validate(current_user)
