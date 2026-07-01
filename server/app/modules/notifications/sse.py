from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from typing import Protocol
from uuid import UUID

from app.modules.notifications.models import Notification
from app.modules.notifications.repositories import NotificationRepository
from app.modules.notifications.schemas import NotificationResponse
from app.modules.users.models import User

NOTIFICATION_SNAPSHOT_EVENT = "notification.snapshot"
NOTIFICATION_CREATED_EVENT = "notification.created"
NOTIFICATION_HEARTBEAT_EVENT = "heartbeat"
NOTIFICATION_STREAM_RETRY_MS = 15_000
NOTIFICATION_STREAM_INITIAL_LIMIT = 20
NOTIFICATION_STREAM_HEARTBEAT_SECONDS = 15.0


class DisconnectAwareRequest(Protocol):
    async def is_disconnected(self) -> bool:
        pass


def format_sse_event(
    *,
    event: str,
    data: dict[str, object],
    event_id: str | None = None,
    retry_ms: int | None = None,
) -> str:
    lines: list[str] = []
    if event_id is not None:
        lines.append(f"id: {event_id}")
    lines.append(f"event: {event}")
    if retry_ms is not None:
        lines.append(f"retry: {retry_ms}")

    payload = json.dumps(data, separators=(",", ":"), sort_keys=True)
    for line in payload.splitlines():
        lines.append(f"data: {line}")
    return "\n".join(lines) + "\n\n"


async def notification_sse_stream(
    *,
    request: DisconnectAwareRequest,
    current_user: User,
    notifications: NotificationRepository,
    heartbeat_seconds: float = NOTIFICATION_STREAM_HEARTBEAT_SECONDS,
    max_events: int | None = None,
) -> AsyncIterator[str]:
    emitted_events = 0
    seen_notification_ids: set[UUID] = set()

    async def emit(
        *,
        event: str,
        data: dict[str, object],
        event_id: str | None = None,
        retry_ms: int | None = None,
    ) -> str | None:
        nonlocal emitted_events
        if max_events is not None and emitted_events >= max_events:
            return None
        if await request.is_disconnected():
            return None
        emitted_events += 1
        return format_sse_event(
            event=event,
            data=data,
            event_id=event_id,
            retry_ms=retry_ms,
        )

    snapshot = await emit(
        event=NOTIFICATION_SNAPSHOT_EVENT,
        retry_ms=NOTIFICATION_STREAM_RETRY_MS,
        data={
            "generated_at": _utc_now(),
            "refresh": {
                "resource": "notifications",
                "reason": "connected",
            },
            "unread_count": await notifications.count_unread(current_user.id),
        },
    )
    if snapshot is None:
        return
    yield snapshot

    initial_notifications = await _list_visible_unread_notifications(
        notifications,
        current_user,
    )
    for notification in initial_notifications:
        seen_notification_ids.add(notification.id)
        event_payload = await emit(
            event=NOTIFICATION_CREATED_EVENT,
            event_id=str(notification.id),
            data=NotificationResponse.model_validate(notification).model_dump(
                mode="json"
            ),
        )
        if event_payload is None:
            return
        yield event_payload

    while max_events is None or emitted_events < max_events:
        await asyncio.sleep(heartbeat_seconds)
        new_notifications = [
            notification
            for notification in await _list_visible_unread_notifications(
                notifications,
                current_user,
            )
            if notification.id not in seen_notification_ids
        ]
        if new_notifications:
            for notification in new_notifications:
                seen_notification_ids.add(notification.id)
                event_payload = await emit(
                    event=NOTIFICATION_CREATED_EVENT,
                    event_id=str(notification.id),
                    data=NotificationResponse.model_validate(notification).model_dump(
                        mode="json"
                    ),
                )
                if event_payload is None:
                    return
                yield event_payload
            continue

        heartbeat = await emit(
            event=NOTIFICATION_HEARTBEAT_EVENT,
            data={"ts": _utc_now()},
        )
        if heartbeat is None:
            return
        yield heartbeat


async def _list_visible_unread_notifications(
    notifications: NotificationRepository,
    current_user: User,
) -> list[Notification]:
    return await notifications.list_owned(
        current_user.id,
        cursor=None,
        limit=NOTIFICATION_STREAM_INITIAL_LIMIT,
        unread_only=True,
        notification_type=None,
    )


def _utc_now() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")
