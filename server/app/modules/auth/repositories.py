from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import RefreshSession


class RefreshSessionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_token_hash(self, token_hash: str) -> RefreshSession | None:
        result = await self._session.execute(
            select(RefreshSession).where(RefreshSession.token_hash == token_hash)
        )
        return result.scalar_one_or_none()

    async def get_by_token_hash_for_update(
        self,
        token_hash: str,
    ) -> RefreshSession | None:
        result = await self._session.execute(
            select(RefreshSession)
            .where(RefreshSession.token_hash == token_hash)
            .with_for_update()
        )
        return result.scalar_one_or_none()

    async def list_active_by_family_for_update(
        self,
        session_family_id: uuid.UUID,
    ) -> list[RefreshSession]:
        result = await self._session.execute(
            select(RefreshSession)
            .where(
                RefreshSession.session_family_id == session_family_id,
                RefreshSession.revoked_at.is_(None),
            )
            .with_for_update()
        )
        return list(result.scalars().all())

    def add(self, refresh_session: RefreshSession) -> None:
        self._session.add(refresh_session)

    async def create(self, refresh_session: RefreshSession) -> RefreshSession:
        self.add(refresh_session)
        await self._session.flush()
        return refresh_session

    async def commit(self) -> None:
        await self._session.commit()

    async def rollback(self) -> None:
        await self._session.rollback()
