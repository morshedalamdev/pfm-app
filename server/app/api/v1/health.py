from typing import Annotated, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app import __version__
from app.core.config import Settings, get_settings

router = APIRouter(prefix="/health", tags=["health"])
SettingsDependency = Annotated[Settings, Depends(get_settings)]


class LiveHealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    environment: str
    version: str


@router.get("/live", response_model=LiveHealthResponse)
async def read_liveness(settings: SettingsDependency) -> LiveHealthResponse:
    return LiveHealthResponse(
        status="ok",
        service=settings.app_name,
        environment=settings.app_env,
        version=__version__,
    )
