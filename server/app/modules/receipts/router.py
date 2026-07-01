from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.storage import build_storage_adapter
from app.core.config import Settings, get_settings
from app.core.database import get_session
from app.modules.auth.dependencies import CurrentUserDependency
from app.modules.receipts.repositories import ReceiptRepository
from app.modules.receipts.schemas import ReceiptListResponse, ReceiptResponse
from app.modules.receipts.services import (
    InvalidReceiptCursorError,
    InvalidReceiptFileError,
    InvalidReceiptTransactionError,
    ReceiptNotFoundError,
    ReceiptService,
)

router = APIRouter(prefix="/receipts", tags=["receipts"])
SessionDependency = Annotated[AsyncSession, Depends(get_session)]
SettingsDependency = Annotated[Settings, Depends(get_settings)]


def build_receipt_service(session: AsyncSession, settings: Settings) -> ReceiptService:
    return ReceiptService(
        receipts=ReceiptRepository(session),
        storage=build_storage_adapter(settings),
        settings=settings,
    )


@router.post(
    "",
    response_model=ReceiptResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_receipt(
    content: Annotated[bytes, Body(media_type="application/octet-stream")],
    current_user: CurrentUserDependency,
    session: SessionDependency,
    settings: SettingsDependency,
    transaction_id: Annotated[uuid.UUID | None, Query()] = None,
    content_type: Annotated[str, Header(alias="Content-Type")] = (
        "application/octet-stream"
    ),
    original_filename: Annotated[
        str | None,
        Header(alias="X-Receipt-Filename", max_length=255),
    ] = None,
) -> ReceiptResponse:
    try:
        return await build_receipt_service(session, settings).upload_receipt(
            current_user=current_user,
            content=content,
            content_type=content_type,
            original_filename=original_filename,
            transaction_id=transaction_id,
        )
    except InvalidReceiptFileError as exc:
        raise invalid_file_error(settings) from exc
    except InvalidReceiptTransactionError as exc:
        raise invalid_transaction_error() from exc


@router.get("", response_model=ReceiptListResponse)
async def list_receipts(
    current_user: CurrentUserDependency,
    session: SessionDependency,
    settings: SettingsDependency,
    cursor: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    transaction_id: Annotated[uuid.UUID | None, Query()] = None,
) -> ReceiptListResponse:
    try:
        return await build_receipt_service(session, settings).list_receipts(
            current_user,
            cursor=cursor,
            limit=limit,
            transaction_id=transaction_id,
        )
    except InvalidReceiptCursorError as exc:
        raise invalid_cursor_error() from exc
    except InvalidReceiptTransactionError as exc:
        raise invalid_transaction_error() from exc


@router.get("/{receipt_id}", response_model=ReceiptResponse)
async def get_receipt(
    receipt_id: str,
    current_user: CurrentUserDependency,
    session: SessionDependency,
    settings: SettingsDependency,
) -> ReceiptResponse:
    try:
        return await build_receipt_service(session, settings).get_receipt(
            parse_uuid_or_404(receipt_id),
            current_user,
        )
    except ReceiptNotFoundError as exc:
        raise not_found_error() from exc


@router.delete("/{receipt_id}", response_model=ReceiptResponse)
async def delete_receipt(
    receipt_id: str,
    current_user: CurrentUserDependency,
    session: SessionDependency,
    settings: SettingsDependency,
) -> ReceiptResponse:
    try:
        return await build_receipt_service(session, settings).delete_receipt(
            parse_uuid_or_404(receipt_id),
            current_user,
        )
    except ReceiptNotFoundError as exc:
        raise not_found_error() from exc


def parse_uuid_or_404(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError as exc:
        raise not_found_error() from exc


def not_found_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Receipt not found",
    )


def invalid_file_error(settings: Settings) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail=(
            "Receipt file must be non-empty, within "
            f"{settings.receipt_max_upload_bytes} bytes, and one of the allowed "
            "content types"
        ),
    )


def invalid_transaction_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail="Receipt transaction is invalid",
    )


def invalid_cursor_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail="Receipt cursor is invalid",
    )
