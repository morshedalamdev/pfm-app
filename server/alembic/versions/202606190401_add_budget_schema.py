"""add budget schema

Revision ID: 202606190401
Revises: 202606150301
Create Date: 2026-06-19 04:01:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "202606190401"
down_revision: str | None = "202606150301"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")
    op.create_table(
        "budgets",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("period_type", sa.String(length=20), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column("limit_amount", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column(
            "currency", sa.String(length=3), server_default="USD", nullable=False
        ),
        sa.Column("is_archived", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "period_type IN ('monthly', 'custom')",
            name=op.f("ck_budgets_period_type_supported"),
        ),
        sa.CheckConstraint(
            "period_start < period_end",
            name=op.f("ck_budgets_period_dates_ordered"),
        ),
        sa.CheckConstraint(
            "limit_amount > 0",
            name=op.f("ck_budgets_limit_amount_positive"),
        ),
        sa.CheckConstraint(
            "period_type <> 'monthly' OR "
            "(EXTRACT(DAY FROM period_start) = 1 "
            "AND period_end = (period_start + INTERVAL '1 month')::date)",
            name=op.f("ck_budgets_monthly_period_matches_calendar_month"),
        ),
        sa.CheckConstraint(
            "(is_archived = false AND archived_at IS NULL) OR "
            "(is_archived = true AND archived_at IS NOT NULL)",
            name=op.f("ck_budgets_archive_state_consistent"),
        ),
        sa.ForeignKeyConstraint(
            ["category_id", "user_id"],
            ["categories.id", "categories.user_id"],
            name=op.f("fk_budgets_category_id_user_id_categories"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_budgets_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_budgets")),
        sa.UniqueConstraint("id", "user_id", name=op.f("uq_budgets_id_user_id")),
    )
    op.create_index("ix_budgets_user_id", "budgets", ["user_id"], unique=False)
    op.create_index(
        "ix_budgets_user_id_archived_at",
        "budgets",
        ["user_id", "archived_at"],
        unique=False,
    )
    op.create_index(
        "ix_budgets_user_id_category_id",
        "budgets",
        ["user_id", "category_id"],
        unique=False,
    )
    op.create_index(
        "ix_budgets_user_id_period_start",
        "budgets",
        ["user_id", "period_start"],
        unique=False,
    )
    op.execute(
        """
        ALTER TABLE budgets
        ADD CONSTRAINT ex_budgets_active_scope_period_no_overlap
        EXCLUDE USING gist (
            user_id WITH =,
            (
                COALESCE(
                    category_id,
                    '00000000-0000-0000-0000-000000000000'::uuid
                )
            ) WITH =,
            daterange(period_start, period_end, '[)') WITH &&
        )
        WHERE (is_archived = false)
        """
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE budgets DROP CONSTRAINT ex_budgets_active_scope_period_no_overlap"
    )
    op.drop_index("ix_budgets_user_id_period_start", table_name="budgets")
    op.drop_index("ix_budgets_user_id_category_id", table_name="budgets")
    op.drop_index("ix_budgets_user_id_archived_at", table_name="budgets")
    op.drop_index("ix_budgets_user_id", table_name="budgets")
    op.drop_table("budgets")
