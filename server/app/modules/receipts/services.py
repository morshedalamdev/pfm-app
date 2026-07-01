from __future__ import annotations

import logging
import re
import uuid
from datetime import UTC, datetime
from pathlib import PurePath

from app.adapters.storage import StorageAdapter
from app.core.config import Settings
from app.modules.receipts.models import Receipt
from app.modules.receipts.pagination import (
    InvalidReceiptCursorError as CursorDecodeError,
)
from app.modules.receipts.pagination import decode_receipt_cursor, encode_receipt_cursor
from app.modules.receipts.repositories import ReceiptRepository
from app.modules.receipts.schemas import ReceiptListResponse, ReceiptResponse
from app.modules.users.models import User


class ReceiptNotFoundError(Exception):
    pass


class InvalidReceiptCursorError(Exception):
    pass


class InvalidReceiptFileError(Exception):
    pass


class InvalidReceiptTransactionError(Exception):
    pass


LOGGER = logging.getLogger(__name__)


class ReceiptService:
    def __init__(
        self,
        *,
        receipts: ReceiptRepository,
        storage: StorageAdapter,
        settings: Settings,
    ) -> None:
        self.receipts = receipts
        self.storage = storage
        self.settings = settings

    async def upload_receipt(
        self,
        *,
        current_user: User,
        content: bytes,
        content_type: str,
        original_filename: str | None,
        transaction_id: uuid.UUID | None,
    ) -> ReceiptResponse:
        self.validate_file(content=content, content_type=content_type)
        if transaction_id is not None:
            transaction = await self.receipts.get_owned_transaction(
                transaction_id,
                current_user.id,
            )
            if transaction is None:
                raise InvalidReceiptTransactionError

        receipt_id = uuid.uuid4()
        safe_filename = sanitize_filename(original_filename)
        storage_key = f"receipts/{current_user.id}/{receipt_id}/{safe_filename}"
        stored_metadata = await self.storage.save(
            key=storage_key,
            content=content,
            content_type=content_type,
            original_filename=safe_filename,
        )
        receipt = Receipt(
            id=receipt_id,
            user_id=current_user.id,
            transaction_id=transaction_id,
            storage_backend=self.settings.storage_backend,
            storage_key=stored_metadata.key,
            original_filename=safe_filename,
            content_type=stored_metadata.content_type,
            size_bytes=stored_metadata.size_bytes,
            checksum_sha256=stored_metadata.checksum_sha256,
        )
        try:
            await self.receipts.create(receipt)
            await self.receipts.refresh(receipt)
            response = ReceiptResponse.model_validate(receipt)
            await self.receipts.commit()
        except Exception:
            await self.receipts.rollback()
            await self.storage.delete(stored_metadata.key)
            raise
        return response

    async def get_receipt(
        self,
        receipt_id: uuid.UUID,
        current_user: User,
    ) -> ReceiptResponse:
        receipt = await self.receipts.get_active_owned(receipt_id, current_user.id)
        if receipt is None:
            raise ReceiptNotFoundError
        return ReceiptResponse.model_validate(receipt)

    async def list_receipts(
        self,
        current_user: User,
        *,
        cursor: str | None,
        limit: int,
        transaction_id: uuid.UUID | None,
    ) -> ReceiptListResponse:
        try:
            page_cursor = decode_receipt_cursor(cursor)
        except CursorDecodeError as exc:
            raise InvalidReceiptCursorError from exc
        if transaction_id is not None:
            transaction = await self.receipts.get_owned_transaction(
                transaction_id,
                current_user.id,
            )
            if transaction is None:
                raise InvalidReceiptTransactionError

        receipts = await self.receipts.list_active_owned(
            current_user.id,
            cursor=page_cursor,
            limit=limit + 1,
            transaction_id=transaction_id,
        )
        has_more = len(receipts) > limit
        visible_receipts = receipts[:limit]
        next_cursor = (
            encode_receipt_cursor(
                visible_receipts[-1].created_at, visible_receipts[-1].id
            )
            if has_more and visible_receipts
            else None
        )
        return ReceiptListResponse(
            items=[
                ReceiptResponse.model_validate(receipt) for receipt in visible_receipts
            ],
            next_cursor=next_cursor,
            has_more=has_more,
        )

    async def delete_receipt(
        self,
        receipt_id: uuid.UUID,
        current_user: User,
    ) -> ReceiptResponse:
        receipt = await self.receipts.get_active_owned(receipt_id, current_user.id)
        if receipt is None:
            raise ReceiptNotFoundError
        response = ReceiptResponse.model_validate(receipt)
        receipt.deleted_at = datetime.now(UTC)
        await self.receipts.commit()
        try:
            await self.storage.delete(receipt.storage_key)
        except Exception:
            LOGGER.warning(
                "receipt_storage_delete_failed",
                extra={
                    "receipt_id": str(receipt.id),
                    "user_id": str(current_user.id),
                    "storage_key": receipt.storage_key,
                },
                exc_info=True,
            )
        return response

    def validate_file(self, *, content: bytes, content_type: str) -> None:
        if not content:
            raise InvalidReceiptFileError
        if len(content) > self.settings.receipt_max_upload_bytes:
            raise InvalidReceiptFileError
        if content_type not in self.settings.receipt_allowed_content_types:
            raise InvalidReceiptFileError


FILENAME_SAFE_PATTERN = re.compile(r"[^A-Za-z0-9._-]+")


def sanitize_filename(filename: str | None) -> str:
    raw_filename = PurePath(filename or "receipt").name.strip()
    safe_filename = FILENAME_SAFE_PATTERN.sub("_", raw_filename)
    safe_filename = safe_filename.strip("._-")
    if not safe_filename:
        return "receipt"
    return safe_filename[:255]
