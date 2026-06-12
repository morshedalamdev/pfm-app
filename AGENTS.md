# AGENTS.md — Global Rules for PFM App Codex Work

## Mandatory first action

Before changing code, read `PFM_PROJECT_STATE.md` completely. Then inspect only the repository areas required by the current milestone. Do not rethink the entire architecture unless the current code contradicts a recorded decision or the user explicitly asks for a redesign.

## Project goal

Replace the existing Node/Express backend scaffold in `server/` with a Python FastAPI backend, preserve the completed Next.js frontend UI in `client/`, and progressively connect that UI to real PostgreSQL-backed server data.

## Execution contract for every milestone

Follow this sequence exactly:

1. **Think**
   - Read `PFM_PROJECT_STATE.md`.
   - Inspect `git status`, the current branch, relevant source files, environment files, and existing tests.
   - State a concise implementation plan for this milestone only.
   - Identify blockers. Ask the user only for information that is genuinely required to continue.

2. **Execute**
   - Create or switch to the milestone branch defined in the current agent file.
   - Implement only the current milestone scope.
   - Preserve existing UI layout, styling, routes, and behavior unless the milestone explicitly requires a change.
   - Prefer small modules, explicit names, typed interfaces, and production-oriented defaults.
   - Never hardcode credentials or secrets.

3. **Test and repair**
   - Run every test command required by the current milestone.
   - When a test fails, debug and fix the failure.
   - Repeat until all required checks pass or a genuine external blocker is proven.
   - Do not report success when a required test was skipped. Clearly mark unavailable checks and the reason.

4. **Record state**
   - Update `PFM_PROJECT_STATE.md` with decisions, created modules, migrations, endpoints, test results, open blockers, and the next allowed milestone.
   - Add a dated milestone entry to the progress log.
   - Commit the milestone changes with the commit style defined below.

5. **Stop**
   - Report changed files, migrations, endpoints, and exact test results.
   - Ask for permission before proceeding to the next milestone.
   - Do not begin the next milestone automatically.

## Branch and commit protocol

- Branch format: `short-name`
- Commit format: `milestone(NN): concise completed outcome`
- Start a new milestone branch from the latest passed milestone branch.
- Do not push to the remote unless the user explicitly asks you to push.
- Never commit secrets, `.env`, local database files, build output, virtual environments, coverage output, or uploaded receipts.

## Architecture rules

- Use a **FastAPI modular monolith**. Do not introduce microservices.
- Use PostgreSQL as the system of record.
- Use SQLAlchemy 2 async sessions and Alembic migrations.
- Use Pydantic models for API validation and `pydantic-settings` for environment configuration.
- Use `/api/v1` versioning from the first backend milestone.
- Use OpenAPI as the frontend/backend contract and generate TypeScript API types or a client from the FastAPI schema.
- Store monetary values using PostgreSQL `NUMERIC` and Python `Decimal`. Never use floating-point values for persisted money.
- Keep derived balances and analytics reproducible from source records.
- Use idempotency protection for mutation paths that may be retried.
- Use Argon2 password hashing through `pwdlib` unless an existing migration requirement proves that bcrypt compatibility is needed.
- Use short-lived access JWTs and refresh-session rotation. Do not store plaintext refresh tokens.
- Add Server-Sent Events only for one-way server push. Do not add WebSockets unless a proven bidirectional requirement appears.
- Put recurring or deferred work in a worker path. Do not perform durable scheduled work inside a request handler.
- Implement adapters for object storage and email so local development works without third-party credentials.

## Testing rules

Backend checks should progressively include:

```bash
ruff check .
ruff format --check .
mypy app
pytest
alembic upgrade head
```

Add migration downgrade/upgrade smoke checks when a new migration is created. Use a disposable test database, never the developer's primary database.

Frontend checks should progressively include:

```bash
npm run build
npm run lint --if-present
npm run test --if-present
```

Add end-to-end checks when the frontend is connected to the backend.

## Scope control

- Do not rewrite the frontend design.
- Do not replace working components merely to apply a preferred style.
- Do not add bank aggregation, payment processing, investment trading, AI features, multi-tenant organizations, or mobile applications unless the user explicitly expands the scope.
- Do not implement GraphQL merely because it exists. REST plus OpenAPI is the default fit for this product.
- Do not add Redis automatically. Introduce it only when a milestone demonstrates a concrete need that PostgreSQL and a separate worker cannot satisfy cleanly.

## Required final output after each milestone

Return only:

1. Milestone completed or blocked.
2. Branch name and commit SHA if committed.
3. Files added, changed, or deleted.
4. Migrations created or applied.
5. Endpoints added or changed.
6. Test commands and pass/fail results.
7. External credentials or user decisions still needed.
8. A single question: permission to proceed to the next milestone.
