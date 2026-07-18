from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "home_balance_source_type IS NULL OR "
            "home_balance_source_type IN ('account', 'budget')",
            name="home_balance_source_type_supported",
        ),
        CheckConstraint(
            "(home_balance_source_type IS NULL AND home_balance_source_id IS NULL) OR "
            "(home_balance_source_type IS NOT NULL AND "
            "home_balance_source_id IS NOT NULL)",
            name="home_balance_source_complete",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    full_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    occupation: Mapped[str | None] = mapped_column(String(80), nullable=True)
    about: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    base_currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="USD",
        server_default="USD",
    )
    base_currency_changed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    home_balance_source_type: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )
    home_balance_source_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="true",
    )
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
