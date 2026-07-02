from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SavingsGoal(Base):
    __tablename__ = "savings_goals"
    __table_args__ = (
        CheckConstraint(
            "status IN ('active', 'completed', 'archived')",
            name="status_supported",
        ),
        CheckConstraint("target_amount > 0", name="target_amount_positive"),
        CheckConstraint(
            "monthly_target_amount >= 0",
            name="monthly_target_amount_non_negative",
        ),
        CheckConstraint(
            "status <> 'archived' OR archived_at IS NOT NULL",
            name="archive_state_consistent",
        ),
        CheckConstraint(
            "status <> 'completed' OR completed_at IS NOT NULL",
            name="completion_state_consistent",
        ),
        UniqueConstraint("id", "user_id", name="uq_savings_goals_id_user_id"),
        Index("ix_savings_goals_user_id", "user_id"),
        Index("ix_savings_goals_user_id_status", "user_id", "status"),
        Index("ix_savings_goals_user_id_archived_at", "user_id", "archived_at"),
        Index("ix_savings_goals_user_id_created_at", "user_id", "created_at"),
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
    target_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    monthly_target_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 4),
        nullable=False,
        server_default="0",
    )
    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        server_default="USD",
    )
    target_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="active",
    )
    note: Mapped[str | None] = mapped_column(Text)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
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


class SavingsContribution(Base):
    __tablename__ = "savings_contributions"
    __table_args__ = (
        CheckConstraint("amount > 0", name="amount_positive"),
        UniqueConstraint("id", "user_id", name="uq_savings_contributions_id_user_id"),
        ForeignKeyConstraint(
            ["goal_id", "user_id"],
            ["savings_goals.id", "savings_goals.user_id"],
            name="fk_savings_contributions_goal_id_user_id_savings_goals",
            ondelete="RESTRICT",
        ),
        Index(
            "ix_savings_contributions_user_id_goal_id_contributed_at",
            "user_id",
            "goal_id",
            "contributed_at",
        ),
        Index(
            "ix_savings_contributions_reports_user_contributed_at",
            "user_id",
            "contributed_at",
            postgresql_include=["amount"],
        ),
        Index(
            "ix_savings_contributions_user_id_created_at",
            "user_id",
            "created_at",
        ),
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
    goal_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        server_default="USD",
    )
    contributed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
