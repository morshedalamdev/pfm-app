from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "PFM API"
    app_env: Literal["local", "test", "development", "staging", "production"] = "local"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
    )
    database_url: str = "postgresql+asyncpg://pfm_app@localhost:5432/pfm_app"
    database_echo: bool = False
    database_pool_size: int = 5
    database_max_overflow: int = 10
    access_token_secret_key: SecretStr = SecretStr(
        "local-development-access-token-secret-change-me",
    )
    access_token_algorithm: str = "HS256"
    access_token_expire_minutes: int = Field(default=15, gt=0, le=60)
    refresh_token_secret_key: SecretStr = SecretStr(
        "local-development-refresh-token-secret-change-me",
    )
    refresh_token_expire_days: int = Field(default=30, gt=0, le=365)
    recurring_worker_batch_size: int = Field(default=25, gt=0, le=1000)
    recurring_worker_lock_seconds: int = Field(default=60, gt=0, le=3600)
    recurring_worker_poll_seconds: float = Field(default=30.0, gt=0, le=3600)
    outbox_worker_batch_size: int = Field(default=25, gt=0, le=1000)
    outbox_worker_lock_seconds: int = Field(default=60, gt=0, le=3600)
    outbox_worker_max_backoff_seconds: int = Field(default=300, gt=0, le=86400)
    outbox_worker_poll_seconds: float = Field(default=30.0, gt=0, le=3600)
    storage_backend: Literal["local"] = "local"
    local_storage_root: str = ".local/storage"
    email_backend: Literal["console", "local"] = "console"
    email_from_address: str = "no-reply@localhost"
    receipt_max_upload_bytes: int = Field(default=5 * 1024 * 1024, gt=0)
    receipt_allowed_content_types: list[str] = Field(
        default_factory=lambda: [
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/webp",
        ]
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
