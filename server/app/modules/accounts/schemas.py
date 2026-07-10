from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.money import NonNegativeMoney

AccountType = Literal[
    "cash",
    "bank",
    "card",
    "mobile_pay",
    "wallet",
    "savings",
    "other",
]


class AccountCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    type: AccountType
    currency: str = Field(default="USD", min_length=3, max_length=3)
    opening_balance: NonNegativeMoney = Decimal("0")

    @field_validator("name")
    @classmethod
    def normalize_name(cls, name: str) -> str:
        normalized_name = name.strip()
        if not normalized_name:
            raise ValueError("Account name is required")
        return normalized_name

    @field_validator("currency", mode="before")
    @classmethod
    def normalize_currency(cls, currency: object) -> object:
        if not isinstance(currency, str):
            return currency
        normalized_currency = currency.strip().upper()
        if len(normalized_currency) != 3 or not normalized_currency.isalpha():
            raise ValueError("Currency must be a three-letter ISO code")
        return normalized_currency

    @field_validator("opening_balance", mode="before")
    @classmethod
    def reject_float_money(cls, opening_balance: object) -> object:
        if isinstance(opening_balance, float):
            raise ValueError("Money values must be decimal strings")
        return opening_balance


class AccountUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    type: AccountType | None = None
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    opening_balance: NonNegativeMoney | None = None

    @field_validator("name")
    @classmethod
    def normalize_name(cls, name: str | None) -> str | None:
        if name is None:
            return None
        normalized_name = name.strip()
        if not normalized_name:
            raise ValueError("Account name is required")
        return normalized_name

    @field_validator("currency", mode="before")
    @classmethod
    def normalize_currency(cls, currency: object) -> object:
        if currency is None:
            return None
        if not isinstance(currency, str):
            return currency
        normalized_currency = currency.strip().upper()
        if len(normalized_currency) != 3 or not normalized_currency.isalpha():
            raise ValueError("Currency must be a three-letter ISO code")
        return normalized_currency

    @field_validator("opening_balance", mode="before")
    @classmethod
    def reject_float_money(cls, opening_balance: object) -> object:
        if isinstance(opening_balance, float):
            raise ValueError("Money values must be decimal strings")
        return opening_balance


class AccountResponse(BaseModel):
    id: uuid.UUID
    name: str
    type: str
    currency: str
    opening_balance: Decimal
    is_archived: bool
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AccountListResponse(BaseModel):
    items: list[AccountResponse]
    next_cursor: str | None
    has_more: bool
