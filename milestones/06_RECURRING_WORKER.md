# Milestone 06 — Recurring Transactions and Worker

- Branch: `recurring-worker`
- Milestone objective: Implement recurring transaction rules, durable outbox events, a separate PostgreSQL-coordinated worker, retries, and duplicate-execution protection.

## Mandatory execution rule

Read `AGENTS.md` and `PFM_PROJECT_STATE.md` first. Execute **only one explicitly requested phase** from this file. Do not continue to the following phase automatically, even when tests pass. Update `PFM_PROJECT_STATE.md`, create the local phase commit, report exact results, and stop for user permission.

## Branch protocol

Create this branch only when beginning the milestone. Later phases must continue on the same milestone branch. Do not push until the verification phase passes and the user explicitly requests a push.

## Phase 06.1 — Recurring and outbox schema

**Recommended Codex setup:** GPT-5.5 / Extra High reasoning / Standard speed

### Objective

Create durable recurring-rule and outbox persistence.

### Tasks

1. Create recurring-rule model for supported schedules and transaction templates.
2. Create outbox-event model with event type, payload, status, attempts, available-at, processed-at, error metadata, and timestamps.
3. Define locking and idempotency fields for worker coordination.
4. Create and verify migration.
5. Document supported recurrence rules and intentional limitations.

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
milestone(06) phase 06.1: add recurring and outbox schema
```

### Stop condition

Recurring and outbox schema migration passes.

Stop and ask permission before the next phase.

---

## Phase 06.2 — Scheduling rules

**Recommended Codex setup:** GPT-5.5 / Extra High reasoning / Standard speed

### Objective

Implement recurring-rule CRUD and deterministic due-date calculation.

### Tasks

1. Implement create, list, retrieve, update, pause, resume, and archive behavior required by the UI matrix.
2. Implement deterministic next-run calculation with UTC handling and explicit supported frequencies.
3. Reject invalid rule combinations and cross-user resources.
4. Add tests for date boundaries, month-end behavior, pause/resume, and ownership.

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
milestone(06) phase 06.2: implement recurring schedule rules
```

### Stop condition

Recurring-rule APIs and date calculations pass tests.

Stop and ask permission before the next phase.

---

## Phase 06.3 — Worker process

**Recommended Codex setup:** GPT-5.5 / Extra High reasoning / Standard speed

### Objective

Implement a separately runnable worker that claims due work safely.

### Tasks

1. Create worker entrypoint and polling loop suitable for local and production execution.
2. Use PostgreSQL row-locking coordination such as `FOR UPDATE SKIP LOCKED` where appropriate.
3. Create due transactions atomically and advance recurring rules safely.
4. Emit outbox events for completed work where useful.
5. Add tests proving two worker executions cannot create duplicate scheduled transactions.

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
milestone(06) phase 06.3: implement postgresql coordinated worker
```

### Stop condition

Separate worker and duplicate-execution protection pass tests.

Stop and ask permission before the next phase.

---

## Phase 06.4 — Retries and idempotency

**Recommended Codex setup:** GPT-5.5 / Extra High reasoning / Standard speed

### Objective

Harden worker failure handling.

### Tasks

1. Implement bounded retry handling, available-at backoff, terminal failure state, and clear error metadata for outbox processing.
2. Make transaction creation idempotent for recurring rule and due-run identity.
3. Add failure-injection tests for rollback, retry, duplicate claim, and terminal failure behavior.
4. Document operational recovery steps.

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
milestone(06) phase 06.4: harden worker retries and idempotency
```

### Stop condition

Worker failure and retry tests pass.

Stop and ask permission before the next phase.

---

## Phase 06.5 — Worker operational checks

**Recommended Codex setup:** GPT-5.5 / Extra High reasoning / Standard speed

### Objective

Document and verify how the API and worker run together.

### Tasks

1. Add local run commands and environment variables for the worker.
2. Add worker health or observable logging approach appropriate for the deployment model.
3. Run worker integration test against disposable PostgreSQL.
4. Update project state.

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
milestone(06) phase 06.5: document worker operations
```

### Stop condition

Worker operation is documented and integration tests pass.

Stop and ask permission before the next phase.

---

## Phase 06.V — Worker verification

**Recommended Codex setup:** GPT-5.5 / Extra High reasoning / Standard speed

### Objective

Verify the complete recurring and worker milestone.

### Tasks

1. Run full server checks and migrations.
2. Review recurrence constraints, row-lock strategy, retry behavior, and idempotency records.
3. Update project state and set next allowed phase to `07.1`.

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
milestone(06) verify: validate recurring worker milestone
```

### Stop condition

Milestone 06 is verified. Stop and ask permission to push the branch and begin milestone 07.

Stop and ask permission before the next phase.
