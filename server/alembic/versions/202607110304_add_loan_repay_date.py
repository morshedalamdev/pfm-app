"""add loan repay date

Revision ID: 202607110304
Revises: 202607110303
Create Date: 2026-07-11 03:04:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "202607110304"
down_revision: str | None = "202607110303"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "loan_records",
        sa.Column("repay_date", sa.Date(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("loan_records", "repay_date")
