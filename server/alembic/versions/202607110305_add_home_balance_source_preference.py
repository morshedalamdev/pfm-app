"""Add home balance source preference.

Revision ID: 202607110305
Revises: 202607110304
Create Date: 2026-07-11 03:05:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "202607110305"
down_revision: str | None = "202607110304"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("home_balance_source_type", sa.String(length=20), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("home_balance_source_id", sa.UUID(), nullable=True),
    )
    op.create_check_constraint(
        op.f("ck_users_home_balance_source_type_supported"),
        "users",
        "home_balance_source_type IS NULL OR "
        "home_balance_source_type IN ('account', 'budget')",
    )
    op.create_check_constraint(
        op.f("ck_users_home_balance_source_complete"),
        "users",
        "(home_balance_source_type IS NULL AND home_balance_source_id IS NULL) OR "
        "(home_balance_source_type IS NOT NULL AND home_balance_source_id IS NOT NULL)",
    )


def downgrade() -> None:
    op.drop_constraint(
        op.f("ck_users_home_balance_source_complete"),
        "users",
        type_="check",
    )
    op.drop_constraint(
        op.f("ck_users_home_balance_source_type_supported"),
        "users",
        type_="check",
    )
    op.drop_column("users", "home_balance_source_id")
    op.drop_column("users", "home_balance_source_type")
