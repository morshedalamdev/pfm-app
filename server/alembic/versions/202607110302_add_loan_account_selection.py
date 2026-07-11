"""add loan account selection

Revision ID: 202607110302
Revises: 202607100202
Create Date: 2026-07-11 03:02:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "202607110302"
down_revision: str | None = "202607100202"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "loan_records",
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_loan_records_account_id_user_id_accounts",
        "loan_records",
        "accounts",
        ["account_id", "user_id"],
        ["id", "user_id"],
        ondelete="RESTRICT",
    )
    op.create_index(
        "ix_loan_records_user_id_account_id",
        "loan_records",
        ["user_id", "account_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_loan_records_user_id_account_id",
        table_name="loan_records",
    )
    op.drop_constraint(
        "fk_loan_records_account_id_user_id_accounts",
        "loan_records",
        type_="foreignkey",
    )
    op.drop_column("loan_records", "account_id")
