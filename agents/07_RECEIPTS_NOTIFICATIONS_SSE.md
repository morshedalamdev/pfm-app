# Milestone 07 Agent — Receipts, Notifications, Email, and SSE

- Branch: `receipts-notifications-sse`
- Commit: `milestone(07): add receipts notifications and SSE updates`

## Required workflow

Follow `AGENTS.md` exactly. Read `PFM_PROJECT_STATE.md` first. Work only on this milestone. Think, execute, run the required tests, fix failures until they pass, update `PFM_PROJECT_STATE.md`, commit the milestone, report exact results, and stop. Ask permission before starting the next milestone.

## Objective

Add optional receipt uploads, user notifications, an email adapter, and one-way server push for useful update signals.

## Tasks

1. Ask the user which production storage provider to target only when required. Support a local-development storage adapter regardless of the answer.
2. Ask the user which production email provider or SMTP service to target only when required. Support a console/local email adapter regardless of the answer.
3. Add receipt metadata model and migration. Validate media type, size limits, ownership, storage keys, and safe filenames. Do not store receipt bytes in PostgreSQL unless the user explicitly requires it.
4. Add notification model and migration with unread/read state and delivery metadata.
5. Consume relevant outbox events to create notifications and request email delivery where configured.
6. Add an authenticated SSE endpoint for user-specific events such as notification arrival or data-refresh hints.
7. Support reconnect-safe event identifiers where practical. Do not use WebSockets unless a newly discovered bidirectional requirement proves necessary.
8. Add tests for upload validation, ownership isolation, local storage behavior, notification creation, read state, email adapter behavior, SSE authorization, and event streaming.
9. Update `.env.example` without adding actual secrets.

## Tests

```bash
cd server
ruff check .
ruff format --check .
mypy app
pytest
alembic downgrade -1
alembic upgrade head
```

## Completion gate

Finish with local adapters working even when no third-party credentials are provided. Stop and ask permission to proceed to milestone 08.
