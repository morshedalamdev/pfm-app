from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app import __version__
from app.core.config import Settings, get_settings
from app.core.database import check_database_connection

router = APIRouter(prefix="/health", tags=["health"])
SettingsDependency = Annotated[Settings, Depends(get_settings)]


async def database_is_ready() -> bool:
    return await check_database_connection()


DatabaseReadyDependency = Annotated[bool, Depends(database_is_ready)]


class LiveHealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    environment: str
    version: str


class ReadyHealthResponse(BaseModel):
    status: Literal["ok"]
    database: Literal["ready"]


@router.get("/live", response_model=LiveHealthResponse)
async def read_liveness(settings: SettingsDependency) -> LiveHealthResponse:
    return LiveHealthResponse(
        status="ok",
        service=settings.app_name,
        environment=settings.app_env,
        version=__version__,
    )


@router.get("/ready", response_model=ReadyHealthResponse)
async def read_readiness(
    database_ready: DatabaseReadyDependency,
) -> ReadyHealthResponse:
    if not database_ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is not ready",
        )

    return ReadyHealthResponse(status="ok", database="ready")
