from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "PFM API"
    app_env: Literal["local", "test", "development", "staging", "production"] = "local"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])
    database_url: str = "postgresql+asyncpg://pfm_app@localhost:5432/pfm_app"
    database_echo: bool = False
    database_pool_size: int = 5
    database_max_overflow: int = 10
    access_token_secret_key: SecretStr = SecretStr(
        "local-development-access-token-secret-change-me",
    )
    access_token_algorithm: str = "HS256"
    access_token_expire_minutes: int = Field(default=15, gt=0, le=60)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
