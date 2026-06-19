"""add savings goals schema

Revision ID: 202606190403
Revises: 202606190401
Create Date: 2026-06-19 04:03:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "202606190403"
down_revision: str | None = "202606190401"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "savings_goals",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("target_amount", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column(
            "monthly_target_amount",
            sa.Numeric(precision=18, scale=4),
            server_default="0",
            nullable=False,
        ),
        sa.Column(
            "currency", sa.String(length=3), server_default="USD", nullable=False
        ),
        sa.Column("target_date", sa.Date(), nullable=True),
        sa.Column(
            "status",
            sa.String(length=20),
            server_default="active",
            nullable=False,
        ),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
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
            "status IN ('active', 'completed', 'archived')",
            name=op.f("ck_savings_goals_status_supported"),
        ),
        sa.CheckConstraint(
            "target_amount > 0",
            name=op.f("ck_savings_goals_target_amount_positive"),
        ),
        sa.CheckConstraint(
            "monthly_target_amount >= 0",
            name=op.f("ck_savings_goals_monthly_target_amount_non_negative"),
        ),
        sa.CheckConstraint(
            "status <> 'archived' OR archived_at IS NOT NULL",
            name=op.f("ck_savings_goals_archive_state_consistent"),
        ),
        sa.CheckConstraint(
            "status <> 'completed' OR completed_at IS NOT NULL",
            name=op.f("ck_savings_goals_completion_state_consistent"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_savings_goals_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_savings_goals")),
        sa.UniqueConstraint("id", "user_id", name=op.f("uq_savings_goals_id_user_id")),
    )
    op.create_index(
        "ix_savings_goals_user_id",
        "savings_goals",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_savings_goals_user_id_archived_at",
        "savings_goals",
        ["user_id", "archived_at"],
        unique=False,
    )
    op.create_index(
        "ix_savings_goals_user_id_created_at",
        "savings_goals",
        ["user_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_savings_goals_user_id_status",
        "savings_goals",
        ["user_id", "status"],
        unique=False,
    )

    op.create_table(
        "savings_contributions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("goal_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("amount", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column(
            "currency", sa.String(length=3), server_default="USD", nullable=False
        ),
        sa.Column("contributed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "amount > 0",
            name=op.f("ck_savings_contributions_amount_positive"),
        ),
        sa.ForeignKeyConstraint(
            ["goal_id", "user_id"],
            ["savings_goals.id", "savings_goals.user_id"],
            name=op.f("fk_savings_contributions_goal_id_user_id_savings_goals"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_savings_contributions_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_savings_contributions")),
        sa.UniqueConstraint(
            "id",
            "user_id",
            name=op.f("uq_savings_contributions_id_user_id"),
        ),
    )
    op.create_index(
        "ix_savings_contributions_user_id_created_at",
        "savings_contributions",
        ["user_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_savings_contributions_user_id_goal_id_contributed_at",
        "savings_contributions",
        ["user_id", "goal_id", "contributed_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_savings_contributions_user_id_goal_id_contributed_at",
        table_name="savings_contributions",
    )
    op.drop_index(
        "ix_savings_contributions_user_id_created_at",
        table_name="savings_contributions",
    )
    op.drop_table("savings_contributions")
    op.drop_index("ix_savings_goals_user_id_status", table_name="savings_goals")
    op.drop_index("ix_savings_goals_user_id_created_at", table_name="savings_goals")
    op.drop_index("ix_savings_goals_user_id_archived_at", table_name="savings_goals")
    op.drop_index("ix_savings_goals_user_id", table_name="savings_goals")
    op.drop_table("savings_goals")
