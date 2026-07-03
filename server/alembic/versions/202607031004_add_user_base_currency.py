"""Add user base currency.

Revision ID: 202607031004
Revises: 202607021004
Create Date: 2026-07-03 10:04:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "202607031004"
down_revision = "202607021004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "base_currency",
            sa.String(length=3),
            nullable=False,
            server_default="USD",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "base_currency")
