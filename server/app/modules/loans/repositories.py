from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy import Select, and_, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.loans.models import LoanPerson, LoanRecord, LoanSettlement
from app.modules.loans.pagination import (
    LoanPersonPageCursor,
    LoanRecordPageCursor,
    LoanSettlementPageCursor,
)
from app.modules.loans.schemas import LoanDirection, LoanRecordListStatus


class LoanRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create_person(self, person: LoanPerson) -> LoanPerson:
        self._session.add(person)
        await self._session.flush()
        return person

    async def create_record(self, record: LoanRecord) -> LoanRecord:
        self._session.add(record)
        await self._session.flush()
        return record

    async def create_settlement(self, settlement: LoanSettlement) -> LoanSettlement:
        self._session.add(settlement)
        await self._session.flush()
        return settlement

    async def refresh_person(self, person: LoanPerson) -> None:
        await self._session.refresh(person)

    async def refresh_record(self, record: LoanRecord) -> None:
        await self._session.refresh(record)

    async def refresh_settlement(self, settlement: LoanSettlement) -> None:
        await self._session.refresh(settlement)

    async def get_person_owned(
        self,
        person_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> LoanPerson | None:
        result = await self._session.execute(
            select(LoanPerson).where(
                LoanPerson.id == person_id,
                LoanPerson.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_person_by_phone(
        self,
        user_id: uuid.UUID,
        phone_number: str,
    ) -> LoanPerson | None:
        result = await self._session.execute(
            select(LoanPerson).where(
                LoanPerson.user_id == user_id,
                LoanPerson.phone_number == phone_number,
            )
        )
        return result.scalar_one_or_none()

    async def list_people_owned(
        self,
        user_id: uuid.UUID,
        *,
        include_archived: bool,
        cursor: LoanPersonPageCursor | None,
        limit: int,
    ) -> list[LoanPerson]:
        query = select(LoanPerson).where(LoanPerson.user_id == user_id)
        if not include_archived:
            query = query.where(LoanPerson.archived_at.is_(None))
        query = apply_person_cursor(query, cursor)
        result = await self._session.execute(
            query.order_by(desc(LoanPerson.created_at), desc(LoanPerson.id)).limit(
                limit
            )
        )
        return list(result.scalars().all())

    async def get_record_owned(
        self,
        record_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> LoanRecord | None:
        result = await self._session.execute(
            select(LoanRecord).where(
                LoanRecord.id == record_id,
                LoanRecord.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_records_owned(
        self,
        user_id: uuid.UUID,
        *,
        status_filter: LoanRecordListStatus,
        direction: LoanDirection | None,
        person_id: uuid.UUID | None,
        currency: str | None,
        cursor: LoanRecordPageCursor | None,
        limit: int,
    ) -> list[LoanRecord]:
        query = select(LoanRecord).where(LoanRecord.user_id == user_id)
        if status_filter == "all":
            query = query.where(LoanRecord.status != "archived")
        else:
            query = query.where(LoanRecord.status == status_filter)
        if direction is not None:
            query = query.where(LoanRecord.direction == direction)
        if person_id is not None:
            query = query.where(LoanRecord.person_id == person_id)
        if currency is not None:
            query = query.where(LoanRecord.currency == currency)
        query = apply_record_cursor(query, cursor)
        result = await self._session.execute(
            query.order_by(
                desc(LoanRecord.issued_at),
                desc(LoanRecord.created_at),
                desc(LoanRecord.id),
            ).limit(limit)
        )
        return list(result.scalars().all())

    async def list_settlements_owned(
        self,
        record_id: uuid.UUID,
        user_id: uuid.UUID,
        *,
        cursor: LoanSettlementPageCursor | None,
        limit: int,
    ) -> list[LoanSettlement]:
        query = select(LoanSettlement).where(
            LoanSettlement.record_id == record_id,
            LoanSettlement.user_id == user_id,
        )
        query = apply_settlement_cursor(query, cursor)
        result = await self._session.execute(
            query.order_by(
                desc(LoanSettlement.settled_at),
                desc(LoanSettlement.created_at),
                desc(LoanSettlement.id),
            ).limit(limit)
        )
        return list(result.scalars().all())

    async def calculate_settled_amount(
        self,
        record_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Decimal:
        result = await self._session.execute(
            select(func.coalesce(func.sum(LoanSettlement.amount), Decimal("0"))).where(
                LoanSettlement.record_id == record_id,
                LoanSettlement.user_id == user_id,
            )
        )
        return coerce_decimal(result.scalar_one())

    async def calculate_settled_amounts(
        self,
        user_id: uuid.UUID,
        record_ids: set[uuid.UUID],
    ) -> dict[uuid.UUID, Decimal]:
        if not record_ids:
            return {}

        result = await self._session.execute(
            select(LoanSettlement.record_id, func.sum(LoanSettlement.amount))
            .where(
                LoanSettlement.user_id == user_id,
                LoanSettlement.record_id.in_(record_ids),
            )
            .group_by(LoanSettlement.record_id)
        )
        return {record_id: coerce_decimal(amount) for record_id, amount in result.all()}

    async def calculate_summary(
        self,
        user_id: uuid.UUID,
        currency: str,
    ) -> tuple[Decimal, Decimal]:
        records = await self.list_records_owned(
            user_id,
            status_filter="all",
            direction=None,
            person_id=None,
            currency=currency,
            cursor=None,
            limit=10_000,
        )
        settled_amounts = await self.calculate_settled_amounts(
            user_id,
            {record.id for record in records},
        )
        total_given = Decimal("0")
        total_taken = Decimal("0")
        for record in records:
            outstanding_amount = max(
                record.principal_amount - settled_amounts.get(record.id, Decimal("0")),
                Decimal("0"),
            )
            if record.direction == "given":
                total_given += outstanding_amount
            else:
                total_taken += outstanding_amount
        return total_given, total_taken

    async def commit(self) -> None:
        await self._session.commit()

    async def rollback(self) -> None:
        await self._session.rollback()


def apply_person_cursor(
    query: Select[tuple[LoanPerson]],
    cursor: LoanPersonPageCursor | None,
) -> Select[tuple[LoanPerson]]:
    if cursor is None:
        return query

    return query.where(
        or_(
            LoanPerson.created_at < cursor.created_at,
            and_(
                LoanPerson.created_at == cursor.created_at,
                LoanPerson.id < cursor.id,
            ),
        )
    )


def apply_record_cursor(
    query: Select[tuple[LoanRecord]],
    cursor: LoanRecordPageCursor | None,
) -> Select[tuple[LoanRecord]]:
    if cursor is None:
        return query

    return query.where(
        or_(
            LoanRecord.issued_at < cursor.issued_at,
            and_(
                LoanRecord.issued_at == cursor.issued_at,
                LoanRecord.created_at < cursor.created_at,
            ),
            and_(
                LoanRecord.issued_at == cursor.issued_at,
                LoanRecord.created_at == cursor.created_at,
                LoanRecord.id < cursor.id,
            ),
        )
    )


def apply_settlement_cursor(
    query: Select[tuple[LoanSettlement]],
    cursor: LoanSettlementPageCursor | None,
) -> Select[tuple[LoanSettlement]]:
    if cursor is None:
        return query

    return query.where(
        or_(
            LoanSettlement.settled_at < cursor.settled_at,
            and_(
                LoanSettlement.settled_at == cursor.settled_at,
                LoanSettlement.created_at < cursor.created_at,
            ),
            and_(
                LoanSettlement.settled_at == cursor.settled_at,
                LoanSettlement.created_at == cursor.created_at,
                LoanSettlement.id < cursor.id,
            ),
        )
    )


def coerce_decimal(value: object) -> Decimal:
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))
