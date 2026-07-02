from collections.abc import AsyncIterator

from sqlalchemy import MetaData, text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


def build_async_engine(
    database_url: str,
    *,
    echo: bool = False,
    pool_size: int = 5,
    max_overflow: int = 10,
) -> AsyncEngine:
    return create_async_engine(
        database_url,
        echo=echo,
        pool_pre_ping=True,
        pool_size=pool_size,
        max_overflow=max_overflow,
    )


def build_session_factory(
    engine: AsyncEngine,
) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )


settings = get_settings()
engine = build_async_engine(
    settings.database_url,
    echo=settings.database_echo,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
)
async_session_factory = build_session_factory(engine)


async def get_session_from_factory(
    session_factory: async_sessionmaker[AsyncSession],
) -> AsyncIterator[AsyncSession]:
    async with session_factory() as session:
        yield session


async def get_session() -> AsyncIterator[AsyncSession]:
    async for session in get_session_from_factory(async_session_factory):
        yield session


async def check_database_connection(target_engine: AsyncEngine = engine) -> bool:
    async with target_engine.connect() as connection:
        result = await connection.execute(text("SELECT 1"))
        return bool(result.scalar_one() == 1)
