from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.modules.auth.dependencies import CurrentUserDependency
from app.modules.notifications.repositories import NotificationRepository
from app.modules.notifications.schemas import (
    NotificationListResponse,
    NotificationMarkAllReadResponse,
    NotificationResponse,
    NotificationUnreadCountResponse,
)
from app.modules.notifications.services import (
    InvalidNotificationCursorError,
    NotificationNotFoundError,
    NotificationService,
)
from app.modules.notifications.sse import notification_sse_stream
from app.modules.outbox.repositories import OutboxEventRepository

router = APIRouter(prefix="/notifications", tags=["notifications"])
SessionDependency = Annotated[AsyncSession, Depends(get_session)]


def build_notification_service(session: AsyncSession) -> NotificationService:
    return NotificationService(
        notifications=NotificationRepository(session),
        outbox=OutboxEventRepository(session),
    )


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    current_user: CurrentUserDependency,
    session: SessionDependency,
    cursor: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    unread_only: Annotated[bool, Query()] = False,
    type: Annotated[str | None, Query(max_length=80)] = None,
) -> NotificationListResponse:
    try:
        return await build_notification_service(session).list_notifications(
            current_user,
            cursor=cursor,
            limit=limit,
            unread_only=unread_only,
            notification_type=type,
        )
    except InvalidNotificationCursorError as exc:
        raise invalid_cursor_error() from exc


@router.get("/unread-count", response_model=NotificationUnreadCountResponse)
async def unread_count(
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> NotificationUnreadCountResponse:
    return await build_notification_service(session).unread_count(current_user)


@router.get("/stream", response_class=StreamingResponse)
async def stream_notifications(
    request: Request,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> StreamingResponse:
    return StreamingResponse(
        notification_sse_stream(
            request=request,
            current_user=current_user,
            notifications=NotificationRepository(session),
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: str,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> NotificationResponse:
    try:
        return await build_notification_service(session).mark_read(
            parse_uuid_or_404(notification_id),
            current_user,
        )
    except NotificationNotFoundError as exc:
        raise not_found_error() from exc


@router.post("/read-all", response_model=NotificationMarkAllReadResponse)
async def mark_all_notifications_read(
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> NotificationMarkAllReadResponse:
    return await build_notification_service(session).mark_all_read(current_user)


def parse_uuid_or_404(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError as exc:
        raise not_found_error() from exc


def not_found_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Notification not found",
    )


def invalid_cursor_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail="Notification cursor is invalid",
    )
