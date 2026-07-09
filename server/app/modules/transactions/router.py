import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.modules.accounts.repositories import AccountRepository
from app.modules.auth.dependencies import CurrentUserDependency
from app.modules.categories.repositories import CategoryRepository
from app.modules.idempotency.repositories import IdempotencyRepository
from app.modules.savings.repositories import SavingsRepository
from app.modules.transactions.repositories import TransactionRepository
from app.modules.transactions.schemas import (
    SavingsTransferCreateRequest,
    SavingsTransferResponse,
    TransactionCreateRequest,
    TransactionFilterType,
    TransactionListResponse,
    TransactionResponse,
    TransactionUpdateRequest,
    TransferCreateRequest,
    TransferResponse,
)
from app.modules.transactions.services import (
    IdempotencyConflictError,
    IdempotencyInProgressError,
    InvalidSavingsTransferRequestError,
    InvalidTransactionCursorError,
    InvalidTransactionFilterError,
    InvalidTransactionReferenceError,
    InvalidTransactionStateError,
    InvalidTransferRequestError,
    TransactionNotFoundError,
    TransactionService,
    TransferNotFoundError,
)

router = APIRouter(prefix="/transactions", tags=["transactions"])
SessionDependency = Annotated[AsyncSession, Depends(get_session)]


def build_transaction_service(session: AsyncSession) -> TransactionService:
    return TransactionService(
        transactions=TransactionRepository(session),
        accounts=AccountRepository(session),
        categories=CategoryRepository(session),
        savings=SavingsRepository(session),
        idempotency=IdempotencyRepository(session),
    )


@router.post(
    "",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_transaction(
    request: TransactionCreateRequest,
    current_user: CurrentUserDependency,
    session: SessionDependency,
    idempotency_key: Annotated[
        str | None,
        Header(alias="Idempotency-Key", min_length=1, max_length=255),
    ] = None,
) -> TransactionResponse:
    try:
        return await build_transaction_service(session).create_transaction(
            request,
            current_user,
            idempotency_key,
        )
    except InvalidTransactionReferenceError as exc:
        raise invalid_reference_error() from exc
    except IdempotencyConflictError as exc:
        raise idempotency_conflict_error() from exc
    except IdempotencyInProgressError as exc:
        raise idempotency_in_progress_error() from exc


@router.get("", response_model=TransactionListResponse)
async def list_transactions(
    current_user: CurrentUserDependency,
    session: SessionDependency,
    cursor: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    date_from: Annotated[datetime | None, Query()] = None,
    date_to: Annotated[datetime | None, Query()] = None,
    account_id: Annotated[uuid.UUID | None, Query()] = None,
    category_id: Annotated[uuid.UUID | None, Query()] = None,
    transaction_type: Annotated[
        TransactionFilterType | None,
        Query(alias="type"),
    ] = None,
    search: Annotated[str | None, Query(max_length=200)] = None,
) -> TransactionListResponse:
    try:
        return await build_transaction_service(session).list_transactions(
            current_user,
            cursor=cursor,
            limit=limit,
            date_from=date_from,
            date_to=date_to,
            account_id=account_id,
            category_id=category_id,
            transaction_type=transaction_type,
            search=search,
        )
    except InvalidTransactionCursorError as exc:
        raise invalid_cursor_error() from exc
    except InvalidTransactionFilterError as exc:
        raise invalid_filter_error() from exc


@router.post(
    "/transfers",
    response_model=TransferResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_transfer(
    request: TransferCreateRequest,
    current_user: CurrentUserDependency,
    session: SessionDependency,
    idempotency_key: Annotated[
        str | None,
        Header(alias="Idempotency-Key", min_length=1, max_length=255),
    ] = None,
) -> TransferResponse:
    try:
        return await build_transaction_service(session).create_transfer(
            request,
            current_user,
            idempotency_key,
        )
    except InvalidTransactionReferenceError as exc:
        raise invalid_transfer_error() from exc
    except InvalidTransferRequestError as exc:
        raise invalid_transfer_error() from exc
    except IdempotencyConflictError as exc:
        raise idempotency_conflict_error() from exc
    except IdempotencyInProgressError as exc:
        raise idempotency_in_progress_error() from exc


@router.get("/transfers/{transfer_id}", response_model=TransferResponse)
async def get_transfer(
    transfer_id: str,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> TransferResponse:
    try:
        return await build_transaction_service(session).get_transfer(
            parse_uuid_or_404(transfer_id),
            current_user,
        )
    except TransferNotFoundError as exc:
        raise transfer_not_found_error() from exc


@router.post(
    "/savings-transfers",
    response_model=SavingsTransferResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_savings_transfer(
    request: SavingsTransferCreateRequest,
    current_user: CurrentUserDependency,
    session: SessionDependency,
    idempotency_key: Annotated[
        str | None,
        Header(alias="Idempotency-Key", min_length=1, max_length=255),
    ] = None,
) -> SavingsTransferResponse:
    try:
        return await build_transaction_service(session).create_savings_transfer(
            request,
            current_user,
            idempotency_key,
        )
    except InvalidTransactionReferenceError as exc:
        raise invalid_savings_transfer_error() from exc
    except InvalidSavingsTransferRequestError as exc:
        raise invalid_savings_transfer_error() from exc
    except IdempotencyConflictError as exc:
        raise idempotency_conflict_error() from exc
    except IdempotencyInProgressError as exc:
        raise idempotency_in_progress_error() from exc


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: str,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> TransactionResponse:
    try:
        transaction = await build_transaction_service(session).get_transaction(
            parse_uuid_or_404(transaction_id),
            current_user,
        )
    except TransactionNotFoundError as exc:
        raise not_found_error() from exc
    return TransactionResponse.model_validate(transaction)


@router.patch("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: str,
    request: TransactionUpdateRequest,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> TransactionResponse:
    try:
        transaction = await build_transaction_service(session).update_transaction(
            parse_uuid_or_404(transaction_id),
            request,
            current_user,
        )
    except TransactionNotFoundError as exc:
        raise not_found_error() from exc
    except InvalidTransactionReferenceError as exc:
        raise invalid_reference_error() from exc
    except InvalidTransactionStateError as exc:
        raise invalid_state_error() from exc
    return TransactionResponse.model_validate(transaction)


@router.delete("/{transaction_id}", response_model=TransactionResponse)
async def void_transaction(
    transaction_id: str,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> TransactionResponse:
    try:
        transaction = await build_transaction_service(session).void_transaction(
            parse_uuid_or_404(transaction_id),
            current_user,
        )
    except TransactionNotFoundError as exc:
        raise not_found_error() from exc
    return TransactionResponse.model_validate(transaction)


def parse_uuid_or_404(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError as exc:
        raise not_found_error() from exc


def not_found_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Transaction not found",
    )


def invalid_reference_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail="Transaction account or category is invalid",
    )


def invalid_cursor_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail="Transaction cursor is invalid",
    )


def invalid_filter_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail="Transaction filters are invalid",
    )


def transfer_not_found_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Transfer not found",
    )


def invalid_transfer_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail="Transfer accounts or amount are invalid",
    )


def invalid_savings_transfer_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail="Savings transfer account, goal, or amount is invalid",
    )


def idempotency_conflict_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Idempotency key was already used with a different request",
    )


def idempotency_in_progress_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Idempotency key is already in progress",
    )


def invalid_state_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Voided transactions cannot be modified",
    )
