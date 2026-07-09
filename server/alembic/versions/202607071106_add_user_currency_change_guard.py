"""Add user currency change guard.

Revision ID: 202607071106
Revises: 202607061104
Create Date: 2026-07-07 11:06:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "202607071106"
down_revision: str | None = "202607061104"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "base_currency_changed_at", sa.DateTime(timezone=True), nullable=True
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "base_currency_changed_at")
