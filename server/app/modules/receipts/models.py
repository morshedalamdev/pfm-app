from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Receipt(Base):
    __tablename__ = "receipts"
    __table_args__ = (
        CheckConstraint("size_bytes > 0", name="size_bytes_positive"),
        CheckConstraint("length(checksum_sha256) = 64", name="checksum_sha256_length"),
        UniqueConstraint("id", "user_id", name="uq_receipts_id_user_id"),
        UniqueConstraint("storage_key", name="uq_receipts_storage_key"),
        ForeignKeyConstraint(
            ["transaction_id", "user_id"],
            ["transactions.id", "transactions.user_id"],
            name="fk_receipts_transaction_id_user_id_transactions",
            ondelete="RESTRICT",
        ),
        Index("ix_receipts_user_id_created_at", "user_id", "created_at"),
        Index("ix_receipts_user_id_transaction_id", "user_id", "transaction_id"),
        Index(
            "ix_receipts_active_user_created_at",
            "user_id",
            "created_at",
            postgresql_where=text("deleted_at IS NULL"),
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
    transaction_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    storage_backend: Mapped[str] = mapped_column(String(40), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(500), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(120), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
