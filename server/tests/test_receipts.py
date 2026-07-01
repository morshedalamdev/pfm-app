from __future__ import annotations

import asyncio
import uuid
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pytest
from alembic.config import Config
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select

from alembic import command
from app.core.config import Settings
from app.core.database import (
    build_async_engine,
    build_session_factory,
    get_session,
    get_session_from_factory,
)
from app.main import create_app
from app.modules.receipts.models import Receipt


@dataclass(frozen=True)
class ReceiptApiContext:
    client: TestClient
    database_url: str
    storage_root: Path


def build_alembic_config(database_url: str) -> Config:
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def receipt_test_app(database_url: str, storage_root: Path) -> FastAPI:
    return create_app(
        Settings(
            app_name="PFM Test API",
            app_env="test",
            debug=False,
            cors_origins=["http://testserver"],
            database_url=database_url,
            access_token_secret_key="receipt-test-secret-with-at-least-32-bytes",
            local_storage_root=str(storage_root),
            receipt_max_upload_bytes=32,
        ),
    )


@pytest.fixture
def receipt_context(
    disposable_postgres_url: str,
    tmp_path: Path,
) -> Iterator[ReceiptApiContext]:
    command.upgrade(build_alembic_config(disposable_postgres_url), "head")
    engine = build_async_engine(disposable_postgres_url)
    session_factory = build_session_factory(engine)
    storage_root = tmp_path / "storage"
    app = receipt_test_app(disposable_postgres_url, storage_root)

    async def test_session() -> object:
        async for session in get_session_from_factory(session_factory):
            yield session

    app.dependency_overrides[get_session] = test_session

    try:
        with TestClient(app) as client:
            yield ReceiptApiContext(
                client=client,
                database_url=disposable_postgres_url,
                storage_root=storage_root,
            )
    finally:
        asyncio.run(engine.dispose())


def test_receipt_upload_metadata_list_and_delete(
    receipt_context: ReceiptApiContext,
) -> None:
    context = receipt_context
    headers = auth_headers(context, "receipt-owner@example.com")
    transaction = create_transaction(context, headers)

    upload = upload_receipt(
        context,
        headers,
        content=b"receipt-bytes",
        filename="../Groceries July.pdf",
        content_type="application/pdf",
        transaction_id=transaction["id"],
    )

    assert upload.status_code == 201
    body = upload.json()
    assert body["transaction_id"] == transaction["id"]
    assert body["original_filename"] == "Groceries_July.pdf"
    assert body["content_type"] == "application/pdf"
    assert body["size_bytes"] == len(b"receipt-bytes")
    assert len(body["checksum_sha256"]) == 64

    stored_paths = sorted(
        path for path in context.storage_root.rglob("*") if path.is_file()
    )
    assert len(stored_paths) == 2
    assert any(path.name == "Groceries_July.pdf" for path in stored_paths)
    assert any(path.name == "Groceries_July.pdf.metadata.json" for path in stored_paths)

    get_response = context.client.get(
        f"/api/v1/receipts/{body['id']}",
        headers=headers,
    )
    assert get_response.status_code == 200
    assert get_response.json() == body

    list_response = context.client.get(
        f"/api/v1/receipts?transaction_id={transaction['id']}",
        headers=headers,
    )
    assert list_response.status_code == 200
    assert [item["id"] for item in list_response.json()["items"]] == [body["id"]]

    delete_response = context.client.delete(
        f"/api/v1/receipts/{body['id']}",
        headers=headers,
    )
    assert delete_response.status_code == 200
    assert delete_response.json() == body
    assert not any(context.storage_root.rglob("*.*"))

    missing_response = context.client.get(
        f"/api/v1/receipts/{body['id']}",
        headers=headers,
    )
    assert missing_response.status_code == 404
    assert asyncio.run(load_receipt(context.database_url, body["id"])).deleted_at


def test_receipt_pagination_and_ownership(receipt_context: ReceiptApiContext) -> None:
    context = receipt_context
    owner_headers = auth_headers(context, "receipt-page-owner@example.com")
    other_headers = auth_headers(context, "receipt-page-other@example.com")

    first = upload_receipt(context, owner_headers, content=b"first").json()
    second = upload_receipt(context, owner_headers, content=b"second").json()
    third = upload_receipt(context, owner_headers, content=b"third").json()
    other = upload_receipt(context, other_headers, content=b"other").json()

    page = context.client.get("/api/v1/receipts?limit=2", headers=owner_headers)
    assert page.status_code == 200
    page_body = page.json()
    assert len(page_body["items"]) == 2
    assert page_body["has_more"] is True
    assert page_body["next_cursor"]
    assert other["id"] not in {item["id"] for item in page_body["items"]}

    next_page = context.client.get(
        f"/api/v1/receipts?limit=2&cursor={page_body['next_cursor']}",
        headers=owner_headers,
    )
    assert next_page.status_code == 200
    owner_ids = {first["id"], second["id"], third["id"]}
    returned_ids = {
        item["id"] for item in page_body["items"] + next_page.json()["items"]
    }
    assert returned_ids == owner_ids

    cross_user = context.client.get(
        f"/api/v1/receipts/{first['id']}",
        headers=other_headers,
    )
    assert cross_user.status_code == 404


def test_receipt_upload_rejects_invalid_files_and_references(
    receipt_context: ReceiptApiContext,
) -> None:
    context = receipt_context
    owner_headers = auth_headers(context, "receipt-invalid-owner@example.com")
    other_headers = auth_headers(context, "receipt-invalid-other@example.com")
    other_transaction = create_transaction(context, other_headers)

    unsupported = upload_receipt(
        context,
        owner_headers,
        content=b"hello",
        content_type="text/plain",
    )
    assert unsupported.status_code == 422

    empty = upload_receipt(context, owner_headers, content=b"")
    assert empty.status_code == 422

    too_large = upload_receipt(context, owner_headers, content=b"x" * 33)
    assert too_large.status_code == 422

    cross_user_transaction = upload_receipt(
        context,
        owner_headers,
        content=b"ok",
        transaction_id=other_transaction["id"],
    )
    assert cross_user_transaction.status_code == 422
    assert not context.storage_root.exists()


def test_receipt_openapi_contract(receipt_context: ReceiptApiContext) -> None:
    schema = receipt_context.client.get("/openapi.json").json()

    assert "/api/v1/receipts" in schema["paths"]
    assert "/api/v1/receipts/{receipt_id}" in schema["paths"]
    assert (
        "application/octet-stream"
        in schema["paths"]["/api/v1/receipts"]["post"]["requestBody"]["content"]
    )
    assert schema["paths"]["/api/v1/receipts"]["post"]["security"] == [
        {"HTTPBearer": []}
    ]


def auth_headers(context: ReceiptApiContext, email: str) -> dict[str, str]:
    register_response = context.client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "CorrectHorse42"},
    )
    assert register_response.status_code == 201
    login_response = context.client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "CorrectHorse42"},
    )
    assert login_response.status_code == 200
    return {"Authorization": f"Bearer {login_response.json()['access_token']}"}


def upload_receipt(
    context: ReceiptApiContext,
    headers: dict[str, str],
    *,
    content: bytes,
    filename: str = "receipt.pdf",
    content_type: str = "application/pdf",
    transaction_id: str | None = None,
) -> Any:
    data = {"transaction_id": transaction_id} if transaction_id is not None else None
    return context.client.post(
        "/api/v1/receipts",
        headers={
            **headers,
            "Content-Type": content_type,
            "X-Receipt-Filename": filename,
        },
        params=data,
        content=content,
    )


def create_account(
    context: ReceiptApiContext,
    headers: dict[str, str],
) -> dict[str, Any]:
    response = context.client.post(
        "/api/v1/accounts",
        headers=headers,
        json={
            "name": "Receipt Wallet",
            "type": "wallet",
            "opening_balance": "0",
            "currency": "USD",
        },
    )
    assert response.status_code == 201
    return response.json()


def create_category(
    context: ReceiptApiContext,
    headers: dict[str, str],
) -> dict[str, Any]:
    response = context.client.post(
        "/api/v1/categories",
        headers=headers,
        json={"name": "Groceries", "kind": "expense", "icon_key": "shopping-cart"},
    )
    assert response.status_code == 201
    return response.json()


def create_transaction(
    context: ReceiptApiContext,
    headers: dict[str, str],
) -> dict[str, Any]:
    account = create_account(context, headers)
    category = create_category(context, headers)
    response = context.client.post(
        "/api/v1/transactions",
        headers=headers,
        json={
            "account_id": account["id"],
            "category_id": category["id"],
            "type": "expense",
            "amount": "12.34",
            "transaction_at": "2026-07-01T00:00:00Z",
            "description": "Receipt groceries",
        },
    )
    assert response.status_code == 201
    return response.json()


async def load_receipt(database_url: str, receipt_id: str) -> Receipt:
    engine = build_async_engine(database_url)
    session_factory = build_session_factory(engine)
    try:
        async with session_factory() as session:
            result = await session.execute(
                select(Receipt).where(Receipt.id == uuid.UUID(receipt_id))
            )
            return result.scalar_one()
    finally:
        await engine.dispose()
