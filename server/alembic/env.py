from __future__ import annotations

import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context
from app.core.config import get_settings
from app.core.database import Base
from app.modules.accounts import models as account_models  # noqa: F401
from app.modules.auth import models as auth_models  # noqa: F401
from app.modules.budgets import models as budget_models  # noqa: F401
from app.modules.categories import models as category_models  # noqa: F401
from app.modules.idempotency import models as idempotency_models  # noqa: F401
from app.modules.loans import models as loan_models  # noqa: F401
from app.modules.notifications import models as notification_models  # noqa: F401
from app.modules.outbox import models as outbox_models  # noqa: F401
from app.modules.receipts import models as receipt_models  # noqa: F401
from app.modules.recurring import models as recurring_models  # noqa: F401
from app.modules.savings import models as savings_models  # noqa: F401
from app.modules.transactions import models as transaction_models  # noqa: F401
from app.modules.users import models as user_models  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_database_url() -> str:
    configured_url = config.get_main_option("sqlalchemy.url")
    settings = get_settings()
    return configured_url or settings.migration_database_url or settings.database_url


def run_migrations_offline() -> None:
    context.configure(
        url=get_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = get_database_url()
    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
