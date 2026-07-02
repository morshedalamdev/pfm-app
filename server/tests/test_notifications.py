from __future__ import annotations

import asyncio
import json
import uuid
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import datetime, timedelta
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
from app.modules.notifications.sse import (
    NOTIFICATION_CREATED_EVENT,
    NOTIFICATION_HEARTBEAT_EVENT,
    NOTIFICATION_SNAPSHOT_EVENT,
    NOTIFICATION_STREAM_RETRY_MS,
    format_sse_event,
    notification_sse_stream,
)
from app.modules.outbox.models import OutboxEvent
from app.modules.outbox.repositories import OutboxEventRepository
from app.modules.users.models import User
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


class FakeSseRequest:
    def __init__(self, *, disconnect_after_checks: int | None = None) -> None:
        self.disconnect_after_checks = disconnect_after_checks
        self.checks = 0

    async def is_disconnected(self) -> bool:
        disconnected = (
            self.disconnect_after_checks is not None
            and self.checks >= self.disconnect_after_checks
        )
        self.checks += 1
        return disconnected


class FailingEmailAdapter:
    async def send(self, message: object) -> object:
        raise RuntimeError("email provider unavailable")


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
    result = run_notification_email_worker(
        context,
        adapter,
        now=pending_outbox.available_at + timedelta(seconds=1),
    )

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


def test_notification_email_outbox_retry_records_adapter_failure(
    notification_context: NotificationApiContext,
) -> None:
    context = notification_context
    user = register_and_login(context, "notifications-email-fail@example.com")
    notification = create_notification(
        context,
        user.user_id,
        title="Email adapter failure",
        message="This message should be retried.",
        request_email=True,
    )
    _, pending_outbox = load_notification_and_outbox(context, notification["id"])
    now = pending_outbox.available_at + timedelta(seconds=1)

    result = run_notification_email_worker_with_handler(
        context,
        NotificationEmailHandler(FailingEmailAdapter()),
        now=now,
    )

    assert result.claimed == 1
    assert result.processed == 0
    assert result.retried == 1
    assert result.failed == 0
    failed_notification, retried_outbox = load_notification_and_outbox(
        context,
        notification["id"],
    )
    assert failed_notification.email_delivery_status == "pending"
    assert failed_notification.email_sent_at is None
    assert retried_outbox.status == "pending"
    assert retried_outbox.attempts == 1
    assert retried_outbox.error_type == "RuntimeError"
    assert retried_outbox.error_message == "email provider unavailable"
    assert retried_outbox.locked_by is None
    assert retried_outbox.locked_until is None
    assert retried_outbox.available_at > now


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


def test_notification_sse_requires_auth_and_openapi_contract(
    notification_context: NotificationApiContext,
) -> None:
    response = notification_context.client.get("/api/v1/notifications/stream")
    assert response.status_code == 401

    schema = notification_context.client.get("/openapi.json").json()
    stream_contract = schema["paths"]["/api/v1/notifications/stream"]["get"]
    assert stream_contract["security"] == [{"HTTPBearer": []}]
    assert stream_contract["responses"]["200"]["description"] == "Successful Response"


def test_notification_sse_format_and_user_isolation(
    notification_context: NotificationApiContext,
) -> None:
    context = notification_context
    owner = register_and_login(context, "notifications-sse-owner@example.com")
    other = register_and_login(context, "notifications-sse-other@example.com")
    first = create_notification(
        context,
        owner.user_id,
        notification_type="budget.alert",
        title="Dining budget",
        payload={"budget_id": "budget-1"},
    )
    second = create_notification(
        context,
        owner.user_id,
        notification_type="receipt.uploaded",
        title="Receipt uploaded",
    )
    create_notification(context, other.user_id, title="Other user's alert")

    events = collect_notification_sse_events(
        context,
        owner.user_id,
        request=FakeSseRequest(),
        max_events=3,
    )

    snapshot = parse_sse_event(events[0])
    assert snapshot["event"] == NOTIFICATION_SNAPSHOT_EVENT
    assert snapshot["retry"] == str(NOTIFICATION_STREAM_RETRY_MS)
    assert snapshot["data"]["unread_count"] == 2
    assert snapshot["data"]["refresh"] == {
        "resource": "notifications",
        "reason": "connected",
    }

    notification_events = [parse_sse_event(event) for event in events[1:]]
    assert {event["event"] for event in notification_events} == {
        NOTIFICATION_CREATED_EVENT
    }
    assert {event["id"] for event in notification_events} == {
        first["id"],
        second["id"],
    }
    assert {event["data"]["user_id"] for event in notification_events} == {
        owner.user_id
    }

    formatted = format_sse_event(
        event=NOTIFICATION_HEARTBEAT_EVENT,
        event_id="heartbeat-1",
        retry_ms=1000,
        data={"ok": True},
    )
    assert formatted == (
        'id: heartbeat-1\nevent: heartbeat\nretry: 1000\ndata: {"ok":true}\n\n'
    )


def test_notification_sse_disconnect_stops_stream(
    notification_context: NotificationApiContext,
) -> None:
    context = notification_context
    owner = register_and_login(context, "notifications-sse-disconnect@example.com")
    create_notification(context, owner.user_id, title="Should not stream")

    events = collect_notification_sse_events(
        context,
        owner.user_id,
        request=FakeSseRequest(disconnect_after_checks=0),
        max_events=1,
    )

    assert events == []


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


def collect_notification_sse_events(
    context: NotificationApiContext,
    user_id: str,
    *,
    request: FakeSseRequest,
    max_events: int,
) -> list[str]:
    return asyncio.run(
        collect_notification_sse_events_async(
            context,
            user_id,
            request=request,
            max_events=max_events,
        )
    )


async def collect_notification_sse_events_async(
    context: NotificationApiContext,
    user_id: str,
    *,
    request: FakeSseRequest,
    max_events: int,
) -> list[str]:
    engine = build_async_engine(context.database_url)
    session_factory = build_session_factory(engine)
    try:
        async with session_factory() as session:
            user_result = await session.execute(
                select(User).where(User.id == uuid.UUID(user_id))
            )
            user = user_result.scalar_one()
            stream = notification_sse_stream(
                request=request,
                current_user=user,
                notifications=NotificationRepository(session),
                heartbeat_seconds=0,
                max_events=max_events,
            )
            return [event async for event in stream]
    finally:
        await engine.dispose()


def parse_sse_event(raw_event: str) -> dict[str, Any]:
    parsed: dict[str, Any] = {}
    data_lines: list[str] = []
    for line in raw_event.strip().splitlines():
        field, value = line.split(": ", 1)
        if field == "data":
            data_lines.append(value)
        else:
            parsed[field] = value
    parsed["data"] = json.loads("\n".join(data_lines))
    return parsed


def run_notification_email_worker(
    context: NotificationApiContext,
    adapter: LocalEmailAdapter,
    *,
    now: datetime,
) -> Any:
    return run_notification_email_worker_with_handler(
        context,
        NotificationEmailHandler(adapter),
        now=now,
    )


def run_notification_email_worker_with_handler(
    context: NotificationApiContext,
    handler: NotificationEmailHandler,
    *,
    now: datetime,
) -> Any:
    return asyncio.run(
        run_notification_email_worker_with_handler_async(
            context,
            handler,
            now=now,
        )
    )


async def run_notification_email_worker_with_handler_async(
    context: NotificationApiContext,
    handler: NotificationEmailHandler,
    *,
    now: datetime,
) -> Any:
    engine = build_async_engine(context.database_url)
    session_factory = build_session_factory(engine)
    try:
        worker = OutboxWorker(
            session_factory,
            handler=handler,
            worker_id="notification-email-test-worker",
            batch_size=10,
            event_types={NOTIFICATION_EMAIL_REQUESTED_EVENT},
        )
        return await worker.run_once(now=now)
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
