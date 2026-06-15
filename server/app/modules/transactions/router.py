import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.modules.accounts.repositories import AccountRepository
from app.modules.auth.dependencies import CurrentUserDependency
from app.modules.categories.repositories import CategoryRepository
from app.modules.transactions.repositories import TransactionRepository
from app.modules.transactions.schemas import (
    TransactionCreateRequest,
    TransactionListResponse,
    TransactionResponse,
    TransactionUpdateRequest,
)
from app.modules.transactions.services import (
    InvalidTransactionReferenceError,
    InvalidTransactionStateError,
    TransactionNotFoundError,
    TransactionService,
)

router = APIRouter(prefix="/transactions", tags=["transactions"])
SessionDependency = Annotated[AsyncSession, Depends(get_session)]


def build_transaction_service(session: AsyncSession) -> TransactionService:
    return TransactionService(
        transactions=TransactionRepository(session),
        accounts=AccountRepository(session),
        categories=CategoryRepository(session),
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
) -> TransactionResponse:
    try:
        transaction = await build_transaction_service(session).create_transaction(
            request,
            current_user,
        )
    except InvalidTransactionReferenceError as exc:
        raise invalid_reference_error() from exc
    return TransactionResponse.model_validate(transaction)


@router.get("", response_model=TransactionListResponse)
async def list_transactions(
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> TransactionListResponse:
    return await build_transaction_service(session).list_transactions(current_user)


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


def invalid_state_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Voided transactions cannot be modified",
    )
