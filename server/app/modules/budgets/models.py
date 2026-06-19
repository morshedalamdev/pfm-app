from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Numeric,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID, ExcludeConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Budget(Base):
    __tablename__ = "budgets"
    __table_args__ = (
        CheckConstraint(
            "period_type IN ('monthly', 'custom')",
            name="period_type_supported",
        ),
        CheckConstraint("period_start < period_end", name="period_dates_ordered"),
        CheckConstraint("limit_amount > 0", name="limit_amount_positive"),
        CheckConstraint(
            "period_type <> 'monthly' OR "
            "(EXTRACT(DAY FROM period_start) = 1 "
            "AND period_end = (period_start + INTERVAL '1 month')::date)",
            name="monthly_period_matches_calendar_month",
        ),
        CheckConstraint(
            "(is_archived = false AND archived_at IS NULL) OR "
            "(is_archived = true AND archived_at IS NOT NULL)",
            name="archive_state_consistent",
        ),
        UniqueConstraint("id", "user_id", name="uq_budgets_id_user_id"),
        ForeignKeyConstraint(
            ["category_id", "user_id"],
            ["categories.id", "categories.user_id"],
            name="fk_budgets_category_id_user_id_categories",
            ondelete="RESTRICT",
        ),
        ExcludeConstraint(
            ("user_id", "="),
            (
                text(
                    "COALESCE("
                    "category_id, "
                    "'00000000-0000-0000-0000-000000000000'::uuid"
                    ")"
                ),
                "=",
            ),
            (text("daterange(period_start, period_end, '[)')"), "&&"),
            name="ex_budgets_active_scope_period_no_overlap",
            using="gist",
            where=text("is_archived = false"),
        ),
        Index("ix_budgets_user_id", "user_id"),
        Index("ix_budgets_user_id_category_id", "user_id", "category_id"),
        Index("ix_budgets_user_id_period_start", "user_id", "period_start"),
        Index("ix_budgets_user_id_archived_at", "user_id", "archived_at"),
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
    category_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    period_type: Mapped[str] = mapped_column(String(20), nullable=False)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    limit_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, server_default="USD"
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
