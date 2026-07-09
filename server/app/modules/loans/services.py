from __future__ import annotations

import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import cast

from app.modules.loans.models import LoanPerson, LoanRecord, LoanSettlement
from app.modules.loans.pagination import (
    InvalidLoanPersonCursorError as PersonCursorDecodeError,
)
from app.modules.loans.pagination import (
    InvalidLoanRecordCursorError as RecordCursorDecodeError,
)
from app.modules.loans.pagination import (
    InvalidLoanSettlementCursorError as SettlementCursorDecodeError,
)
from app.modules.loans.pagination import (
    decode_person_cursor,
    decode_record_cursor,
    decode_settlement_cursor,
    encode_person_cursor,
    encode_record_cursor,
    encode_settlement_cursor,
)
from app.modules.loans.repositories import LoanRepository
from app.modules.loans.schemas import (
    LoanDirection,
    LoanPersonCreateRequest,
    LoanPersonListResponse,
    LoanPersonResponse,
    LoanPersonUpdateRequest,
    LoanRecordCreateRequest,
    LoanRecordListResponse,
    LoanRecordListStatus,
    LoanRecordResponse,
    LoanRecordStatus,
    LoanRecordUpdateRequest,
    LoanSettlementCreateRequest,
    LoanSettlementListResponse,
    LoanSettlementResponse,
    LoanSummaryResponse,
)
from app.modules.users.models import User


class LoanPersonNotFoundError(Exception):
    pass


class LoanRecordNotFoundError(Exception):
    pass


class DuplicateLoanPersonPhoneError(Exception):
    pass


class InvalidLoanPersonStateError(Exception):
    pass


class InvalidLoanRecordStateError(Exception):
    pass


class InvalidLoanSettlementAmountError(Exception):
    pass


class InvalidLoanPersonCursorError(Exception):
    pass


class InvalidLoanRecordCursorError(Exception):
    pass


class InvalidLoanSettlementCursorError(Exception):
    pass


class LoanService:
    def __init__(self, loans: LoanRepository) -> None:
        self.loans = loans

    async def create_person(
        self,
        request: LoanPersonCreateRequest,
        current_user: User,
    ) -> LoanPersonResponse:
        await self.ensure_phone_number_available(
            current_user.id,
            request.phone_number,
            except_person_id=None,
        )
        person = LoanPerson(
            user_id=current_user.id,
            name=request.name,
            phone_number=request.phone_number,
            note=request.note,
        )
        await self.loans.create_person(person)
        await self.loans.commit()
        await self.loans.refresh_person(person)
        return LoanPersonResponse.model_validate(person)

    async def list_people(
        self,
        current_user: User,
        *,
        include_archived: bool,
        cursor: str | None,
        limit: int,
    ) -> LoanPersonListResponse:
        try:
            page_cursor = decode_person_cursor(cursor)
        except PersonCursorDecodeError as exc:
            raise InvalidLoanPersonCursorError from exc

        people = await self.loans.list_people_owned(
            current_user.id,
            include_archived=include_archived,
            cursor=page_cursor,
            limit=limit + 1,
        )
        has_more = len(people) > limit
        visible_people = people[:limit]
        next_cursor = (
            encode_person_cursor(visible_people[-1].created_at, visible_people[-1].id)
            if has_more and visible_people
            else None
        )
        return LoanPersonListResponse(
            items=[
                LoanPersonResponse.model_validate(person) for person in visible_people
            ],
            next_cursor=next_cursor,
            has_more=has_more,
        )

    async def get_person(
        self,
        person_id: uuid.UUID,
        current_user: User,
    ) -> LoanPersonResponse:
        person = await self.get_person_model(person_id, current_user)
        return LoanPersonResponse.model_validate(person)

    async def update_person(
        self,
        person_id: uuid.UUID,
        request: LoanPersonUpdateRequest,
        current_user: User,
    ) -> LoanPersonResponse:
        person = await self.get_person_model(person_id, current_user)
        if person.archived_at is not None:
            raise InvalidLoanPersonStateError

        update_data = request.model_dump(exclude_unset=True)
        if "phone_number" in update_data:
            await self.ensure_phone_number_available(
                current_user.id,
                update_data["phone_number"],
                except_person_id=person.id,
            )
        for field_name in {"name", "phone_number", "note"}:
            if field_name in update_data:
                setattr(person, field_name, update_data[field_name])
        await self.loans.commit()
        await self.loans.refresh_person(person)
        return LoanPersonResponse.model_validate(person)

    async def archive_person(
        self,
        person_id: uuid.UUID,
        current_user: User,
    ) -> LoanPersonResponse:
        person = await self.get_person_model(person_id, current_user)
        if person.archived_at is None:
            person.archived_at = datetime.now(UTC)
            await self.loans.commit()
            await self.loans.refresh_person(person)
        return LoanPersonResponse.model_validate(person)

    async def create_record(
        self,
        request: LoanRecordCreateRequest,
        current_user: User,
    ) -> LoanRecordResponse:
        person = await self.get_person_model(request.person_id, current_user)
        if person.archived_at is not None:
            raise InvalidLoanPersonStateError

        record = LoanRecord(
            user_id=current_user.id,
            person_id=person.id,
            direction=request.direction,
            principal_amount=request.principal_amount,
            currency=request.currency,
            issued_at=request.issued_at,
            status="open",
            note=request.note,
        )
        await self.loans.create_record(record)
        await self.loans.commit()
        await self.loans.refresh_record(record)
        return self.build_record_response(record, settled_amount=Decimal("0"))

    async def list_records(
        self,
        current_user: User,
        *,
        status_filter: LoanRecordListStatus,
        direction: LoanDirection | None,
        person_id: uuid.UUID | None,
        currency: str | None,
        cursor: str | None,
        limit: int,
    ) -> LoanRecordListResponse:
        if person_id is not None:
            await self.get_person_model(person_id, current_user)
        try:
            page_cursor = decode_record_cursor(cursor)
        except RecordCursorDecodeError as exc:
            raise InvalidLoanRecordCursorError from exc

        records = await self.loans.list_records_owned(
            current_user.id,
            status_filter=status_filter,
            direction=direction,
            person_id=person_id,
            currency=currency,
            cursor=page_cursor,
            limit=limit + 1,
        )
        has_more = len(records) > limit
        visible_records = records[:limit]
        settled_amounts = await self.loans.calculate_settled_amounts(
            current_user.id,
            {record.id for record in visible_records},
        )
        next_cursor = (
            encode_record_cursor(
                visible_records[-1].issued_at,
                visible_records[-1].created_at,
                visible_records[-1].id,
            )
            if has_more and visible_records
            else None
        )
        return LoanRecordListResponse(
            items=[
                self.build_record_response(
                    record,
                    settled_amount=settled_amounts.get(record.id, Decimal("0")),
                )
                for record in visible_records
            ],
            next_cursor=next_cursor,
            has_more=has_more,
        )

    async def get_record(
        self,
        record_id: uuid.UUID,
        current_user: User,
    ) -> LoanRecordResponse:
        record = await self.get_record_model(record_id, current_user)
        settled_amount = await self.loans.calculate_settled_amount(
            record.id,
            current_user.id,
        )
        return self.build_record_response(record, settled_amount=settled_amount)

    async def update_record(
        self,
        record_id: uuid.UUID,
        request: LoanRecordUpdateRequest,
        current_user: User,
    ) -> LoanRecordResponse:
        record = await self.get_record_model(record_id, current_user)
        if record.status == "archived":
            raise InvalidLoanRecordStateError

        update_data = request.model_dump(exclude_unset=True)
        if "person_id" in update_data:
            person = await self.get_person_model(update_data["person_id"], current_user)
            if person.archived_at is not None:
                raise InvalidLoanPersonStateError

        for field_name in {
            "person_id",
            "direction",
            "principal_amount",
            "currency",
            "issued_at",
            "note",
        }:
            if field_name in update_data:
                setattr(record, field_name, update_data[field_name])

        settled_amount = await self.loans.calculate_settled_amount(
            record.id,
            current_user.id,
        )
        if settled_amount > record.principal_amount:
            raise InvalidLoanSettlementAmountError
        self.apply_record_state(record, settled_amount)
        await self.loans.commit()
        await self.loans.refresh_record(record)
        return self.build_record_response(record, settled_amount=settled_amount)

    async def archive_record(
        self,
        record_id: uuid.UUID,
        current_user: User,
    ) -> LoanRecordResponse:
        record = await self.get_record_model(record_id, current_user)
        if record.status != "archived":
            record.status = "archived"
            record.archived_at = datetime.now(UTC)
            await self.loans.commit()
            await self.loans.refresh_record(record)
        return await self.get_record(record.id, current_user)

    async def create_settlement(
        self,
        record_id: uuid.UUID,
        request: LoanSettlementCreateRequest,
        current_user: User,
    ) -> LoanSettlementResponse:
        record = await self.get_record_model(record_id, current_user)
        if record.status == "archived":
            raise InvalidLoanRecordStateError

        settled_amount = await self.loans.calculate_settled_amount(
            record.id,
            current_user.id,
        )
        outstanding_amount = record.principal_amount - settled_amount
        if outstanding_amount <= Decimal("0") or request.amount > outstanding_amount:
            raise InvalidLoanSettlementAmountError

        settlement = LoanSettlement(
            user_id=current_user.id,
            record_id=record.id,
            amount=request.amount,
            currency=record.currency,
            settled_at=request.settled_at,
            note=request.note,
        )
        await self.loans.create_settlement(settlement)
        self.apply_record_state(record, settled_amount + request.amount)
        await self.loans.commit()
        await self.loans.refresh_settlement(settlement)
        return LoanSettlementResponse.model_validate(settlement)

    async def list_settlements(
        self,
        record_id: uuid.UUID,
        current_user: User,
        *,
        cursor: str | None,
        limit: int,
    ) -> LoanSettlementListResponse:
        record = await self.get_record_model(record_id, current_user)
        try:
            page_cursor = decode_settlement_cursor(cursor)
        except SettlementCursorDecodeError as exc:
            raise InvalidLoanSettlementCursorError from exc

        settlements = await self.loans.list_settlements_owned(
            record.id,
            current_user.id,
            cursor=page_cursor,
            limit=limit + 1,
        )
        has_more = len(settlements) > limit
        visible_settlements = settlements[:limit]
        next_cursor = (
            encode_settlement_cursor(
                visible_settlements[-1].settled_at,
                visible_settlements[-1].created_at,
                visible_settlements[-1].id,
            )
            if has_more and visible_settlements
            else None
        )
        return LoanSettlementListResponse(
            items=[
                LoanSettlementResponse.model_validate(settlement)
                for settlement in visible_settlements
            ],
            next_cursor=next_cursor,
            has_more=has_more,
        )

    async def get_summary(
        self,
        current_user: User,
        *,
        currency: str | None,
    ) -> LoanSummaryResponse:
        summary_currency = currency or current_user.base_currency
        total_given, total_taken = await self.loans.calculate_summary(
            current_user.id,
            summary_currency,
        )
        return LoanSummaryResponse(
            currency=summary_currency,
            total_loan_given=total_given,
            total_loan_taken=total_taken,
            due_loan=total_given - total_taken,
        )

    async def get_person_model(
        self,
        person_id: uuid.UUID,
        current_user: User,
    ) -> LoanPerson:
        person = await self.loans.get_person_owned(person_id, current_user.id)
        if person is None:
            raise LoanPersonNotFoundError
        return person

    async def get_record_model(
        self,
        record_id: uuid.UUID,
        current_user: User,
    ) -> LoanRecord:
        record = await self.loans.get_record_owned(record_id, current_user.id)
        if record is None:
            raise LoanRecordNotFoundError
        return record

    async def ensure_phone_number_available(
        self,
        user_id: uuid.UUID,
        phone_number: str,
        *,
        except_person_id: uuid.UUID | None,
    ) -> None:
        existing_person = await self.loans.get_person_by_phone(user_id, phone_number)
        if existing_person is None:
            return
        if except_person_id is not None and existing_person.id == except_person_id:
            return
        raise DuplicateLoanPersonPhoneError

    def apply_record_state(
        self,
        record: LoanRecord,
        settled_amount: Decimal,
    ) -> None:
        if record.status == "archived":
            return
        if settled_amount >= record.principal_amount:
            if record.status != "settled":
                record.status = "settled"
                record.settled_at = datetime.now(UTC)
        elif record.status == "settled":
            record.status = "open"
            record.settled_at = None

    def build_record_response(
        self,
        record: LoanRecord,
        *,
        settled_amount: Decimal,
    ) -> LoanRecordResponse:
        outstanding_amount = max(
            record.principal_amount - settled_amount,
            Decimal("0"),
        )
        return LoanRecordResponse(
            id=record.id,
            person_id=record.person_id,
            direction=cast(LoanDirection, record.direction),
            principal_amount=record.principal_amount,
            settled_amount=settled_amount,
            outstanding_amount=outstanding_amount,
            currency=record.currency,
            issued_at=record.issued_at,
            status=cast(LoanRecordStatus, record.status),
            note=record.note,
            settled_at=record.settled_at,
            archived_at=record.archived_at,
            created_at=record.created_at,
            updated_at=record.updated_at,
        )
