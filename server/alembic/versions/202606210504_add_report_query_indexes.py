"""add report query indexes

Revision ID: 202606210504
Revises: 202606190403
Create Date: 2026-06-21 05:04:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "202606210504"
down_revision: str | None = "202606190403"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index(
        "ix_transactions_reports_active_user_at",
        "transactions",
        ["user_id", "transaction_at"],
        unique=False,
        postgresql_include=["type", "category_id", "account_id", "amount"],
        postgresql_where=sa.text("voided_at IS NULL"),
    )
    op.create_index(
        "ix_savings_contributions_reports_user_contributed_at",
        "savings_contributions",
        ["user_id", "contributed_at"],
        unique=False,
        postgresql_include=["amount"],
    )
    op.create_index(
        "ix_budgets_reports_active_user_period",
        "budgets",
        ["user_id", "period_start", "period_end"],
        unique=False,
        postgresql_include=["category_id", "limit_amount"],
        postgresql_where=sa.text("archived_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "ix_budgets_reports_active_user_period",
        table_name="budgets",
        postgresql_where=sa.text("archived_at IS NULL"),
    )
    op.drop_index(
        "ix_savings_contributions_reports_user_contributed_at",
        table_name="savings_contributions",
    )
    op.drop_index(
        "ix_transactions_reports_active_user_at",
        table_name="transactions",
        postgresql_where=sa.text("voided_at IS NULL"),
    )
