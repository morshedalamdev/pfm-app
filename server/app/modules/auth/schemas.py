from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.auth.validation import normalize_email, validate_password_strength


class RegisterUserRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email_field(cls, email: str) -> str:
        return normalize_email(email)

    @field_validator("password")
    @classmethod
    def validate_password_field(cls, password: str) -> str:
        return validate_password_strength(password)


class RegisteredUserResponse(BaseModel):
    id: uuid.UUID
    email: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
