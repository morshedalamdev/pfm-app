"""add finance domain schema

Revision ID: 202606150301
Revises: 202606150201
Create Date: 2026-06-15 03:01:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "202606150301"
down_revision: str | None = "202606150201"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("type", sa.String(length=40), nullable=False),
        sa.Column(
            "currency", sa.String(length=3), server_default="USD", nullable=False
        ),
        sa.Column(
            "opening_balance",
            sa.Numeric(precision=18, scale=4),
            server_default="0",
            nullable=False,
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
            "opening_balance >= 0",
            name=op.f("ck_accounts_opening_balance_non_negative"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_accounts_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_accounts")),
        sa.UniqueConstraint("id", "user_id", name=op.f("uq_accounts_id_user_id")),
    )
    op.create_index("ix_accounts_user_id", "accounts", ["user_id"], unique=False)
    op.create_index(
        "ix_accounts_user_id_archived_at",
        "accounts",
        ["user_id", "archived_at"],
        unique=False,
    )
    op.create_index(
        "ix_accounts_user_id_name",
        "accounts",
        ["user_id", "name"],
        unique=False,
    )

    op.create_table(
        "categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column("icon_key", sa.String(length=80), nullable=False),
        sa.Column("is_default", sa.Boolean(), server_default="false", nullable=False),
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
            "kind IN ('income', 'expense')",
            name=op.f("ck_categories_kind_supported"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_categories_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_categories")),
        sa.UniqueConstraint("id", "user_id", name=op.f("uq_categories_id_user_id")),
        sa.UniqueConstraint(
            "user_id",
            "kind",
            "name",
            name=op.f("uq_categories_user_kind_name"),
        ),
    )
    op.create_index("ix_categories_user_id", "categories", ["user_id"], unique=False)
    op.create_index(
        "ix_categories_user_id_archived_at",
        "categories",
        ["user_id", "archived_at"],
        unique=False,
    )
    op.create_index(
        "ix_categories_user_id_kind",
        "categories",
        ["user_id", "kind"],
        unique=False,
    )

    op.create_table(
        "idempotency_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("operation", sa.String(length=120), nullable=False),
        sa.Column("idempotency_key", sa.String(length=255), nullable=False),
        sa.Column("request_hash", sa.String(length=128), nullable=False),
        sa.Column("response_status_code", sa.Integer(), nullable=True),
        sa.Column(
            "response_body", postgresql.JSONB(astext_type=sa.Text()), nullable=True
        ),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
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
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_idempotency_records_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_idempotency_records")),
        sa.UniqueConstraint(
            "user_id",
            "operation",
            "idempotency_key",
            name=op.f("uq_idempotency_records_user_operation_key"),
        ),
    )
    op.create_index(
        "ix_idempotency_records_expires_at",
        "idempotency_records",
        ["expires_at"],
        unique=False,
    )
    op.create_index(
        "ix_idempotency_records_user_id",
        "idempotency_records",
        ["user_id"],
        unique=False,
    )

    op.create_table(
        "transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column("amount", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column(
            "currency", sa.String(length=3), server_default="USD", nullable=False
        ),
        sa.Column("transaction_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("voided_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.CheckConstraint("amount > 0", name=op.f("ck_transactions_amount_positive")),
        sa.CheckConstraint(
            "type IN ('income', 'expense', 'transfer_debit', 'transfer_credit')",
            name=op.f("ck_transactions_type_supported"),
        ),
        sa.ForeignKeyConstraint(
            ["account_id", "user_id"],
            ["accounts.id", "accounts.user_id"],
            name=op.f("fk_transactions_account_id_user_id_accounts"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["category_id", "user_id"],
            ["categories.id", "categories.user_id"],
            name=op.f("fk_transactions_category_id_user_id_categories"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_transactions_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_transactions")),
        sa.UniqueConstraint("id", "user_id", name=op.f("uq_transactions_id_user_id")),
    )
    op.create_index(
        "ix_transactions_user_id_account_id_transaction_at",
        "transactions",
        ["user_id", "account_id", "transaction_at"],
        unique=False,
    )
    op.create_index(
        "ix_transactions_user_id_category_id_transaction_at",
        "transactions",
        ["user_id", "category_id", "transaction_at"],
        unique=False,
    )
    op.create_index(
        "ix_transactions_user_id_transaction_at",
        "transactions",
        ["user_id", "transaction_at"],
        unique=False,
    )
    op.create_index(
        "ix_transactions_user_id_type_transaction_at",
        "transactions",
        ["user_id", "type", "transaction_at"],
        unique=False,
    )

    op.create_table(
        "transfer_links",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "debit_transaction_id", postgresql.UUID(as_uuid=True), nullable=False
        ),
        sa.Column(
            "credit_transaction_id", postgresql.UUID(as_uuid=True), nullable=False
        ),
        sa.Column("amount", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column(
            "currency", sa.String(length=3), server_default="USD", nullable=False
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "amount > 0", name=op.f("ck_transfer_links_amount_positive")
        ),
        sa.CheckConstraint(
            "debit_transaction_id <> credit_transaction_id",
            name=op.f("ck_transfer_links_distinct_transaction_rows"),
        ),
        sa.ForeignKeyConstraint(
            ["credit_transaction_id", "user_id"],
            ["transactions.id", "transactions.user_id"],
            name=op.f("fk_transfer_links_credit_transaction_id_user_id_transactions"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["debit_transaction_id", "user_id"],
            ["transactions.id", "transactions.user_id"],
            name=op.f("fk_transfer_links_debit_transaction_id_user_id_transactions"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_transfer_links_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_transfer_links")),
        sa.UniqueConstraint("id", "user_id", name=op.f("uq_transfer_links_id_user_id")),
        sa.UniqueConstraint(
            "credit_transaction_id",
            name=op.f("uq_transfer_links_credit_transaction_id"),
        ),
        sa.UniqueConstraint(
            "debit_transaction_id",
            name=op.f("uq_transfer_links_debit_transaction_id"),
        ),
    )
    op.create_index(
        "ix_transfer_links_user_id_created_at",
        "transfer_links",
        ["user_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_transfer_links_user_id_created_at", table_name="transfer_links")
    op.drop_table("transfer_links")
    op.drop_index(
        "ix_transactions_user_id_type_transaction_at",
        table_name="transactions",
    )
    op.drop_index(
        "ix_transactions_user_id_transaction_at",
        table_name="transactions",
    )
    op.drop_index(
        "ix_transactions_user_id_category_id_transaction_at",
        table_name="transactions",
    )
    op.drop_index(
        "ix_transactions_user_id_account_id_transaction_at",
        table_name="transactions",
    )
    op.drop_table("transactions")
    op.drop_index("ix_idempotency_records_user_id", table_name="idempotency_records")
    op.drop_index("ix_idempotency_records_expires_at", table_name="idempotency_records")
    op.drop_table("idempotency_records")
    op.drop_index("ix_categories_user_id_kind", table_name="categories")
    op.drop_index("ix_categories_user_id_archived_at", table_name="categories")
    op.drop_index("ix_categories_user_id", table_name="categories")
    op.drop_table("categories")
    op.drop_index("ix_accounts_user_id_name", table_name="accounts")
    op.drop_index("ix_accounts_user_id_archived_at", table_name="accounts")
    op.drop_index("ix_accounts_user_id", table_name="accounts")
    op.drop_table("accounts")
