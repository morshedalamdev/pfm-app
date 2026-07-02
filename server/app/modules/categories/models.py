from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (
        CheckConstraint("kind IN ('income', 'expense')", name="kind_supported"),
        UniqueConstraint("id", "user_id", name="uq_categories_id_user_id"),
        UniqueConstraint(
            "user_id", "kind", "name", name="uq_categories_user_kind_name"
        ),
        Index("ix_categories_user_id", "user_id"),
        Index("ix_categories_user_id_kind", "user_id", "kind"),
        Index("ix_categories_user_id_archived_at", "user_id", "archived_at"),
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
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    icon_key: Mapped[str] = mapped_column(String(80), nullable=False)
    is_default: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
    )
    is_archived: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
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
