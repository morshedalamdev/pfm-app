from functools import lru_cache
from typing import Literal
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import (
    Field,
    SecretStr,
    ValidationInfo,
    field_validator,
    model_validator,
)
from pydantic_settings import BaseSettings, SettingsConfigDict

LOCAL_ACCESS_TOKEN_SECRET = "local-development-access-token-secret-change-me"
LOCAL_REFRESH_TOKEN_SECRET = "local-development-refresh-token-secret-change-me"


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
    migration_database_url: str | None = None
    database_echo: bool = False
    database_pool_size: int = 5
    database_max_overflow: int = 10
    access_token_secret_key: SecretStr = SecretStr(LOCAL_ACCESS_TOKEN_SECRET)
    access_token_algorithm: str = "HS256"
    access_token_expire_minutes: int = Field(default=15, gt=0, le=60)
    refresh_token_secret_key: SecretStr = SecretStr(LOCAL_REFRESH_TOKEN_SECRET)
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

    @field_validator("database_url", "migration_database_url", mode="before")
    @classmethod
    def normalize_postgres_url(
        cls,
        value: object,
        info: ValidationInfo,
    ) -> object:
        if value is None or not isinstance(value, str):
            return value
        if not value.strip():
            if info.field_name == "migration_database_url":
                return None
            raise ValueError("DATABASE_URL must not be empty")

        parsed = urlsplit(value)
        if parsed.scheme in {"postgres", "postgresql"}:
            scheme = "postgresql+asyncpg"
        elif parsed.scheme == "postgresql+asyncpg":
            scheme = parsed.scheme
        else:
            raise ValueError("PostgreSQL URLs must use the asyncpg driver")

        query: list[tuple[str, str]] = []
        for key, query_value in parse_qsl(parsed.query, keep_blank_values=True):
            if key == "channel_binding":
                continue
            if key == "sslmode":
                key = "ssl"
            query.append((key, query_value))

        return urlunsplit(
            (
                scheme,
                parsed.netloc,
                parsed.path,
                urlencode(query),
                parsed.fragment,
            )
        )

    @model_validator(mode="after")
    def validate_production_safety(self) -> "Settings":
        if self.app_env != "production":
            return self

        if self.debug:
            raise ValueError("DEBUG must be false in production")

        secrets = {
            "ACCESS_TOKEN_SECRET_KEY": (
                self.access_token_secret_key.get_secret_value(),
                LOCAL_ACCESS_TOKEN_SECRET,
            ),
            "REFRESH_TOKEN_SECRET_KEY": (
                self.refresh_token_secret_key.get_secret_value(),
                LOCAL_REFRESH_TOKEN_SECRET,
            ),
        }
        for name, (value, local_default) in secrets.items():
            if value == local_default or len(value) < 32:
                raise ValueError(f"{name} must be a unique secret of at least 32 chars")

        if not self.cors_origins or any(
            not origin.startswith("https://") for origin in self.cors_origins
        ):
            raise ValueError(
                "CORS_ORIGINS must contain explicit HTTPS origins in production"
            )

        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
