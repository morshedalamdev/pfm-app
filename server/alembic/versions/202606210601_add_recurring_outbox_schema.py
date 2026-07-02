"""add recurring outbox schema

Revision ID: 202606210601
Revises: 202606210504
Create Date: 2026-06-21 06:01:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "202606210601"
down_revision: str | None = "202606210504"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "recurring_rules",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("transaction_type", sa.String(length=20), nullable=False),
        sa.Column("amount", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column(
            "currency", sa.String(length=3), server_default="USD", nullable=False
        ),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("frequency", sa.String(length=20), nullable=False),
        sa.Column("interval_count", sa.Integer(), server_default="1", nullable=False),
        sa.Column(
            "timezone", sa.String(length=64), server_default="UTC", nullable=False
        ),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_run_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_run_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_run_key", sa.String(length=160), nullable=True),
        sa.Column("run_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "status", sa.String(length=20), server_default="active", nullable=False
        ),
        sa.Column("paused_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("locked_by", sa.String(length=120), nullable=True),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
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
            "amount > 0",
            name=op.f("ck_recurring_rules_amount_positive"),
        ),
        sa.CheckConstraint(
            "end_at IS NULL OR end_at > start_at",
            name=op.f("ck_recurring_rules_end_after_start"),
        ),
        sa.CheckConstraint(
            "frequency IN ('daily', 'weekly', 'monthly', 'yearly')",
            name=op.f("ck_recurring_rules_frequency_supported"),
        ),
        sa.CheckConstraint(
            "interval_count > 0",
            name=op.f("ck_recurring_rules_interval_count_positive"),
        ),
        sa.CheckConstraint(
            "locked_until IS NULL OR locked_at IS NOT NULL",
            name=op.f("ck_recurring_rules_lock_state_consistent"),
        ),
        sa.CheckConstraint(
            "run_count >= 0",
            name=op.f("ck_recurring_rules_run_count_non_negative"),
        ),
        sa.CheckConstraint(
            "status <> 'archived' OR archived_at IS NOT NULL",
            name=op.f("ck_recurring_rules_archive_state_consistent"),
        ),
        sa.CheckConstraint(
            "status <> 'paused' OR paused_at IS NOT NULL",
            name=op.f("ck_recurring_rules_pause_state_consistent"),
        ),
        sa.CheckConstraint(
            "status IN ('active', 'paused', 'archived')",
            name=op.f("ck_recurring_rules_status_supported"),
        ),
        sa.CheckConstraint(
            "transaction_type IN ('income', 'expense')",
            name=op.f("ck_recurring_rules_transaction_type_supported"),
        ),
        sa.ForeignKeyConstraint(
            ["account_id", "user_id"],
            ["accounts.id", "accounts.user_id"],
            name=op.f("fk_recurring_rules_account_id_user_id_accounts"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["category_id", "user_id"],
            ["categories.id", "categories.user_id"],
            name=op.f("fk_recurring_rules_category_id_user_id_categories"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_recurring_rules_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_recurring_rules")),
        sa.UniqueConstraint(
            "id",
            "user_id",
            name=op.f("uq_recurring_rules_id_user_id"),
        ),
    )
    op.create_index(
        "ix_recurring_rules_due_active_next_run_at",
        "recurring_rules",
        ["next_run_at"],
        unique=False,
        postgresql_where=sa.text(
            "status = 'active' AND locked_until IS NULL AND archived_at IS NULL"
        ),
    )
    op.create_index(
        "ix_recurring_rules_locked_until",
        "recurring_rules",
        ["locked_until"],
        unique=False,
    )
    op.create_index(
        "ix_recurring_rules_user_id_next_run_at",
        "recurring_rules",
        ["user_id", "next_run_at"],
        unique=False,
    )
    op.create_index(
        "ix_recurring_rules_user_id_status",
        "recurring_rules",
        ["user_id", "status"],
        unique=False,
    )

    op.create_table(
        "outbox_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("event_type", sa.String(length=120), nullable=False),
        sa.Column("aggregate_type", sa.String(length=80), nullable=True),
        sa.Column("aggregate_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("idempotency_key", sa.String(length=255), nullable=False),
        sa.Column(
            "payload",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "status", sa.String(length=20), server_default="pending", nullable=False
        ),
        sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("max_attempts", sa.Integer(), server_default="5", nullable=False),
        sa.Column(
            "available_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_type", sa.String(length=120), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("locked_by", sa.String(length=120), nullable=True),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
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
            "attempts <= max_attempts",
            name=op.f("ck_outbox_events_attempts_not_over_max"),
        ),
        sa.CheckConstraint(
            "attempts >= 0",
            name=op.f("ck_outbox_events_attempts_non_negative"),
        ),
        sa.CheckConstraint(
            "locked_until IS NULL OR locked_at IS NOT NULL",
            name=op.f("ck_outbox_events_lock_state_consistent"),
        ),
        sa.CheckConstraint(
            "max_attempts > 0",
            name=op.f("ck_outbox_events_max_attempts_positive"),
        ),
        sa.CheckConstraint(
            "status <> 'processed' OR processed_at IS NOT NULL",
            name=op.f("ck_outbox_events_processed_state_consistent"),
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'processing', 'processed', 'failed')",
            name=op.f("ck_outbox_events_status_supported"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_outbox_events_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_outbox_events")),
        sa.UniqueConstraint(
            "event_type",
            "idempotency_key",
            name=op.f("uq_outbox_events_event_type_idempotency_key"),
        ),
    )
    op.create_index(
        "ix_outbox_events_aggregate",
        "outbox_events",
        ["aggregate_type", "aggregate_id"],
        unique=False,
    )
    op.create_index(
        "ix_outbox_events_locked_until",
        "outbox_events",
        ["locked_until"],
        unique=False,
    )
    op.create_index(
        "ix_outbox_events_status_available_at",
        "outbox_events",
        ["status", "available_at"],
        unique=False,
    )
    op.create_index(
        "ix_outbox_events_user_id",
        "outbox_events",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_outbox_events_user_id", table_name="outbox_events")
    op.drop_index(
        "ix_outbox_events_status_available_at",
        table_name="outbox_events",
    )
    op.drop_index("ix_outbox_events_locked_until", table_name="outbox_events")
    op.drop_index("ix_outbox_events_aggregate", table_name="outbox_events")
    op.drop_table("outbox_events")
    op.drop_index(
        "ix_recurring_rules_user_id_status",
        table_name="recurring_rules",
    )
    op.drop_index(
        "ix_recurring_rules_user_id_next_run_at",
        table_name="recurring_rules",
    )
    op.drop_index(
        "ix_recurring_rules_locked_until",
        table_name="recurring_rules",
    )
    op.drop_index(
        "ix_recurring_rules_due_active_next_run_at",
        table_name="recurring_rules",
        postgresql_where=sa.text(
            "status = 'active' AND locked_until IS NULL AND archived_at IS NULL"
        ),
    )
    op.drop_table("recurring_rules")
