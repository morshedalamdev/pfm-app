from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.database import get_session
from app.core.security import InvalidAccessTokenError, decode_access_token
from app.modules.users.models import User
from app.modules.users.repositories import UserRepository

bearer_scheme = HTTPBearer(auto_error=False)
SessionDependency = Annotated[AsyncSession, Depends(get_session)]
SettingsDependency = Annotated[Settings, Depends(get_settings)]
BearerCredentialsDependency = Annotated[
    HTTPAuthorizationCredentials | None,
    Depends(bearer_scheme),
]


def invalid_token_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(
    credentials: BearerCredentialsDependency,
    session: SessionDependency,
    settings: SettingsDependency,
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise invalid_token_error()

    try:
        claims = decode_access_token(credentials.credentials, settings)
    except InvalidAccessTokenError as exc:
        raise invalid_token_error() from exc

    user = await UserRepository(session).get_by_id(claims.subject)
    if user is None or not user.is_active:
        raise invalid_token_error()

    return user


CurrentUserDependency = Annotated[User, Depends(get_current_user)]
