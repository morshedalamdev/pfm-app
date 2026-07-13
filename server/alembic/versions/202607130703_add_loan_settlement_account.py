"""Add loan settlement account.

Revision ID: 202607130703
Revises: 202607130702
Create Date: 2026-07-13 07:03:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "202607130703"
down_revision: str | None = "202607130702"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "loan_settlements",
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.execute(
        sa.text(
            """
            UPDATE loan_settlements AS settlement
            SET account_id = record.account_id
            FROM loan_records AS record
            WHERE record.id = settlement.record_id
              AND record.user_id = settlement.user_id
              AND record.account_id IS NOT NULL
            """
        )
    )
    op.create_foreign_key(
        "fk_loan_settlements_account_id_user_id_accounts",
        "loan_settlements",
        "accounts",
        ["account_id", "user_id"],
        ["id", "user_id"],
        ondelete="RESTRICT",
    )
    op.create_index(
        "ix_loan_settlements_user_id_account_id",
        "loan_settlements",
        ["user_id", "account_id"],
        unique=False,
    )
    op.execute(
        sa.text(
            """
            UPDATE accounts AS account
            SET loan_balance_adjustment =
                COALESCE(
                    (
                        SELECT SUM(
                            CASE
                                WHEN record.direction = 'given'
                                THEN -record.principal_amount
                                ELSE record.principal_amount
                            END
                        )
                        FROM loan_records AS record
                        WHERE record.account_id = account.id
                          AND record.user_id = account.user_id
                    ),
                    0
                )
                + COALESCE(
                    (
                        SELECT SUM(
                            CASE
                                WHEN record.direction = 'given'
                                THEN settlement.amount
                                ELSE -settlement.amount
                            END
                        )
                        FROM loan_settlements AS settlement
                        JOIN loan_records AS record
                          ON record.id = settlement.record_id
                         AND record.user_id = settlement.user_id
                        WHERE settlement.account_id = account.id
                          AND settlement.user_id = account.user_id
                    ),
                    0
                )
            """
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE accounts AS account
            SET loan_balance_adjustment = COALESCE(
                (
                    SELECT SUM(
                        CASE
                            WHEN record.direction = 'given'
                            THEN -record.principal_amount
                            ELSE record.principal_amount
                        END
                    )
                    FROM loan_records AS record
                    WHERE record.account_id = account.id
                      AND record.user_id = account.user_id
                ),
                0
            )
            """
        )
    )
    op.drop_index(
        "ix_loan_settlements_user_id_account_id",
        table_name="loan_settlements",
    )
    op.drop_constraint(
        "fk_loan_settlements_account_id_user_id_accounts",
        "loan_settlements",
        type_="foreignkey",
    )
    op.drop_column("loan_settlements", "account_id")
