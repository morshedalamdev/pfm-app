from __future__ import annotations

from pathlib import Path

import pytest

from app.adapters.email import (
    ConsoleEmailAdapter,
    EmailMessage,
    LocalEmailAdapter,
    build_email_adapter,
    normalize_recipients,
)
from app.adapters.storage import (
    LocalStorageAdapter,
    build_storage_adapter,
    normalize_storage_key,
)
from app.core.config import Settings


@pytest.mark.asyncio
async def test_local_storage_saves_metadata_and_deletes_object(
    tmp_path: Path,
) -> None:
    adapter = LocalStorageAdapter(root_path=tmp_path)

    metadata = await adapter.save(
        key="receipts/user-1/receipt.txt",
        content=b"receipt bytes",
        content_type="text/plain",
        original_filename="grocery.txt",
    )

    stored_path = tmp_path / "receipts/user-1/receipt.txt"
    assert stored_path.read_bytes() == b"receipt bytes"
    assert metadata.key == "receipts/user-1/receipt.txt"
    assert metadata.content_type == "text/plain"
    assert metadata.size_bytes == len(b"receipt bytes")
    assert metadata.original_filename == "grocery.txt"
    assert len(metadata.checksum_sha256) == 64

    loaded = await adapter.get_metadata("receipts/user-1/receipt.txt")

    assert loaded == metadata
    assert await adapter.delete("receipts/user-1/receipt.txt") is True
    assert await adapter.get_metadata("receipts/user-1/receipt.txt") is None
    assert await adapter.delete("receipts/user-1/receipt.txt") is False


@pytest.mark.parametrize(
    "key",
    [
        "",
        "/absolute/path.txt",
        "../escape.txt",
        "receipts/../escape.txt",
        "receipts/./receipt.txt",
    ],
)
def test_storage_keys_reject_traversal_and_absolute_paths(key: str) -> None:
    with pytest.raises(ValueError, match="relative path"):
        normalize_storage_key(key)


def test_storage_adapter_factory_uses_local_backend(tmp_path: Path) -> None:
    adapter = build_storage_adapter(
        Settings(local_storage_root=str(tmp_path)),
    )

    assert isinstance(adapter, LocalStorageAdapter)


@pytest.mark.asyncio
async def test_console_email_adapter_returns_local_delivery_result() -> None:
    adapter = ConsoleEmailAdapter(from_address="alerts@localhost")
    message = EmailMessage(
        to=normalize_recipients(["USER@Example.COM"]),
        subject="Budget alert",
        text_body="You are close to your budget.",
    )

    result = await adapter.send(message)

    assert result.adapter == "console"
    assert result.accepted_recipients == ("user@example.com",)
    assert result.provider_message_id.startswith("console-")


@pytest.mark.asyncio
async def test_local_email_adapter_keeps_in_memory_copy() -> None:
    adapter = LocalEmailAdapter(from_address="alerts@localhost")
    message = EmailMessage(
        to=("user@example.com",),
        subject="Receipt uploaded",
        text_body="Your receipt was saved.",
    )

    result = await adapter.send(message)

    assert result.adapter == "console"
    assert adapter.sent_messages == [message]


def test_email_message_validates_required_fields() -> None:
    with pytest.raises(ValueError, match="recipient"):
        EmailMessage(to=(), subject="Subject", text_body="Body")

    with pytest.raises(ValueError, match="subject"):
        EmailMessage(to=("user@example.com",), subject=" ", text_body="Body")

    with pytest.raises(ValueError, match="text or HTML"):
        EmailMessage(to=("user@example.com",), subject="Subject", text_body=" ")


def test_email_adapter_factory_uses_configured_backend() -> None:
    console = build_email_adapter(Settings(email_backend="console"))
    local = build_email_adapter(Settings(email_backend="local"))

    assert isinstance(console, ConsoleEmailAdapter)
    assert isinstance(local, LocalEmailAdapter)
