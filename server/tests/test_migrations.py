from pathlib import Path

from alembic.config import Config

from alembic import command


def build_alembic_config(database_url: str) -> Config:
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def test_alembic_upgrade_downgrade_upgrade_smoke(
    disposable_postgres_url: str,
) -> None:
    config = build_alembic_config(disposable_postgres_url)

    command.upgrade(config, "head")
    command.downgrade(config, "base")
    command.upgrade(config, "head")
