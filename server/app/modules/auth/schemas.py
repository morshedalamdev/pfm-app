from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.auth.validation import (
    normalize_email,
    validate_password_strength,
)

OAuthProvider = Literal["google", "github"]


class RegisterUserRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=128)
    full_name: str | None = Field(default=None, max_length=120)
    phone_number: str | None = Field(default=None, max_length=32)
    occupation: str | None = Field(default=None, max_length=80)

    @field_validator("email")
    @classmethod
    def normalize_email_field(cls, email: str) -> str:
        return normalize_email(email)

    @field_validator("password")
    @classmethod
    def validate_password_field(cls, password: str) -> str:
        return validate_password_strength(password)

    @field_validator("full_name", "phone_number", "occupation")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email_field(cls, email: str) -> str:
        return normalize_email(email)


class AccessTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(min_length=32, max_length=512)


class LogoutRequest(BaseModel):
    refresh_token: str = Field(min_length=32, max_length=512)


class LogoutResponse(BaseModel):
    status: Literal["ok"]


class OAuthRegistrationTicketRequest(BaseModel):
    registration_ticket: str = Field(min_length=64, max_length=8192)


class OAuthRegistrationPreviewResponse(BaseModel):
    provider: OAuthProvider
    email: str
    full_name: str


class RegisteredUserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str | None
    phone_number: str | None
    occupation: str | None
    base_currency: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
