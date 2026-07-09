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
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class LoanPerson(Base):
    __tablename__ = "loan_people"
    __table_args__ = (
        UniqueConstraint("user_id", "phone_number", name="uq_loan_people_user_phone"),
        UniqueConstraint("id", "user_id", name="uq_loan_people_id_user_id"),
        Index("ix_loan_people_user_id", "user_id"),
        Index("ix_loan_people_user_id_created_at", "user_id", "created_at"),
        Index("ix_loan_people_user_id_archived_at", "user_id", "archived_at"),
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
    phone_number: Mapped[str] = mapped_column(String(40), nullable=False)
    note: Mapped[str | None] = mapped_column(Text)
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


class LoanRecord(Base):
    __tablename__ = "loan_records"
    __table_args__ = (
        CheckConstraint(
            "direction IN ('given', 'taken')",
            name="direction_supported",
        ),
        CheckConstraint(
            "status IN ('open', 'settled', 'archived')",
            name="status_supported",
        ),
        CheckConstraint("principal_amount > 0", name="principal_amount_positive"),
        CheckConstraint(
            "status <> 'archived' OR archived_at IS NOT NULL",
            name="archive_state_consistent",
        ),
        CheckConstraint(
            "status <> 'settled' OR settled_at IS NOT NULL",
            name="settlement_state_consistent",
        ),
        UniqueConstraint("id", "user_id", name="uq_loan_records_id_user_id"),
        ForeignKeyConstraint(
            ["person_id", "user_id"],
            ["loan_people.id", "loan_people.user_id"],
            name="fk_loan_records_person_id_user_id_loan_people",
            ondelete="RESTRICT",
        ),
        Index("ix_loan_records_user_id", "user_id"),
        Index("ix_loan_records_user_id_person_id", "user_id", "person_id"),
        Index("ix_loan_records_user_id_status", "user_id", "status"),
        Index("ix_loan_records_user_id_direction", "user_id", "direction"),
        Index("ix_loan_records_user_id_currency", "user_id", "currency"),
        Index("ix_loan_records_user_id_issued_at", "user_id", "issued_at"),
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
    person_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    direction: Mapped[str] = mapped_column(String(20), nullable=False)
    principal_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        server_default="USD",
    )
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="open",
    )
    note: Mapped[str | None] = mapped_column(Text)
    settled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
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


class LoanSettlement(Base):
    __tablename__ = "loan_settlements"
    __table_args__ = (
        CheckConstraint("amount > 0", name="amount_positive"),
        UniqueConstraint("id", "user_id", name="uq_loan_settlements_id_user_id"),
        ForeignKeyConstraint(
            ["record_id", "user_id"],
            ["loan_records.id", "loan_records.user_id"],
            name="fk_loan_settlements_record_id_user_id_loan_records",
            ondelete="RESTRICT",
        ),
        Index(
            "ix_loan_settlements_user_id_record_id_settled_at",
            "user_id",
            "record_id",
            "settled_at",
        ),
        Index(
            "ix_loan_settlements_user_id_created_at",
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
    record_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        server_default="USD",
    )
    settled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
