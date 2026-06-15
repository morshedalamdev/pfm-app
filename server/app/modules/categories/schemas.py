from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

CategoryKind = Literal["income", "expense"]


class CategoryCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    kind: CategoryKind
    icon_key: str = Field(min_length=1, max_length=80)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, name: str) -> str:
        normalized_name = name.strip()
        if not normalized_name:
            raise ValueError("Category name is required")
        return normalized_name

    @field_validator("icon_key")
    @classmethod
    def normalize_icon_key(cls, icon_key: str) -> str:
        normalized_icon_key = icon_key.strip()
        if not normalized_icon_key:
            raise ValueError("Category icon key is required")
        return normalized_icon_key


class CategoryUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    kind: CategoryKind | None = None
    icon_key: str | None = Field(default=None, min_length=1, max_length=80)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, name: str | None) -> str | None:
        if name is None:
            return None
        normalized_name = name.strip()
        if not normalized_name:
            raise ValueError("Category name is required")
        return normalized_name

    @field_validator("icon_key")
    @classmethod
    def normalize_icon_key(cls, icon_key: str | None) -> str | None:
        if icon_key is None:
            return None
        normalized_icon_key = icon_key.strip()
        if not normalized_icon_key:
            raise ValueError("Category icon key is required")
        return normalized_icon_key


class CategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    kind: str
    icon_key: str
    is_default: bool
    is_archived: bool
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CategoryListResponse(BaseModel):
    items: list[CategoryResponse]
    next_cursor: str | None
    has_more: bool
