from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.auth.validation import normalize_email

DEFAULT_BASE_CURRENCY = "USD"


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str | None
    phone_number: str | None
    occupation: str | None
    about: str | None
    base_currency: str = DEFAULT_BASE_CURRENCY
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserUpdateRequest(BaseModel):
    email: str | None = Field(default=None, min_length=3, max_length=320)
    full_name: str | None = Field(default=None, max_length=120)
    phone_number: str | None = Field(default=None, max_length=32)
    occupation: str | None = Field(default=None, max_length=80)
    about: str | None = Field(default=None, max_length=1000)
    base_currency: str | None = Field(default=None, min_length=3, max_length=3)

    @field_validator("email")
    @classmethod
    def normalize_email_field(cls, email: str | None) -> str | None:
        if email is None:
            return None
        return normalize_email(email)

    @field_validator("full_name", "phone_number", "occupation", "about")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @field_validator("base_currency", mode="before")
    @classmethod
    def normalize_base_currency(cls, currency: object) -> object:
        if currency is None or not isinstance(currency, str):
            return currency
        normalized = currency.strip().upper()
        if not normalized.isalpha() or len(normalized) != 3:
            raise ValueError("Currency must be a 3-letter ISO code.")
        return normalized
