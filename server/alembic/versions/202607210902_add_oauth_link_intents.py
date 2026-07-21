"""Add one-time OAuth link intents.

Revision ID: 202607210902
Revises: 202607180901
Create Date: 2026-07-21 09:02:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "202607210902"
down_revision: str | None = "202607180901"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "oauth_link_intents",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider", sa.String(length=20), nullable=False),
        sa.Column("code_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "provider IN ('google', 'github')",
            name=op.f("ck_oauth_link_intents_oauth_link_intent_provider_supported"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_oauth_link_intents_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_oauth_link_intents")),
        sa.UniqueConstraint(
            "code_hash",
            name=op.f("uq_oauth_link_intents_code_hash"),
        ),
    )
    op.create_index(
        "ix_oauth_link_intents_user_id",
        "oauth_link_intents",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_oauth_link_intents_expires_at",
        "oauth_link_intents",
        ["expires_at"],
        unique=False,
    )
    op.create_index(
        "ix_oauth_link_intents_consumed_at",
        "oauth_link_intents",
        ["consumed_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_oauth_link_intents_consumed_at",
        table_name="oauth_link_intents",
    )
    op.drop_index(
        "ix_oauth_link_intents_expires_at",
        table_name="oauth_link_intents",
    )
    op.drop_index(
        "ix_oauth_link_intents_user_id",
        table_name="oauth_link_intents",
    )
    op.drop_table("oauth_link_intents")
