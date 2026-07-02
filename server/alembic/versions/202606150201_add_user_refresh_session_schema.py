"""add user refresh session schema

Revision ID: 202606150201
Revises: 202606120114
Create Date: 2026-06-15 02:01:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "202606150201"
down_revision: str | None = "202606120114"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
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
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("email", name=op.f("uq_users_email")),
    )
    op.create_table(
        "refresh_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column(
            "session_family_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("parent_session_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "replaced_by_session_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_reason", sa.String(length=120), nullable=True),
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
            ["parent_session_id"],
            ["refresh_sessions.id"],
            name=op.f("fk_refresh_sessions_parent_session_id_refresh_sessions"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["replaced_by_session_id"],
            ["refresh_sessions.id"],
            name=op.f("fk_refresh_sessions_replaced_by_session_id_refresh_sessions"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_refresh_sessions_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_refresh_sessions")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_refresh_sessions_token_hash")),
    )
    op.create_index(
        "ix_refresh_sessions_expires_at",
        "refresh_sessions",
        ["expires_at"],
        unique=False,
    )
    op.create_index(
        "ix_refresh_sessions_revoked_at",
        "refresh_sessions",
        ["revoked_at"],
        unique=False,
    )
    op.create_index(
        "ix_refresh_sessions_session_family_id",
        "refresh_sessions",
        ["session_family_id"],
        unique=False,
    )
    op.create_index(
        "ix_refresh_sessions_user_id",
        "refresh_sessions",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_refresh_sessions_user_id", table_name="refresh_sessions")
    op.drop_index(
        "ix_refresh_sessions_session_family_id",
        table_name="refresh_sessions",
    )
    op.drop_index("ix_refresh_sessions_revoked_at", table_name="refresh_sessions")
    op.drop_index("ix_refresh_sessions_expires_at", table_name="refresh_sessions")
    op.drop_table("refresh_sessions")
    op.drop_table("users")
