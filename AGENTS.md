# AGENTS.md — Global Rules for PFM App Codex Work

## Mandatory first action

Before changing code, read `PFM_PROJECT_STATE.md` completely. Then read only the current milestone file and the requested phase section. Inspect only the repository areas required for that phase. Do not rethink the whole architecture unless the code contradicts a recorded decision or the user explicitly requests a redesign.

## Project goal

Replace the existing Node backend scaffold in `server/` with a production-oriented Python FastAPI modular monolith, preserve the completed Next.js frontend UI in `client/`, and connect the UI to PostgreSQL-backed server data progressively.

## Execution unit

The unit of Codex execution is a **single phase inside one milestone file**.

- One Git branch per milestone.
- Multiple local commits inside that branch, normally one commit per completed phase.
- One milestone verification phase before pushing the branch.
- Never execute a later phase automatically.

## Mandatory workflow for every phase

Follow this sequence exactly:

1. **Read**
   - Read `AGENTS.md`.
   - Read `PFM_PROJECT_STATE.md` completely.
   - Read the current `milestones/NN_*.md` file.
   - Execute only the phase explicitly named by the user prompt.

2. **Inspect and think**
   - Run `git status --short --branch` and inspect relevant code, tests, environment templates, and migrations.
   - Review prior phase results recorded in `PFM_PROJECT_STATE.md`.
   - State a concise plan for the current phase only.
   - Ask for a user decision only when the phase cannot be completed safely without it.

3. **Execute**
   - Make only the changes required by the current phase.
   - Preserve existing frontend layout, styling, routes, and working behavior unless the phase explicitly requires a UI change.
   - Never hardcode credentials or secrets.
   - Do not implement work assigned to later phases.

4. **Test and repair**
   - Run every test command listed for the current phase.
   - Debug and fix failures until the required checks pass or an external blocker is proven.
   - Do not claim success when required checks were skipped. Record unavailable checks and the exact reason.

5. **Record state**
   - Update `PFM_PROJECT_STATE.md` with phase status, decisions, files, migrations, endpoints, commands, tests, blockers, and the next allowed phase.
   - Add a dated entry to the progress log.

6. **Commit locally**
   - Create a local commit using the phase commit format from the milestone file.
   - Do not push unless the user explicitly requests it.

7. **Stop**
   - Report the required output format below.
   - Ask permission to continue to the next phase.
   - Do not begin the next phase automatically.

## Branch and commit protocol

- Branch format: `short-name`
- Phase commit format: `milestone(NN) phase NN.X: concise completed outcome`
- Verification commit format: `milestone(NN) verify: validate short-name milestone`
- Begin a milestone branch from the latest merged and passed milestone branch, normally updated `main`.
- Never commit secrets, `.env`, virtual environments, local databases, uploaded receipts, build output, coverage output, editor state, or temporary files.

## Architecture rules

- Use a **FastAPI modular monolith**. Do not introduce microservices.
- Use PostgreSQL as the system of record.
- Use SQLAlchemy 2 async sessions and Alembic migrations.
- Use Pydantic models for validation and `pydantic-settings` for typed environment configuration.
- Use `/api/v1` versioning from the first backend milestone.
- Use OpenAPI as the frontend/backend contract and generate TypeScript API types or a client from FastAPI schema.
- Store persisted money using PostgreSQL `NUMERIC` and Python `Decimal`. Never persist financial values as floating-point numbers.
- Keep balances and analytics reproducible from source records.
- Use database transactions for multi-record money mutations.
- Use idempotency protection for retryable mutation paths.
- Use Argon2 password hashing through `pwdlib` unless compatibility requirements prove otherwise.
- Use short-lived access JWTs and rotated refresh sessions. Never store plaintext refresh tokens.
- Use Server-Sent Events only for one-way notifications or refresh hints. Do not introduce WebSockets without a proven bidirectional requirement.
- Put scheduled and deferred durable work in a separate worker path. Do not execute durable scheduled work inside API request handlers.
- Implement adapters for storage and email so local development works without third-party credentials.
- Do not add Redis automatically. Introduce it only after documenting a concrete requirement PostgreSQL coordination cannot satisfy cleanly.

## Backend test rules

Progressively run the applicable subset of:

```bash
cd server
ruff check .
ruff format --check .
mypy app
pytest
alembic upgrade head
```

When a migration is added, run an upgrade/downgrade/upgrade smoke test against a disposable database. Never run destructive tests against the developer's personal database.

## Frontend test rules

Progressively run the applicable subset of:

```bash
cd client
npm run build
npm run lint --if-present
npm run test --if-present
```

Add browser or end-to-end tests after frontend integration begins.

## Scope control

- Do not redesign the frontend.
- Do not replace working modules merely to use a preferred style.
- Do not add bank aggregation, payments, investments, trading, AI features, organizations, or a mobile app unless the user explicitly expands scope.
- Do not add GraphQL merely because it exists. REST plus OpenAPI is the default.
- Do not silently expand an MVP requirement into a large platform feature.

## Required final output after every phase

Return only:

1. Phase completed or blocked.
2. Milestone branch and local commit SHA if committed.
3. Files added, changed, or deleted.
4. Migrations created or applied.
5. Endpoints added or changed.
6. Exact test commands and pass/fail results.
7. External credentials or user decisions still needed.
8. The next allowed phase.
9. One question asking permission to continue.
