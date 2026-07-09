"""add loan debt schema

Revision ID: 202607061104
Revises: 202607031004
Create Date: 2026-07-06 11:04:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "202607061104"
down_revision: str | None = "202607031004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "loan_people",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("phone_number", sa.String(length=40), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_loan_people_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_loan_people")),
        sa.UniqueConstraint(
            "id",
            "user_id",
            name=op.f("uq_loan_people_id_user_id"),
        ),
        sa.UniqueConstraint(
            "user_id",
            "phone_number",
            name="uq_loan_people_user_phone",
        ),
    )
    op.create_index(
        "ix_loan_people_user_id",
        "loan_people",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_loan_people_user_id_archived_at",
        "loan_people",
        ["user_id", "archived_at"],
        unique=False,
    )
    op.create_index(
        "ix_loan_people_user_id_created_at",
        "loan_people",
        ["user_id", "created_at"],
        unique=False,
    )

    op.create_table(
        "loan_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("person_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("direction", sa.String(length=20), nullable=False),
        sa.Column(
            "principal_amount",
            sa.Numeric(precision=18, scale=4),
            nullable=False,
        ),
        sa.Column(
            "currency",
            sa.String(length=3),
            server_default="USD",
            nullable=False,
        ),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "status",
            sa.String(length=20),
            server_default="open",
            nullable=False,
        ),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("settled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "direction IN ('given', 'taken')",
            name=op.f("ck_loan_records_direction_supported"),
        ),
        sa.CheckConstraint(
            "principal_amount > 0",
            name=op.f("ck_loan_records_principal_amount_positive"),
        ),
        sa.CheckConstraint(
            "status IN ('open', 'settled', 'archived')",
            name=op.f("ck_loan_records_status_supported"),
        ),
        sa.CheckConstraint(
            "status <> 'archived' OR archived_at IS NOT NULL",
            name=op.f("ck_loan_records_archive_state_consistent"),
        ),
        sa.CheckConstraint(
            "status <> 'settled' OR settled_at IS NOT NULL",
            name=op.f("ck_loan_records_settlement_state_consistent"),
        ),
        sa.ForeignKeyConstraint(
            ["person_id", "user_id"],
            ["loan_people.id", "loan_people.user_id"],
            name=op.f("fk_loan_records_person_id_user_id_loan_people"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_loan_records_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_loan_records")),
        sa.UniqueConstraint(
            "id",
            "user_id",
            name=op.f("uq_loan_records_id_user_id"),
        ),
    )
    op.create_index(
        "ix_loan_records_user_id",
        "loan_records",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_loan_records_user_id_currency",
        "loan_records",
        ["user_id", "currency"],
        unique=False,
    )
    op.create_index(
        "ix_loan_records_user_id_direction",
        "loan_records",
        ["user_id", "direction"],
        unique=False,
    )
    op.create_index(
        "ix_loan_records_user_id_issued_at",
        "loan_records",
        ["user_id", "issued_at"],
        unique=False,
    )
    op.create_index(
        "ix_loan_records_user_id_person_id",
        "loan_records",
        ["user_id", "person_id"],
        unique=False,
    )
    op.create_index(
        "ix_loan_records_user_id_status",
        "loan_records",
        ["user_id", "status"],
        unique=False,
    )

    op.create_table(
        "loan_settlements",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("record_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("amount", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column(
            "currency",
            sa.String(length=3),
            server_default="USD",
            nullable=False,
        ),
        sa.Column("settled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "amount > 0",
            name=op.f("ck_loan_settlements_amount_positive"),
        ),
        sa.ForeignKeyConstraint(
            ["record_id", "user_id"],
            ["loan_records.id", "loan_records.user_id"],
            name=op.f("fk_loan_settlements_record_id_user_id_loan_records"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_loan_settlements_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_loan_settlements")),
        sa.UniqueConstraint(
            "id",
            "user_id",
            name=op.f("uq_loan_settlements_id_user_id"),
        ),
    )
    op.create_index(
        "ix_loan_settlements_user_id_created_at",
        "loan_settlements",
        ["user_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_loan_settlements_user_id_record_id_settled_at",
        "loan_settlements",
        ["user_id", "record_id", "settled_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_loan_settlements_user_id_record_id_settled_at",
        table_name="loan_settlements",
    )
    op.drop_index(
        "ix_loan_settlements_user_id_created_at",
        table_name="loan_settlements",
    )
    op.drop_table("loan_settlements")
    op.drop_index("ix_loan_records_user_id_status", table_name="loan_records")
    op.drop_index("ix_loan_records_user_id_person_id", table_name="loan_records")
    op.drop_index("ix_loan_records_user_id_issued_at", table_name="loan_records")
    op.drop_index("ix_loan_records_user_id_direction", table_name="loan_records")
    op.drop_index("ix_loan_records_user_id_currency", table_name="loan_records")
    op.drop_index("ix_loan_records_user_id", table_name="loan_records")
    op.drop_table("loan_records")
    op.drop_index("ix_loan_people_user_id_created_at", table_name="loan_people")
    op.drop_index("ix_loan_people_user_id_archived_at", table_name="loan_people")
    op.drop_index("ix_loan_people_user_id", table_name="loan_people")
    op.drop_table("loan_people")
