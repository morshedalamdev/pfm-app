"""add notification schema

Revision ID: 202607010703
Revises: 202607010702
Create Date: 2026-07-01 07:03:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "202607010703"
down_revision: str | None = "202607010702"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("type", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column(
            "payload",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "email_delivery_status",
            sa.String(length=20),
            server_default="not_requested",
            nullable=False,
        ),
        sa.Column("email_requested_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("email_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("email_adapter", sa.String(length=40), nullable=True),
        sa.Column("email_provider_message_id", sa.String(length=255), nullable=True),
        sa.Column("email_error", sa.Text(), nullable=True),
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
            "email_delivery_status IN ('not_requested', 'pending', 'sent', 'failed')",
            name=op.f("ck_notifications_email_delivery_status_supported"),
        ),
        sa.CheckConstraint(
            "email_sent_at IS NULL OR email_requested_at IS NOT NULL",
            name=op.f("ck_notifications_email_sent_requires_request"),
        ),
        sa.CheckConstraint(
            "read_at IS NULL OR read_at >= created_at",
            name=op.f("ck_notifications_read_at_not_before_created_at"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_notifications_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_notifications")),
    )
    op.create_index(
        "ix_notifications_email_delivery_status",
        "notifications",
        ["email_delivery_status"],
        unique=False,
    )
    op.create_index(
        "ix_notifications_unread_user_created_at",
        "notifications",
        ["user_id", "created_at"],
        unique=False,
        postgresql_where=sa.text("read_at IS NULL"),
    )
    op.create_index(
        "ix_notifications_user_id_created_at",
        "notifications",
        ["user_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_notifications_user_id_type",
        "notifications",
        ["user_id", "type"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_notifications_user_id_type", table_name="notifications")
    op.drop_index("ix_notifications_user_id_created_at", table_name="notifications")
    op.drop_index(
        "ix_notifications_unread_user_created_at",
        table_name="notifications",
    )
    op.drop_index("ix_notifications_email_delivery_status", table_name="notifications")
    op.drop_table("notifications")
