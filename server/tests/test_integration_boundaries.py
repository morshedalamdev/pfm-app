from __future__ import annotations

import uuid
from datetime import UTC, datetime
from pathlib import Path

import pytest

from app.adapters.storage import StoredObjectMetadata
from app.core.config import Settings
from app.modules.receipts import services as receipt_services
from app.modules.receipts.models import Receipt
from app.modules.receipts.services import ReceiptService
from app.modules.users.models import User


class RecordingStorageAdapter:
    def __init__(self, *, fail_delete: bool = False) -> None:
        self.fail_delete = fail_delete
        self.saved_keys: list[str] = []
        self.deleted_keys: list[str] = []

    async def save(
        self,
        *,
        key: str,
        content: bytes,
        content_type: str,
        original_filename: str | None = None,
    ) -> StoredObjectMetadata:
        self.saved_keys.append(key)
        return StoredObjectMetadata(
            key=key,
            content_type=content_type,
            size_bytes=len(content),
            checksum_sha256="a" * 64,
            created_at=datetime.now(UTC),
            original_filename=original_filename,
        )

    async def get_metadata(self, key: str) -> StoredObjectMetadata | None:
        return None

    async def delete(self, key: str) -> bool:
        self.deleted_keys.append(key)
        if self.fail_delete:
            raise RuntimeError("storage cleanup unavailable")
        return True


class RecordingLogger:
    def __init__(self) -> None:
        self.warnings: list[tuple[str, dict[str, object], bool]] = []

    def warning(
        self,
        message: str,
        *,
        extra: dict[str, object],
        exc_info: bool,
    ) -> None:
        self.warnings.append((message, extra, exc_info))


class FailingCreateReceiptRepository:
    def __init__(self) -> None:
        self.rolled_back = False

    async def get_owned_transaction(
        self,
        transaction_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> object | None:
        return None

    async def create(self, receipt: Receipt) -> Receipt:
        raise RuntimeError("database write failed")

    async def refresh(self, receipt: Receipt) -> None:
        raise AssertionError("refresh should not run after create failure")

    async def commit(self) -> None:
        raise AssertionError("commit should not run after create failure")

    async def rollback(self) -> None:
        self.rolled_back = True


class DeleteReceiptRepository:
    def __init__(self, receipt: Receipt) -> None:
        self.receipt = receipt
        self.committed = False

    async def get_active_owned(
        self,
        receipt_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Receipt | None:
        if receipt_id == self.receipt.id and user_id == self.receipt.user_id:
            return self.receipt
        return None

    async def commit(self) -> None:
        self.committed = True


def test_local_adapter_configuration_is_key_free() -> None:
    settings = Settings()
    env_template = (Path(__file__).parents[1] / ".env.example").read_text(
        encoding="utf-8"
    )

    assert settings.storage_backend == "local"
    assert settings.email_backend == "console"
    assert "STORAGE_BACKEND=local" in env_template
    assert "EMAIL_BACKEND=console" in env_template
    assert "AWS_ACCESS_KEY_ID" not in env_template
    assert "SMTP_PASSWORD" not in env_template
    assert "SENDGRID" not in env_template
    assert "POSTMARK" not in env_template


@pytest.mark.asyncio
async def test_receipt_upload_rolls_back_storage_when_database_create_fails() -> None:
    user = build_user()
    storage = RecordingStorageAdapter()
    repository = FailingCreateReceiptRepository()
    service = ReceiptService(
        receipts=repository,
        storage=storage,
        settings=Settings(),
    )

    with pytest.raises(RuntimeError, match="database write failed"):
        await service.upload_receipt(
            current_user=user,
            content=b"receipt bytes",
            content_type="application/pdf",
            original_filename="receipt.pdf",
            transaction_id=None,
        )

    assert repository.rolled_back is True
    assert storage.saved_keys
    assert storage.deleted_keys == storage.saved_keys


@pytest.mark.asyncio
async def test_receipt_delete_keeps_soft_delete_when_storage_cleanup_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user = build_user()
    receipt = Receipt(
        id=uuid.uuid4(),
        user_id=user.id,
        storage_backend="local",
        storage_key=f"receipts/{user.id}/receipt.pdf",
        original_filename="receipt.pdf",
        content_type="application/pdf",
        size_bytes=13,
        checksum_sha256="b" * 64,
        created_at=datetime.now(UTC),
    )
    repository = DeleteReceiptRepository(receipt)
    storage = RecordingStorageAdapter(fail_delete=True)
    service = ReceiptService(
        receipts=repository,
        storage=storage,
        settings=Settings(),
    )
    logger = RecordingLogger()
    monkeypatch.setattr(receipt_services, "LOGGER", logger)

    response = await service.delete_receipt(receipt.id, user)

    assert response.id == receipt.id
    assert repository.committed is True
    assert receipt.deleted_at is not None
    assert storage.deleted_keys == [receipt.storage_key]
    assert logger.warnings == [
        (
            "receipt_storage_delete_failed",
            {
                "receipt_id": str(receipt.id),
                "user_id": str(user.id),
                "storage_key": receipt.storage_key,
            },
            True,
        )
    ]


def build_user() -> User:
    return User(
        id=uuid.uuid4(),
        email="boundary@example.com",
        password_hash="not-used",
    )
