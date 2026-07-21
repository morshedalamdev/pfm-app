from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import (
    OAuthIdentity,
    OAuthLinkIntent,
    OAuthLoginExchange,
    RefreshSession,
)


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


class OAuthIdentityRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_provider_subject(
        self,
        provider: str,
        provider_subject: str,
    ) -> OAuthIdentity | None:
        result = await self._session.execute(
            select(OAuthIdentity).where(
                OAuthIdentity.provider == provider,
                OAuthIdentity.provider_subject == provider_subject,
            )
        )
        return result.scalar_one_or_none()

    async def get_by_user_provider(
        self,
        user_id: uuid.UUID,
        provider: str,
    ) -> OAuthIdentity | None:
        result = await self._session.execute(
            select(OAuthIdentity).where(
                OAuthIdentity.user_id == user_id,
                OAuthIdentity.provider == provider,
            )
        )
        return result.scalar_one_or_none()

    async def list_by_user(self, user_id: uuid.UUID) -> list[OAuthIdentity]:
        result = await self._session.execute(
            select(OAuthIdentity)
            .where(OAuthIdentity.user_id == user_id)
            .order_by(OAuthIdentity.provider)
        )
        return list(result.scalars().all())

    async def create(self, identity: OAuthIdentity) -> OAuthIdentity:
        self._session.add(identity)
        await self._session.flush()
        return identity

    async def commit(self) -> None:
        await self._session.commit()

    async def rollback(self) -> None:
        await self._session.rollback()


class OAuthLoginExchangeRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_code_hash_for_update(
        self,
        code_hash: str,
    ) -> OAuthLoginExchange | None:
        result = await self._session.execute(
            select(OAuthLoginExchange)
            .where(OAuthLoginExchange.code_hash == code_hash)
            .with_for_update()
        )
        return result.scalar_one_or_none()

    async def create(
        self,
        exchange: OAuthLoginExchange,
    ) -> OAuthLoginExchange:
        self._session.add(exchange)
        await self._session.flush()
        return exchange


class OAuthLinkIntentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_code_hash_for_update(
        self,
        code_hash: str,
    ) -> OAuthLinkIntent | None:
        result = await self._session.execute(
            select(OAuthLinkIntent)
            .where(OAuthLinkIntent.code_hash == code_hash)
            .with_for_update()
        )
        return result.scalar_one_or_none()

    async def create(self, intent: OAuthLinkIntent) -> OAuthLinkIntent:
        self._session.add(intent)
        await self._session.flush()
        return intent

    async def commit(self) -> None:
        await self._session.commit()

    async def rollback(self) -> None:
        await self._session.rollback()
