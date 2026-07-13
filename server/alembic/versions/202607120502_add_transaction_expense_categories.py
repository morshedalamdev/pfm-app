"""Add transaction expense categories.

Revision ID: 202607120502
Revises: 202607110305
Create Date: 2026-07-12 05:02:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "202607120502"
down_revision: str | None = "202607110305"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            INSERT INTO categories (
                id,
                user_id,
                name,
                kind,
                icon_key,
                is_default,
                is_archived
            )
            SELECT
                md5(users.id::text || ':expense:' || category.name)::uuid,
                users.id,
                category.name,
                'expense',
                category.icon_key,
                true,
                false
            FROM users
            CROSS JOIN (
                VALUES
                    ('Hangout', 'coffee'),
                    ('Vacation', 'plane'),
                    ('Party', 'party-popper')
            ) AS category(name, icon_key)
            ON CONFLICT (user_id, kind, name) DO NOTHING
            """
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            """
            DELETE FROM categories
            USING users
            WHERE categories.user_id = users.id
                AND categories.kind = 'expense'
                AND categories.id = md5(
                    users.id::text || ':expense:' || categories.name
                )::uuid
                AND categories.name IN ('Hangout', 'Vacation', 'Party')
            """
        )
    )
