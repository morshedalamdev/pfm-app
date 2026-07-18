"""Add OAuth identity and login exchange schema.

Revision ID: 202607180901
Revises: 202607130703
Create Date: 2026-07-18 09:01:00.000000
"""

import secrets
from collections.abc import Sequence

import sqlalchemy as sa
from pwdlib import PasswordHash
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "202607180901"
down_revision: str | None = "202607130703"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "users",
        "password_hash",
        existing_type=sa.String(length=255),
        nullable=True,
    )
    op.create_table(
        "oauth_identities",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider", sa.String(length=20), nullable=False),
        sa.Column("provider_subject", sa.String(length=255), nullable=False),
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
            "provider IN ('google', 'github')",
            name=op.f("ck_oauth_identities_oauth_identity_provider_supported"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_oauth_identities_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_oauth_identities")),
        sa.UniqueConstraint(
            "provider",
            "provider_subject",
            name="uq_oauth_identities_provider_subject",
        ),
        sa.UniqueConstraint(
            "user_id",
            "provider",
            name="uq_oauth_identities_user_provider",
        ),
    )
    op.create_index(
        "ix_oauth_identities_user_id",
        "oauth_identities",
        ["user_id"],
        unique=False,
    )
    op.create_table(
        "oauth_login_exchanges",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("code_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_oauth_login_exchanges_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_oauth_login_exchanges")),
        sa.UniqueConstraint(
            "code_hash",
            name=op.f("uq_oauth_login_exchanges_code_hash"),
        ),
    )
    op.create_index(
        "ix_oauth_login_exchanges_consumed_at",
        "oauth_login_exchanges",
        ["consumed_at"],
        unique=False,
    )
    op.create_index(
        "ix_oauth_login_exchanges_expires_at",
        "oauth_login_exchanges",
        ["expires_at"],
        unique=False,
    )
    op.create_index(
        "ix_oauth_login_exchanges_user_id",
        "oauth_login_exchanges",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_oauth_login_exchanges_user_id",
        table_name="oauth_login_exchanges",
    )
    op.drop_index(
        "ix_oauth_login_exchanges_expires_at",
        table_name="oauth_login_exchanges",
    )
    op.drop_index(
        "ix_oauth_login_exchanges_consumed_at",
        table_name="oauth_login_exchanges",
    )
    op.drop_table("oauth_login_exchanges")
    op.drop_index("ix_oauth_identities_user_id", table_name="oauth_identities")
    op.drop_table("oauth_identities")
    disabled_password_hash = PasswordHash.recommended().hash(secrets.token_urlsafe(64))
    op.execute(
        sa.text(
            """
            UPDATE users
            SET password_hash = :disabled_password_hash
            WHERE password_hash IS NULL
            """
        ).bindparams(disabled_password_hash=disabled_password_hash)
    )
    op.alter_column(
        "users",
        "password_hash",
        existing_type=sa.String(length=255),
        nullable=False,
    )
