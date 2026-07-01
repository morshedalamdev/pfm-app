from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ReceiptResponse(BaseModel):
    id: uuid.UUID
    transaction_id: uuid.UUID | None
    original_filename: str
    content_type: str
    size_bytes: int
    checksum_sha256: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReceiptListResponse(BaseModel):
    items: list[ReceiptResponse]
    next_cursor: str | None
    has_more: bool
