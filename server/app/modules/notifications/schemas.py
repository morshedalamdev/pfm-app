from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

EmailDeliveryStatus = Literal["not_requested", "pending", "sent", "failed"]


class NotificationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    type: str
    title: str
    message: str
    payload: dict[str, object]
    read_at: datetime | None
    email_delivery_status: EmailDeliveryStatus
    email_requested_at: datetime | None
    email_sent_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    next_cursor: str | None
    has_more: bool


class NotificationUnreadCountResponse(BaseModel):
    unread_count: int


class NotificationMarkAllReadResponse(BaseModel):
    updated_count: int
    read_at: datetime
