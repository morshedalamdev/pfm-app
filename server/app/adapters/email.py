from __future__ import annotations

import logging
import uuid
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from typing import Protocol

from app.core.config import Settings

LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class EmailMessage:
    to: tuple[str, ...]
    subject: str
    text_body: str
    html_body: str | None = None
    metadata: Mapping[str, str] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.to:
            raise ValueError("Email message must include at least one recipient")
        if not self.subject.strip():
            raise ValueError("Email subject cannot be blank")
        if not self.text_body.strip() and not (self.html_body or "").strip():
            raise ValueError("Email message must include a text or HTML body")


@dataclass(frozen=True, slots=True)
class EmailDeliveryResult:
    adapter: str
    provider_message_id: str
    accepted_recipients: tuple[str, ...]


class EmailAdapter(Protocol):
    async def send(self, message: EmailMessage) -> EmailDeliveryResult:
        """Send an email message through the configured provider."""


class ConsoleEmailAdapter:
    def __init__(self, *, from_address: str) -> None:
        self.from_address = from_address

    async def send(self, message: EmailMessage) -> EmailDeliveryResult:
        delivery_id = f"console-{uuid.uuid4()}"
        LOGGER.info(
            "console_email_delivery",
            extra={
                "provider_message_id": delivery_id,
                "from_address": self.from_address,
                "to": list(message.to),
                "subject": message.subject,
            },
        )
        return EmailDeliveryResult(
            adapter="console",
            provider_message_id=delivery_id,
            accepted_recipients=message.to,
        )


class LocalEmailAdapter(ConsoleEmailAdapter):
    def __init__(self, *, from_address: str) -> None:
        super().__init__(from_address=from_address)
        self.sent_messages: list[EmailMessage] = []

    async def send(self, message: EmailMessage) -> EmailDeliveryResult:
        self.sent_messages.append(message)
        return await super().send(message)


def build_email_adapter(settings: Settings) -> EmailAdapter:
    if settings.email_backend == "console":
        return ConsoleEmailAdapter(from_address=settings.email_from_address)
    if settings.email_backend == "local":
        return LocalEmailAdapter(from_address=settings.email_from_address)
    raise ValueError(f"Unsupported email backend: {settings.email_backend}")


def normalize_recipients(recipients: Sequence[str]) -> tuple[str, ...]:
    normalized = tuple(recipient.strip().lower() for recipient in recipients)
    if any(not recipient for recipient in normalized):
        raise ValueError("Email recipients cannot be blank")
    return normalized
