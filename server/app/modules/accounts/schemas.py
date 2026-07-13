from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.money import NonNegativeMoney

AccountType = Literal[
    "cash",
    "debit_card",
    "credit_card",
    "bank_account",
    "mobile_banking",
]

LEGACY_ACCOUNT_TYPE_ALIASES: dict[str, AccountType] = {
    "bank": "bank_account",
    "card": "debit_card",
    "mobile_pay": "mobile_banking",
    "savings": "bank_account",
    "wallet": "mobile_banking",
}


def normalize_account_type(account_type: object) -> object:
    if not isinstance(account_type, str):
        return account_type
    normalized_type = account_type.strip().lower()
    return LEGACY_ACCOUNT_TYPE_ALIASES.get(normalized_type, normalized_type)


class AccountCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    type: AccountType
    currency: str = Field(default="USD", min_length=3, max_length=3)
    opening_balance: NonNegativeMoney = Decimal("0")

    @field_validator("type", mode="before")
    @classmethod
    def normalize_type(cls, account_type: object) -> object:
        return normalize_account_type(account_type)

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

    @field_validator("type", mode="before")
    @classmethod
    def normalize_type(cls, account_type: object) -> object:
        if account_type is None:
            return None
        return normalize_account_type(account_type)

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
    current_balance: Decimal
    is_archived: bool
    archived_at: datetime | None
    is_disabled: bool
    disabled_at: datetime | None
    is_default: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AccountListResponse(BaseModel):
    items: list[AccountResponse]
    next_cursor: str | None
    has_more: bool


AccountDeleteBlockReason = Literal[
    "transaction",
    "recurring_rule",
    "loan_record",
    "loan_settlement",
]


class AccountDeleteEligibilityResponse(BaseModel):
    account_id: uuid.UUID
    can_delete: bool
    reasons: list[AccountDeleteBlockReason]
