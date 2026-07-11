from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.modules.accounts.repositories import AccountRepository
from app.modules.auth.dependencies import CurrentUserDependency
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
    LoanRecordUpdateRequest,
    LoanSettlementCreateRequest,
    LoanSettlementListResponse,
    LoanSettlementResponse,
    LoanSummaryResponse,
)
from app.modules.loans.services import (
    DuplicateLoanPersonPhoneError,
    InvalidLoanAccountStateError,
    InvalidLoanPersonCursorError,
    InvalidLoanPersonStateError,
    InvalidLoanRecordCursorError,
    InvalidLoanRecordStateError,
    InvalidLoanSettlementAmountError,
    InvalidLoanSettlementCursorError,
    LoanAccountNotFoundError,
    LoanPersonNotFoundError,
    LoanRecordNotFoundError,
    LoanService,
)

router = APIRouter(prefix="/loans", tags=["loans"])
SessionDependency = Annotated[AsyncSession, Depends(get_session)]


def build_loan_service(session: AsyncSession) -> LoanService:
    return LoanService(
        loans=LoanRepository(session),
        accounts=AccountRepository(session),
    )


@router.post(
    "/people",
    response_model=LoanPersonResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_loan_person(
    request: LoanPersonCreateRequest,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> LoanPersonResponse:
    try:
        return await build_loan_service(session).create_person(request, current_user)
    except DuplicateLoanPersonPhoneError as exc:
        raise duplicate_phone_error() from exc


@router.get("/people", response_model=LoanPersonListResponse)
async def list_loan_people(
    current_user: CurrentUserDependency,
    session: SessionDependency,
    include_archived: Annotated[bool, Query()] = False,
    cursor: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> LoanPersonListResponse:
    try:
        return await build_loan_service(session).list_people(
            current_user,
            include_archived=include_archived,
            cursor=cursor,
            limit=limit,
        )
    except InvalidLoanPersonCursorError as exc:
        raise invalid_person_cursor_error() from exc


@router.get("/summary", response_model=LoanSummaryResponse)
async def get_loan_summary(
    current_user: CurrentUserDependency,
    session: SessionDependency,
    currency: Annotated[str | None, Query(min_length=3, max_length=3)] = None,
) -> LoanSummaryResponse:
    return await build_loan_service(session).get_summary(
        current_user,
        currency=normalize_currency(currency),
    )


@router.post(
    "/records",
    response_model=LoanRecordResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_loan_record(
    request: LoanRecordCreateRequest,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> LoanRecordResponse:
    try:
        return await build_loan_service(session).create_record(request, current_user)
    except LoanPersonNotFoundError as exc:
        raise person_not_found_error() from exc
    except InvalidLoanPersonStateError as exc:
        raise invalid_person_state_error() from exc
    except LoanAccountNotFoundError as exc:
        raise account_not_found_error() from exc
    except InvalidLoanAccountStateError as exc:
        raise invalid_account_state_error() from exc


@router.get("/records", response_model=LoanRecordListResponse)
async def list_loan_records(
    current_user: CurrentUserDependency,
    session: SessionDependency,
    status_filter: Annotated[LoanRecordListStatus, Query(alias="status")] = "all",
    direction: Annotated[LoanDirection | None, Query()] = None,
    person_id: Annotated[str | None, Query()] = None,
    currency: Annotated[str | None, Query(min_length=3, max_length=3)] = None,
    cursor: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> LoanRecordListResponse:
    try:
        return await build_loan_service(session).list_records(
            current_user,
            status_filter=status_filter,
            direction=direction,
            person_id=parse_uuid_or_422(person_id),
            currency=normalize_currency(currency),
            cursor=cursor,
            limit=limit,
        )
    except LoanPersonNotFoundError as exc:
        raise invalid_record_filter_error() from exc
    except InvalidLoanRecordCursorError as exc:
        raise invalid_record_cursor_error() from exc


@router.get("/people/{person_id}", response_model=LoanPersonResponse)
async def get_loan_person(
    person_id: str,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> LoanPersonResponse:
    try:
        return await build_loan_service(session).get_person(
            parse_uuid_or_404(person_id),
            current_user,
        )
    except LoanPersonNotFoundError as exc:
        raise person_not_found_error() from exc


@router.patch("/people/{person_id}", response_model=LoanPersonResponse)
async def update_loan_person(
    person_id: str,
    request: LoanPersonUpdateRequest,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> LoanPersonResponse:
    try:
        return await build_loan_service(session).update_person(
            parse_uuid_or_404(person_id),
            request,
            current_user,
        )
    except LoanPersonNotFoundError as exc:
        raise person_not_found_error() from exc
    except DuplicateLoanPersonPhoneError as exc:
        raise duplicate_phone_error() from exc
    except InvalidLoanPersonStateError as exc:
        raise invalid_person_state_error() from exc


@router.delete("/people/{person_id}", response_model=LoanPersonResponse)
async def archive_loan_person(
    person_id: str,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> LoanPersonResponse:
    try:
        return await build_loan_service(session).archive_person(
            parse_uuid_or_404(person_id),
            current_user,
        )
    except LoanPersonNotFoundError as exc:
        raise person_not_found_error() from exc


@router.get("/records/{record_id}", response_model=LoanRecordResponse)
async def get_loan_record(
    record_id: str,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> LoanRecordResponse:
    try:
        return await build_loan_service(session).get_record(
            parse_uuid_or_404(record_id),
            current_user,
        )
    except LoanRecordNotFoundError as exc:
        raise record_not_found_error() from exc


@router.patch("/records/{record_id}", response_model=LoanRecordResponse)
async def update_loan_record(
    record_id: str,
    request: LoanRecordUpdateRequest,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> LoanRecordResponse:
    try:
        return await build_loan_service(session).update_record(
            parse_uuid_or_404(record_id),
            request,
            current_user,
        )
    except LoanRecordNotFoundError as exc:
        raise record_not_found_error() from exc
    except LoanPersonNotFoundError as exc:
        raise person_not_found_error() from exc
    except InvalidLoanPersonStateError as exc:
        raise invalid_person_state_error() from exc
    except InvalidLoanRecordStateError as exc:
        raise invalid_record_state_error() from exc
    except InvalidLoanSettlementAmountError as exc:
        raise invalid_settlement_amount_error() from exc
    except LoanAccountNotFoundError as exc:
        raise account_not_found_error() from exc
    except InvalidLoanAccountStateError as exc:
        raise invalid_account_state_error() from exc


@router.delete("/records/{record_id}", response_model=LoanRecordResponse)
async def archive_loan_record(
    record_id: str,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> LoanRecordResponse:
    try:
        return await build_loan_service(session).archive_record(
            parse_uuid_or_404(record_id),
            current_user,
        )
    except LoanRecordNotFoundError as exc:
        raise record_not_found_error() from exc


@router.post(
    "/records/{record_id}/settlements",
    response_model=LoanSettlementResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_loan_settlement(
    record_id: str,
    request: LoanSettlementCreateRequest,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> LoanSettlementResponse:
    try:
        return await build_loan_service(session).create_settlement(
            parse_uuid_or_404(record_id),
            request,
            current_user,
        )
    except LoanRecordNotFoundError as exc:
        raise record_not_found_error() from exc
    except InvalidLoanRecordStateError as exc:
        raise invalid_record_state_error() from exc
    except InvalidLoanSettlementAmountError as exc:
        raise invalid_settlement_amount_error() from exc


@router.get(
    "/records/{record_id}/settlements",
    response_model=LoanSettlementListResponse,
)
async def list_loan_settlements(
    record_id: str,
    current_user: CurrentUserDependency,
    session: SessionDependency,
    cursor: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> LoanSettlementListResponse:
    try:
        return await build_loan_service(session).list_settlements(
            parse_uuid_or_404(record_id),
            current_user,
            cursor=cursor,
            limit=limit,
        )
    except LoanRecordNotFoundError as exc:
        raise record_not_found_error() from exc
    except InvalidLoanSettlementCursorError as exc:
        raise invalid_settlement_cursor_error() from exc


def parse_uuid_or_404(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError as exc:
        raise record_not_found_error() from exc


def parse_uuid_or_422(value: str | None) -> uuid.UUID | None:
    if value is None:
        return None
    try:
        return uuid.UUID(value)
    except ValueError as exc:
        raise invalid_record_filter_error() from exc


def normalize_currency(currency: str | None) -> str | None:
    if currency is None:
        return None
    normalized_currency = currency.strip().upper()
    if len(normalized_currency) != 3 or not normalized_currency.isalpha():
        raise invalid_record_filter_error()
    return normalized_currency


def person_not_found_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Loan person not found",
    )


def record_not_found_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Loan record not found",
    )


def account_not_found_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Account not found",
    )


def invalid_account_state_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Account is disabled or archived",
    )


def duplicate_phone_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Phone number already exists",
    )


def invalid_person_state_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Loan person is archived",
    )


def invalid_record_state_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Loan record is archived",
    )


def invalid_settlement_amount_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Settlement amount exceeds outstanding loan amount",
    )


def invalid_record_filter_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail="Loan record filter is invalid",
    )


def invalid_person_cursor_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail="Loan person cursor is invalid",
    )


def invalid_record_cursor_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail="Loan record cursor is invalid",
    )


def invalid_settlement_cursor_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail="Loan settlement cursor is invalid",
    )
