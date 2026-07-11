"""add loan balance adjustment

Revision ID: 202607110303
Revises: 202607110302
Create Date: 2026-07-11 03:03:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "202607110303"
down_revision: str | None = "202607110302"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "accounts",
        sa.Column(
            "loan_balance_adjustment",
            sa.Numeric(precision=18, scale=4),
            server_default="0",
            nullable=False,
        ),
    )
    op.execute(
        sa.text(
            """
            UPDATE accounts AS account
            SET loan_balance_adjustment = effect.amount
            FROM (
                SELECT
                    account_id,
                    user_id,
                    SUM(
                        CASE
                            WHEN direction = 'given' THEN -principal_amount
                            WHEN direction = 'taken' THEN principal_amount
                            ELSE 0
                        END
                    ) AS amount
                FROM loan_records
                WHERE account_id IS NOT NULL
                GROUP BY account_id, user_id
            ) AS effect
            WHERE account.id = effect.account_id
                AND account.user_id = effect.user_id
            """
        )
    )


def downgrade() -> None:
    op.drop_column("accounts", "loan_balance_adjustment")
