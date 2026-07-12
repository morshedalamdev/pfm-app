"""add account state fields

Revision ID: 202607100202
Revises: 202607071106
Create Date: 2026-07-10 02:02:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "202607100202"
down_revision: str | None = "202607071106"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "accounts",
        sa.Column(
            "is_disabled",
            sa.Boolean(),
            server_default="false",
            nullable=False,
        ),
    )
    op.add_column(
        "accounts",
        sa.Column("disabled_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "accounts",
        sa.Column(
            "is_default",
            sa.Boolean(),
            server_default="false",
            nullable=False,
        ),
    )

    op.create_check_constraint(
        op.f("ck_accounts_disabled_state_consistent"),
        "accounts",
        "(is_disabled = false AND disabled_at IS NULL) OR "
        "(is_disabled = true AND disabled_at IS NOT NULL)",
    )
    op.create_check_constraint(
        op.f("ck_accounts_default_account_active"),
        "accounts",
        "is_default = false OR (is_disabled = false AND archived_at IS NULL)",
    )
    op.create_index(
        "ix_accounts_user_id_disabled_at",
        "accounts",
        ["user_id", "disabled_at"],
        unique=False,
    )

    op.execute(
        sa.text(
            """
            UPDATE accounts AS account
            SET is_default = true
            FROM (
                SELECT DISTINCT ON (user_id) id
                FROM accounts
                WHERE archived_at IS NULL
                    AND is_archived = false
                    AND is_disabled = false
                ORDER BY user_id, created_at ASC, id ASC
            ) AS default_account
            WHERE account.id = default_account.id
            """
        )
    )

    op.create_index(
        "uq_accounts_one_active_default_per_user",
        "accounts",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text(
            "is_default = true AND is_disabled = false AND archived_at IS NULL"
        ),
    )


def downgrade() -> None:
    op.drop_index("uq_accounts_one_active_default_per_user", table_name="accounts")
    op.drop_index("ix_accounts_user_id_disabled_at", table_name="accounts")
    op.drop_constraint(
        op.f("ck_accounts_default_account_active"),
        "accounts",
        type_="check",
    )
    op.drop_constraint(
        op.f("ck_accounts_disabled_state_consistent"),
        "accounts",
        type_="check",
    )
    op.drop_column("accounts", "is_default")
    op.drop_column("accounts", "disabled_at")
    op.drop_column("accounts", "is_disabled")
