# Milestone 06 Agent — Recurring Transactions and Outbox Worker

- Branch: `recurring-outbox`
- Commit: `milestone(06): add recurring transaction worker and outbox`

## Required workflow

Follow `AGENTS.md` exactly. Read `PFM_PROJECT_STATE.md` first. Work only on this milestone. Think, execute, run the required tests, fix failures until they pass, update `PFM_PROJECT_STATE.md`, commit the milestone, report exact results, and stop. Ask permission before starting the next milestone.

## Objective

Implement durable recurring transactions and a reliable deferred-event path without introducing unnecessary infrastructure.

## Tasks

1. Add models and migrations for recurring rules and outbox events.
2. Implement recurring-rule CRUD with schedule validation, time-zone awareness, next-run tracking, activation, deactivation, and safe retry semantics.
3. Add a separate worker entrypoint. The API process must not be the only place durable scheduled work executes.
4. Coordinate work through PostgreSQL with safe locking or claiming behavior so multiple worker instances do not duplicate processing.
5. Add idempotency keys to generated transactions. Re-running a worker window must not duplicate transactions.
6. Implement outbox event creation within the same database transaction as business changes where appropriate.
7. Add retry metadata, failure state, and useful structured logging.
8. Add tests for due rules, not-yet-due rules, retries, concurrent claims, duplicate prevention, disabled rules, time zones, and failure recovery.
9. Document worker start commands and operational assumptions.

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

Run a worker smoke test against a disposable database and prove that repeating the same execution window does not duplicate transactions.

## Completion gate

Do not add cloud storage or production email credentials. Stop and ask permission to proceed to milestone 07.
