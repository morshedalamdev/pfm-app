"""Add recurring expense completion period.

Revision ID: 202607130602
Revises: 202607120502
Create Date: 2026-07-13 06:02:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "202607130602"
down_revision: str | None = "202607120502"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "recurring_rules",
        sa.Column("last_paid_period", sa.String(length=7), nullable=True),
    )
    op.create_check_constraint(
        op.f("ck_recurring_rules_last_paid_period_format"),
        "recurring_rules",
        "last_paid_period IS NULL OR last_paid_period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'",
    )


def downgrade() -> None:
    op.drop_constraint(
        op.f("ck_recurring_rules_last_paid_period_format"),
        "recurring_rules",
        type_="check",
    )
    op.drop_column("recurring_rules", "last_paid_period")
