"""add receipt schema

Revision ID: 202607010702
Revises: 202606210601
Create Date: 2026-07-01 07:02:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "202607010702"
down_revision: str | None = "202606210601"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "receipts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("transaction_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("storage_backend", sa.String(length=40), nullable=False),
        sa.Column("storage_key", sa.String(length=500), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=120), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("checksum_sha256", sa.String(length=64), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "length(checksum_sha256) = 64",
            name=op.f("ck_receipts_checksum_sha256_length"),
        ),
        sa.CheckConstraint(
            "size_bytes > 0",
            name=op.f("ck_receipts_size_bytes_positive"),
        ),
        sa.ForeignKeyConstraint(
            ["transaction_id", "user_id"],
            ["transactions.id", "transactions.user_id"],
            name=op.f("fk_receipts_transaction_id_user_id_transactions"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_receipts_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_receipts")),
        sa.UniqueConstraint("id", "user_id", name=op.f("uq_receipts_id_user_id")),
        sa.UniqueConstraint("storage_key", name=op.f("uq_receipts_storage_key")),
    )
    op.create_index(
        "ix_receipts_active_user_created_at",
        "receipts",
        ["user_id", "created_at"],
        unique=False,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_index(
        "ix_receipts_user_id_created_at",
        "receipts",
        ["user_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_receipts_user_id_transaction_id",
        "receipts",
        ["user_id", "transaction_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_receipts_user_id_transaction_id", table_name="receipts")
    op.drop_index("ix_receipts_user_id_created_at", table_name="receipts")
    op.drop_index("ix_receipts_active_user_created_at", table_name="receipts")
    op.drop_table("receipts")
