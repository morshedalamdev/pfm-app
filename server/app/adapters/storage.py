from __future__ import annotations

import hashlib
import json
from collections.abc import Mapping
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path, PurePosixPath
from typing import Any, Protocol, cast

from app.core.config import Settings


@dataclass(frozen=True, slots=True)
class StoredObjectMetadata:
    key: str
    content_type: str
    size_bytes: int
    checksum_sha256: str
    created_at: datetime
    original_filename: str | None = None


class StorageAdapter(Protocol):
    async def save(
        self,
        *,
        key: str,
        content: bytes,
        content_type: str,
        original_filename: str | None = None,
    ) -> StoredObjectMetadata:
        """Persist content and return metadata needed by receipt workflows."""

    async def get_metadata(self, key: str) -> StoredObjectMetadata | None:
        """Return stored object metadata without loading file bytes."""

    async def delete(self, key: str) -> bool:
        """Delete stored object bytes and metadata if present."""


class LocalStorageAdapter:
    def __init__(self, *, root_path: Path) -> None:
        self.root_path = root_path

    async def save(
        self,
        *,
        key: str,
        content: bytes,
        content_type: str,
        original_filename: str | None = None,
    ) -> StoredObjectMetadata:
        object_path = self._object_path(key)
        object_path.parent.mkdir(parents=True, exist_ok=True)
        object_path.write_bytes(content)
        metadata = StoredObjectMetadata(
            key=normalize_storage_key(key),
            content_type=content_type,
            size_bytes=len(content),
            checksum_sha256=hashlib.sha256(content).hexdigest(),
            created_at=datetime.now(UTC),
            original_filename=original_filename,
        )
        self._metadata_path(key).write_text(
            json.dumps(serialize_metadata(metadata), sort_keys=True),
            encoding="utf-8",
        )
        return metadata

    async def get_metadata(self, key: str) -> StoredObjectMetadata | None:
        object_path = self._object_path(key)
        metadata_path = self._metadata_path(key)
        if not object_path.exists() or not metadata_path.exists():
            return None
        raw_metadata = cast(
            Mapping[str, Any],
            json.loads(metadata_path.read_text(encoding="utf-8")),
        )
        return StoredObjectMetadata(
            key=str(raw_metadata["key"]),
            content_type=str(raw_metadata["content_type"]),
            size_bytes=int(raw_metadata["size_bytes"]),
            checksum_sha256=str(raw_metadata["checksum_sha256"]),
            created_at=datetime.fromisoformat(str(raw_metadata["created_at"])),
            original_filename=cast(str | None, raw_metadata["original_filename"]),
        )

    async def delete(self, key: str) -> bool:
        object_path = self._object_path(key)
        metadata_path = self._metadata_path(key)
        deleted = False
        if object_path.exists():
            object_path.unlink()
            deleted = True
        if metadata_path.exists():
            metadata_path.unlink()
            deleted = True
        return deleted

    def _object_path(self, key: str) -> Path:
        return self.root_path / normalize_storage_key(key)

    def _metadata_path(self, key: str) -> Path:
        object_path = self._object_path(key)
        return object_path.with_name(f"{object_path.name}.metadata.json")


def build_storage_adapter(settings: Settings) -> StorageAdapter:
    if settings.storage_backend == "local":
        return LocalStorageAdapter(root_path=Path(settings.local_storage_root))
    raise ValueError(f"Unsupported storage backend: {settings.storage_backend}")


def normalize_storage_key(key: str) -> str:
    normalized = key.strip().replace("\\", "/")
    raw_parts = normalized.split("/")
    path = PurePosixPath(normalized)
    if (
        not normalized
        or path.is_absolute()
        or any(part in {"", ".", ".."} for part in raw_parts)
    ):
        raise ValueError("Storage key must be a relative path without traversal")
    return path.as_posix()


def serialize_metadata(metadata: StoredObjectMetadata) -> dict[str, object]:
    payload = asdict(metadata)
    payload["created_at"] = metadata.created_at.isoformat()
    return payload
