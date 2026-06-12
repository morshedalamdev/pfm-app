# Milestone 07 — Uploads, Email, Notifications, and SSE

- Branch: `integrations-notifications`
- Milestone objective: Implement adapter-oriented receipt storage, notification persistence, local email behavior, and SSE one-way events without blocking local development on external credentials.

## Mandatory execution rule

Read `AGENTS.md` and `PFM_PROJECT_STATE.md` first. Execute **only one explicitly requested phase** from this file. Do not continue to the following phase automatically, even when tests pass. Update `PFM_PROJECT_STATE.md`, create the local phase commit, report exact results, and stop for user permission.

## Branch protocol

Create this branch only when beginning the milestone. Later phases must continue on the same milestone branch. Do not push until the verification phase passes and the user explicitly requests a push.

## Phase 07.1 — Adapter contracts

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Define infrastructure adapters and local implementations before integrating providers.

### Tasks

1. Define storage adapter interface for save, retrieve metadata, and delete operations required by receipt workflows.
2. Define email adapter interface for notifications that require email delivery.
3. Implement local-development storage and console/local email adapters.
4. Document provider extension points without requiring production API keys.
5. Add adapter unit tests.

### Required tests

```bash
cd server
ruff check .
ruff format --check .
mypy app
pytest -q tests
```

### Local commit

```text
milestone(07) phase 07.1: define local storage and email adapters
```

### Stop condition

Adapter contracts and local implementations pass tests.

Stop and ask permission before the next phase.

---

## Phase 07.2 — Receipt upload

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Implement authorized receipt upload metadata and safe local storage.

### Tasks

1. Create receipt model linked to user and optional transaction as required by UI matrix.
2. Implement upload, metadata retrieval, list, and delete behavior.
3. Validate content type, size limits, file-name handling, and ownership.
4. Keep uploaded bytes outside Git tracking and outside database blobs unless design evidence requires otherwise.
5. Create migration and tests for allowed and rejected uploads.

### Required tests

```bash
cd server
ruff check .
ruff format --check .
mypy app
pytest -q
alembic upgrade head
alembic downgrade -1
alembic upgrade head
```

### Local commit

```text
milestone(07) phase 07.2: implement authorized receipt uploads
```

### Stop condition

Receipt migration, storage, validation, and ownership tests pass.

Stop and ask permission before the next phase.

---

## Phase 07.3 — Notifications and email

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Persist notifications and integrate email adapter delivery safely.

### Tasks

1. Create notification model and migration with ownership, type, message or payload, read state, timestamps, and delivery metadata.
2. Implement notification list, unread count, mark-read, and mark-all-read operations needed by the UI.
3. Use outbox or worker path for durable email delivery where applicable.
4. Use console/local email adapter by default and document production provider variables separately.
5. Add tests for notification lifecycle and local email behavior.

### Required tests

```bash
cd server
ruff check .
ruff format --check .
mypy app
pytest -q
alembic upgrade head
alembic downgrade -1
alembic upgrade head
```

### Local commit

```text
milestone(07) phase 07.3: implement notifications and email adapter flow
```

### Stop condition

Notification persistence and local email tests pass.

Stop and ask permission before the next phase.

---

## Phase 07.4 — Server-Sent Events

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Add one-way server push only where justified.

### Tasks

1. Implement authenticated SSE endpoint for notification or refresh-hint events.
2. Define event names, payload shapes, heartbeat strategy, disconnect cleanup, and reconnect expectations.
3. Do not add WebSockets.
4. Add tests for authentication, event serialization, disconnect behavior where testable, and isolation between users.
5. Document frontend integration expectations for milestone 08.

### Required tests

```bash
cd server
ruff check .
ruff format --check .
mypy app
pytest -q tests
```

### Local commit

```text
milestone(07) phase 07.4: add authenticated notification sse stream
```

### Stop condition

SSE behavior and user isolation tests pass.

Stop and ask permission before the next phase.

---

## Phase 07.5 — Integration hardening

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Review adapter boundaries and ensure local work remains key-free.

### Tasks

1. Review receipt, notification, email, outbox, and SSE error handling.
2. Ensure provider credentials are optional in local mode and represented only in `.env.example` descriptions.
3. Add missing integration tests and update endpoint registry.
4. Record production-provider decisions as deferred if the user has not selected providers.

### Required tests

```bash
cd server
ruff check .
ruff format --check .
mypy app
pytest -q tests
```

### Local commit

```text
milestone(07) phase 07.5: harden integration boundaries
```

### Stop condition

Integration boundaries are tested and local development requires no external API keys.

Stop and ask permission before the next phase.

---

## Phase 07.V — Integration verification

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Verify uploads, notifications, email adapter, and SSE features.

### Tasks

1. Run full backend quality suite and migrations.
2. Confirm uploads are ignored by Git and secrets are not committed.
3. Update project state and set next allowed phase to `08.1`.

### Required tests

```bash
cd server
ruff check .
ruff format --check .
mypy app
pytest -q
alembic upgrade head
```

### Local commit

```text
milestone(07) verify: validate integrations notifications milestone
```

### Stop condition

Milestone 07 is verified. Stop and ask permission to push the branch and begin milestone 08.

Stop and ask permission before the next phase.
