from __future__ import annotations

import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

TransactionType = Literal["income", "expense"]
TransactionFilterType = Literal[
    "income",
    "expense",
    "transfer_debit",
    "transfer_credit",
]


class TransactionCreateRequest(BaseModel):
    account_id: uuid.UUID
    category_id: uuid.UUID
    type: TransactionType
    amount: Decimal = Field(
        gt=Decimal("0"),
        max_digits=18,
        decimal_places=4,
    )
    transaction_at: datetime
    description: str | None = Field(default=None, max_length=500)

    @field_validator("amount", mode="before")
    @classmethod
    def reject_float_money(cls, amount: object) -> object:
        if isinstance(amount, float):
            raise ValueError("Money values must be decimal strings")
        return amount

    @field_validator("transaction_at")
    @classmethod
    def normalize_transaction_at(cls, transaction_at: datetime) -> datetime:
        if transaction_at.tzinfo is None:
            raise ValueError("Transaction date must include timezone information")
        return transaction_at.astimezone(UTC)

    @field_validator("description")
    @classmethod
    def normalize_description(cls, description: str | None) -> str | None:
        if description is None:
            return None
        normalized_description = description.strip()
        return normalized_description or None


class TransactionUpdateRequest(BaseModel):
    account_id: uuid.UUID | None = None
    category_id: uuid.UUID | None = None
    amount: Decimal | None = Field(
        default=None,
        gt=Decimal("0"),
        max_digits=18,
        decimal_places=4,
    )
    transaction_at: datetime | None = None
    description: str | None = Field(default=None, max_length=500)

    @field_validator("amount", mode="before")
    @classmethod
    def reject_float_money(cls, amount: object) -> object:
        if isinstance(amount, float):
            raise ValueError("Money values must be decimal strings")
        return amount

    @field_validator("transaction_at")
    @classmethod
    def normalize_transaction_at(
        cls, transaction_at: datetime | None
    ) -> datetime | None:
        if transaction_at is None:
            return None
        if transaction_at.tzinfo is None:
            raise ValueError("Transaction date must include timezone information")
        return transaction_at.astimezone(UTC)

    @field_validator("description")
    @classmethod
    def normalize_description(cls, description: str | None) -> str | None:
        if description is None:
            return None
        normalized_description = description.strip()
        return normalized_description or None


class TransactionResponse(BaseModel):
    id: uuid.UUID
    account_id: uuid.UUID
    category_id: uuid.UUID | None
    type: str
    amount: Decimal
    currency: str
    transaction_at: datetime
    description: str | None
    voided_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TransactionListResponse(BaseModel):
    items: list[TransactionResponse]
    next_cursor: str | None = None
    has_more: bool = False


class TransferCreateRequest(BaseModel):
    from_account_id: uuid.UUID
    to_account_id: uuid.UUID
    amount: Decimal = Field(
        gt=Decimal("0"),
        max_digits=18,
        decimal_places=4,
    )
    transaction_at: datetime
    description: str | None = Field(default=None, max_length=500)

    @field_validator("amount", mode="before")
    @classmethod
    def reject_float_money(cls, amount: object) -> object:
        if isinstance(amount, float):
            raise ValueError("Money values must be decimal strings")
        return amount

    @field_validator("transaction_at")
    @classmethod
    def normalize_transaction_at(cls, transaction_at: datetime) -> datetime:
        if transaction_at.tzinfo is None:
            raise ValueError("Transfer date must include timezone information")
        return transaction_at.astimezone(UTC)

    @field_validator("description")
    @classmethod
    def normalize_description(cls, description: str | None) -> str | None:
        if description is None:
            return None
        normalized_description = description.strip()
        return normalized_description or None


class TransferResponse(BaseModel):
    id: uuid.UUID
    from_account_id: uuid.UUID
    to_account_id: uuid.UUID
    debit_transaction_id: uuid.UUID
    credit_transaction_id: uuid.UUID
    amount: Decimal
    currency: str
    transaction_at: datetime
    description: str | None
    created_at: datetime
