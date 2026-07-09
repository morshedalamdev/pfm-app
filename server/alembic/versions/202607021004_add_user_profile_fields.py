"""add user profile fields

Revision ID: 202607021004
Revises: 202607010703
Create Date: 2026-07-02 10:04:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "202607021004"
down_revision: str | None = "202607010703"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("full_name", sa.String(length=120), nullable=True))
    op.add_column(
        "users", sa.Column("phone_number", sa.String(length=32), nullable=True)
    )
    op.add_column("users", sa.Column("occupation", sa.String(length=80), nullable=True))
    op.add_column("users", sa.Column("about", sa.String(length=1000), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "about")
    op.drop_column("users", "occupation")
    op.drop_column("users", "phone_number")
    op.drop_column("users", "full_name")
