from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class RecurringRule(Base):
    __tablename__ = "recurring_rules"
    __table_args__ = (
        CheckConstraint(
            "transaction_type IN ('income', 'expense')",
            name="transaction_type_supported",
        ),
        CheckConstraint(
            "frequency IN ('daily', 'weekly', 'monthly', 'yearly')",
            name="frequency_supported",
        ),
        CheckConstraint(
            "status IN ('active', 'paused', 'archived')",
            name="status_supported",
        ),
        CheckConstraint("amount > 0", name="amount_positive"),
        CheckConstraint("interval_count > 0", name="interval_count_positive"),
        CheckConstraint("run_count >= 0", name="run_count_non_negative"),
        CheckConstraint(
            "last_paid_period IS NULL OR "
            "last_paid_period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'",
            name="last_paid_period_format",
        ),
        CheckConstraint(
            "end_at IS NULL OR end_at > start_at",
            name="end_after_start",
        ),
        CheckConstraint(
            "status <> 'paused' OR paused_at IS NOT NULL",
            name="pause_state_consistent",
        ),
        CheckConstraint(
            "status <> 'archived' OR archived_at IS NOT NULL",
            name="archive_state_consistent",
        ),
        CheckConstraint(
            "locked_until IS NULL OR locked_at IS NOT NULL",
            name="lock_state_consistent",
        ),
        UniqueConstraint("id", "user_id", name="uq_recurring_rules_id_user_id"),
        ForeignKeyConstraint(
            ["account_id", "user_id"],
            ["accounts.id", "accounts.user_id"],
            name="fk_recurring_rules_account_id_user_id_accounts",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["category_id", "user_id"],
            ["categories.id", "categories.user_id"],
            name="fk_recurring_rules_category_id_user_id_categories",
            ondelete="RESTRICT",
        ),
        Index("ix_recurring_rules_user_id_status", "user_id", "status"),
        Index("ix_recurring_rules_user_id_next_run_at", "user_id", "next_run_at"),
        Index(
            "ix_recurring_rules_due_active_next_run_at",
            "next_run_at",
            postgresql_where=text(
                "status = 'active' AND locked_until IS NULL AND archived_at IS NULL"
            ),
        ),
        Index("ix_recurring_rules_locked_until", "locked_until"),
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
    account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    category_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    transaction_type: Mapped[str] = mapped_column(String(20), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, server_default="USD"
    )
    description: Mapped[str | None] = mapped_column(Text)
    frequency: Mapped[str] = mapped_column(String(20), nullable=False)
    interval_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default="1",
    )
    timezone: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        server_default="UTC",
    )
    start_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    next_run_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_run_key: Mapped[str | None] = mapped_column(String(160))
    last_paid_period: Mapped[str | None] = mapped_column(String(7))
    run_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default="0",
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="active",
    )
    paused_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    locked_by: Mapped[str | None] = mapped_column(String(120))
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
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
