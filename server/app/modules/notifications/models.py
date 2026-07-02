from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        CheckConstraint(
            "email_delivery_status IN ('not_requested', 'pending', 'sent', 'failed')",
            name="email_delivery_status_supported",
        ),
        CheckConstraint(
            "read_at IS NULL OR read_at >= created_at",
            name="read_at_not_before_created_at",
        ),
        CheckConstraint(
            "email_sent_at IS NULL OR email_requested_at IS NOT NULL",
            name="email_sent_requires_request",
        ),
        Index("ix_notifications_user_id_created_at", "user_id", "created_at"),
        Index(
            "ix_notifications_unread_user_created_at",
            "user_id",
            "created_at",
            postgresql_where=text("read_at IS NULL"),
        ),
        Index("ix_notifications_user_id_type", "user_id", "type"),
        Index("ix_notifications_email_delivery_status", "email_delivery_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    type: Mapped[str] = mapped_column(String(80), nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    payload: Mapped[dict[str, object]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    email_delivery_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="not_requested",
    )
    email_requested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    email_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    email_adapter: Mapped[str | None] = mapped_column(String(40))
    email_provider_message_id: Mapped[str | None] = mapped_column(String(255))
    email_error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
