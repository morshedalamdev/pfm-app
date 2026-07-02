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


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint(
            "type IN ('income', 'expense', 'transfer_debit', 'transfer_credit')",
            name="type_supported",
        ),
        CheckConstraint("amount > 0", name="amount_positive"),
        UniqueConstraint("id", "user_id", name="uq_transactions_id_user_id"),
        ForeignKeyConstraint(
            ["account_id", "user_id"],
            ["accounts.id", "accounts.user_id"],
            name="fk_transactions_account_id_user_id_accounts",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["category_id", "user_id"],
            ["categories.id", "categories.user_id"],
            name="fk_transactions_category_id_user_id_categories",
            ondelete="RESTRICT",
        ),
        Index("ix_transactions_user_id_transaction_at", "user_id", "transaction_at"),
        Index(
            "ix_transactions_user_id_account_id_transaction_at",
            "user_id",
            "account_id",
            "transaction_at",
        ),
        Index(
            "ix_transactions_user_id_category_id_transaction_at",
            "user_id",
            "category_id",
            "transaction_at",
        ),
        Index(
            "ix_transactions_user_id_type_transaction_at",
            "user_id",
            "type",
            "transaction_at",
        ),
        Index(
            "ix_transactions_reports_active_user_at",
            "user_id",
            "transaction_at",
            postgresql_include=["type", "category_id", "account_id", "amount"],
            postgresql_where=text("voided_at IS NULL"),
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
    account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    category_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    type: Mapped[str] = mapped_column(String(32), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, server_default="USD"
    )
    transaction_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(Text)
    voided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
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


class TransferLink(Base):
    __tablename__ = "transfer_links"
    __table_args__ = (
        CheckConstraint("amount > 0", name="amount_positive"),
        CheckConstraint(
            "debit_transaction_id <> credit_transaction_id",
            name="distinct_transaction_rows",
        ),
        UniqueConstraint("id", "user_id", name="uq_transfer_links_id_user_id"),
        UniqueConstraint(
            "debit_transaction_id",
            name="uq_transfer_links_debit_transaction_id",
        ),
        UniqueConstraint(
            "credit_transaction_id",
            name="uq_transfer_links_credit_transaction_id",
        ),
        ForeignKeyConstraint(
            ["debit_transaction_id", "user_id"],
            ["transactions.id", "transactions.user_id"],
            name="fk_transfer_links_debit_transaction_id_user_id_transactions",
            ondelete="RESTRICT",
        ),
        ForeignKeyConstraint(
            ["credit_transaction_id", "user_id"],
            ["transactions.id", "transactions.user_id"],
            name="fk_transfer_links_credit_transaction_id_user_id_transactions",
            ondelete="RESTRICT",
        ),
        Index("ix_transfer_links_user_id_created_at", "user_id", "created_at"),
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
    debit_transaction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
    )
    credit_transaction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, server_default="USD"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
