from __future__ import annotations

import asyncio
import uuid
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest
from alembic.config import Config
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncEngine

from alembic import command
from app.adapters.email import LocalEmailAdapter
from app.core.config import Settings
from app.core.database import (
    build_async_engine,
    build_session_factory,
    get_session,
    get_session_from_factory,
)
from app.main import create_app
from app.modules.notifications.models import Notification
from app.modules.notifications.repositories import NotificationRepository
from app.modules.notifications.services import (
    NOTIFICATION_EMAIL_REQUESTED_EVENT,
    NotificationService,
)
from app.modules.outbox.models import OutboxEvent
from app.modules.outbox.repositories import OutboxEventRepository
from app.workers.notifications import NotificationEmailHandler
from app.workers.outbox import OutboxWorker


@dataclass(frozen=True)
class NotificationApiContext:
    client: TestClient
    database_url: str
    engine: AsyncEngine


@dataclass(frozen=True)
class AuthenticatedUser:
    headers: dict[str, str]
    user_id: str
    email: str


def build_alembic_config(database_url: str) -> Config:
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def notification_test_app(database_url: str) -> FastAPI:
    return create_app(
        Settings(
            app_name="PFM Notification Test API",
            app_env="test",
            debug=False,
            cors_origins=["http://testserver"],
            database_url=database_url,
            access_token_secret_key="notification-test-secret-with-at-least-32-bytes",
            email_backend="local",
        ),
    )


@pytest.fixture
def notification_context(
    disposable_postgres_url: str,
) -> Iterator[NotificationApiContext]:
    command.upgrade(build_alembic_config(disposable_postgres_url), "head")
    engine = build_async_engine(disposable_postgres_url)
    session_factory = build_session_factory(engine)
    app = notification_test_app(disposable_postgres_url)

    async def test_session() -> object:
        async for session in get_session_from_factory(session_factory):
            yield session

    app.dependency_overrides[get_session] = test_session

    try:
        with TestClient(app) as client:
            yield NotificationApiContext(
                client=client,
                database_url=disposable_postgres_url,
                engine=engine,
            )
    finally:
        asyncio.run(engine.dispose())


def test_notification_list_unread_and_read_lifecycle(
    notification_context: NotificationApiContext,
) -> None:
    context = notification_context
    owner = register_and_login(context, "notifications-owner@example.com")
    other = register_and_login(context, "notifications-other@example.com")
    first = create_notification(context, owner.user_id, title="Budget warning")
    second = create_notification(
        context,
        owner.user_id,
        notification_type="receipt.uploaded",
        title="Receipt saved",
    )
    third = create_notification(context, owner.user_id, title="Goal reached")
    other_notification = create_notification(context, other.user_id, title="Other")

    unread_count = context.client.get(
        "/api/v1/notifications/unread-count",
        headers=owner.headers,
    )
    assert unread_count.status_code == 200
    assert unread_count.json() == {"unread_count": 3}

    first_page = context.client.get(
        "/api/v1/notifications?limit=2",
        headers=owner.headers,
    )
    assert first_page.status_code == 200
    first_page_body = first_page.json()
    assert len(first_page_body["items"]) == 2
    assert first_page_body["has_more"] is True
    assert first_page_body["next_cursor"]
    assert other_notification["id"] not in {
        item["id"] for item in first_page_body["items"]
    }

    next_page = context.client.get(
        f"/api/v1/notifications?limit=2&cursor={first_page_body['next_cursor']}",
        headers=owner.headers,
    )
    assert next_page.status_code == 200
    returned_ids = {
        item["id"] for item in first_page_body["items"] + next_page.json()["items"]
    }
    assert returned_ids == {first["id"], second["id"], third["id"]}

    type_filter = context.client.get(
        "/api/v1/notifications?type=receipt.uploaded",
        headers=owner.headers,
    )
    assert type_filter.status_code == 200
    assert [item["id"] for item in type_filter.json()["items"]] == [second["id"]]

    mark_read = context.client.post(
        f"/api/v1/notifications/{first['id']}/read",
        headers=owner.headers,
    )
    assert mark_read.status_code == 200
    assert mark_read.json()["id"] == first["id"]
    assert mark_read.json()["read_at"] is not None

    unread_only = context.client.get(
        "/api/v1/notifications?unread_only=true",
        headers=owner.headers,
    )
    assert unread_only.status_code == 200
    assert {item["id"] for item in unread_only.json()["items"]} == {
        second["id"],
        third["id"],
    }

    mark_all = context.client.post(
        "/api/v1/notifications/read-all",
        headers=owner.headers,
    )
    assert mark_all.status_code == 200
    assert mark_all.json()["updated_count"] == 2

    final_count = context.client.get(
        "/api/v1/notifications/unread-count",
        headers=owner.headers,
    )
    assert final_count.status_code == 200
    assert final_count.json() == {"unread_count": 0}


def test_notification_ownership_and_invalid_cursor(
    notification_context: NotificationApiContext,
) -> None:
    context = notification_context
    owner = register_and_login(context, "notifications-cross-owner@example.com")
    other = register_and_login(context, "notifications-cross-other@example.com")
    notification = create_notification(context, owner.user_id, title="Private")

    cross_user = context.client.post(
        f"/api/v1/notifications/{notification['id']}/read",
        headers=other.headers,
    )
    assert cross_user.status_code == 404

    malformed_id = context.client.post(
        "/api/v1/notifications/not-a-uuid/read",
        headers=owner.headers,
    )
    assert malformed_id.status_code == 404

    invalid_cursor = context.client.get(
        "/api/v1/notifications?cursor=not-a-cursor",
        headers=owner.headers,
    )
    assert invalid_cursor.status_code == 422


def test_notification_email_outbox_handler_records_delivery(
    notification_context: NotificationApiContext,
) -> None:
    context = notification_context
    user = register_and_login(context, "notifications-email@example.com")
    notification = create_notification(
        context,
        user.user_id,
        notification_type="budget.alert",
        title="Budget alert",
        message="You are near your dining budget.",
        payload={"budget_id": "budget-1"},
        request_email=True,
    )
    pending_notification, pending_outbox = load_notification_and_outbox(
        context,
        notification["id"],
    )
    assert pending_notification.email_delivery_status == "pending"
    assert pending_notification.email_requested_at is not None
    assert pending_outbox.event_type == NOTIFICATION_EMAIL_REQUESTED_EVENT
    assert pending_outbox.aggregate_id == uuid.UUID(notification["id"])
    assert pending_outbox.payload["notification_id"] == notification["id"]

    adapter = LocalEmailAdapter(from_address="alerts@localhost")
    result = run_notification_email_worker(context, adapter)

    assert result.claimed == 1
    assert result.processed == 1
    assert result.retried == 0
    assert result.failed == 0
    assert len(adapter.sent_messages) == 1
    sent_message = adapter.sent_messages[0]
    assert sent_message.to == (user.email,)
    assert sent_message.subject == "Budget alert"
    assert sent_message.text_body == "You are near your dining budget."
    assert sent_message.metadata["notification_id"] == notification["id"]

    sent_notification, processed_outbox = load_notification_and_outbox(
        context,
        notification["id"],
    )
    assert sent_notification.email_delivery_status == "sent"
    assert sent_notification.email_adapter == "console"
    assert sent_notification.email_provider_message_id.startswith("console-")
    assert sent_notification.email_sent_at is not None
    assert processed_outbox.status == "processed"


def test_notifications_openapi_contract(
    notification_context: NotificationApiContext,
) -> None:
    schema = notification_context.client.get("/openapi.json").json()

    assert "/api/v1/notifications" in schema["paths"]
    assert "/api/v1/notifications/unread-count" in schema["paths"]
    assert "/api/v1/notifications/{notification_id}/read" in schema["paths"]
    assert "/api/v1/notifications/read-all" in schema["paths"]
    assert schema["paths"]["/api/v1/notifications"]["get"]["security"] == [
        {"HTTPBearer": []}
    ]
    assert schema["paths"]["/api/v1/notifications"]["get"]["parameters"]


def register_and_login(
    context: NotificationApiContext,
    email: str,
) -> AuthenticatedUser:
    register_response = context.client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "CorrectHorse42"},
    )
    assert register_response.status_code == 201
    user_id = register_response.json()["id"]
    login_response = context.client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "CorrectHorse42"},
    )
    assert login_response.status_code == 200
    return AuthenticatedUser(
        headers={"Authorization": f"Bearer {login_response.json()['access_token']}"},
        user_id=user_id,
        email=email,
    )


def create_notification(
    context: NotificationApiContext,
    user_id: str,
    *,
    notification_type: str = "budget.alert",
    title: str,
    message: str = "A notification message.",
    payload: dict[str, object] | None = None,
    request_email: bool = False,
) -> dict[str, Any]:
    return asyncio.run(
        create_notification_async(
            context,
            user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            payload=payload,
            request_email=request_email,
        )
    )


async def create_notification_async(
    context: NotificationApiContext,
    user_id: str,
    *,
    notification_type: str,
    title: str,
    message: str,
    payload: dict[str, object] | None,
    request_email: bool,
) -> dict[str, Any]:
    engine = build_async_engine(context.database_url)
    session_factory = build_session_factory(engine)
    try:
        async with session_factory() as session:
            service = NotificationService(
                notifications=NotificationRepository(session),
                outbox=OutboxEventRepository(session),
            )
            response = await service.create_notification(
                user_id=uuid.UUID(user_id),
                notification_type=notification_type,
                title=title,
                message=message,
                payload=payload,
                request_email=request_email,
            )
            return response.model_dump(mode="json")
    finally:
        await engine.dispose()


def run_notification_email_worker(
    context: NotificationApiContext,
    adapter: LocalEmailAdapter,
) -> Any:
    return asyncio.run(run_notification_email_worker_async(context, adapter))


async def run_notification_email_worker_async(
    context: NotificationApiContext,
    adapter: LocalEmailAdapter,
) -> Any:
    engine = build_async_engine(context.database_url)
    session_factory = build_session_factory(engine)
    try:
        worker = OutboxWorker(
            session_factory,
            handler=NotificationEmailHandler(adapter),
            worker_id="notification-email-test-worker",
            batch_size=10,
            event_types={NOTIFICATION_EMAIL_REQUESTED_EVENT},
        )
        return await worker.run_once(now=datetime(2026, 7, 2, tzinfo=UTC))
    finally:
        await engine.dispose()


def load_notification_and_outbox(
    context: NotificationApiContext,
    notification_id: str,
) -> tuple[Notification, OutboxEvent]:
    return asyncio.run(load_notification_and_outbox_async(context, notification_id))


async def load_notification_and_outbox_async(
    context: NotificationApiContext,
    notification_id: str,
) -> tuple[Notification, OutboxEvent]:
    engine = build_async_engine(context.database_url)
    session_factory = build_session_factory(engine)
    try:
        async with session_factory() as session:
            notification_result = await session.execute(
                select(Notification).where(
                    Notification.id == uuid.UUID(notification_id)
                )
            )
            outbox_result = await session.execute(
                select(OutboxEvent).where(
                    OutboxEvent.event_type == NOTIFICATION_EMAIL_REQUESTED_EVENT,
                    OutboxEvent.aggregate_id == uuid.UUID(notification_id),
                )
            )
            return notification_result.scalar_one(), outbox_result.scalar_one()
    finally:
        await engine.dispose()
