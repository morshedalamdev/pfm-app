from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    UniqueConstraint,
    case,
    func,
    select,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, column_property, mapped_column

from app.core.database import Base
from app.modules.transactions.models import Transaction


class Account(Base):
    __tablename__ = "accounts"
    __table_args__ = (
        CheckConstraint("opening_balance >= 0", name="opening_balance_non_negative"),
        CheckConstraint(
            "(is_disabled = false AND disabled_at IS NULL) OR "
            "(is_disabled = true AND disabled_at IS NOT NULL)",
            name="disabled_state_consistent",
        ),
        CheckConstraint(
            "is_default = false OR (is_disabled = false AND archived_at IS NULL)",
            name="default_account_active",
        ),
        UniqueConstraint("id", "user_id", name="uq_accounts_id_user_id"),
        Index("ix_accounts_user_id", "user_id"),
        Index("ix_accounts_user_id_archived_at", "user_id", "archived_at"),
        Index("ix_accounts_user_id_disabled_at", "user_id", "disabled_at"),
        Index("ix_accounts_user_id_name", "user_id", "name"),
        Index(
            "uq_accounts_one_active_default_per_user",
            "user_id",
            unique=True,
            postgresql_where=text(
                "is_default = true AND is_disabled = false AND archived_at IS NULL"
            ),
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
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    type: Mapped[str] = mapped_column(String(40), nullable=False)
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, server_default="USD"
    )
    opening_balance: Mapped[Decimal] = mapped_column(
        Numeric(18, 4),
        nullable=False,
        server_default="0",
    )
    loan_balance_adjustment: Mapped[Decimal] = mapped_column(
        Numeric(18, 4),
        nullable=False,
        server_default="0",
    )
    is_archived: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_disabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
    )
    disabled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_default: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
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
    transaction_balance_adjustment: Mapped[Decimal] = column_property(
        select(
            func.coalesce(
                func.sum(
                    case(
                        (Transaction.type == "income", Transaction.amount),
                        else_=-Transaction.amount,
                    )
                ),
                0,
            )
        )
        .where(
            Transaction.account_id == id,
            Transaction.user_id == user_id,
            Transaction.voided_at.is_(None),
            Transaction.type.in_(("income", "expense")),
        )
        .correlate_except(Transaction)
        .scalar_subquery()
    )

    @property
    def current_balance(self) -> Decimal:
        return (
            self.opening_balance
            + self.loan_balance_adjustment
            + self.transaction_balance_adjustment
        )
