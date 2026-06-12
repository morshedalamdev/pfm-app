# Milestone 01 — FastAPI Foundation

- Branch: `fastapi-foundation`
- Milestone objective: Replace the obsolete Node server scaffold with a typed FastAPI foundation, PostgreSQL persistence layer, Alembic, health endpoints, and baseline Python tooling.

## Mandatory execution rule

Read `AGENTS.md` and `PFM_PROJECT_STATE.md` first. Execute **only one explicitly requested phase** from this file. Do not continue to the following phase automatically, even when tests pass. Update `PFM_PROJECT_STATE.md`, create the local phase commit, report exact results, and stop for user permission.

## Branch protocol

Create this branch only when beginning the milestone. Later phases must continue on the same milestone branch. Do not push until the verification phase passes and the user explicitly requests a push.

## Phase 01.1 — Python server scaffold

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Create the Python project structure and remove stale Node backend artifacts safely.

### Tasks

1. Read milestone 00 server-replacement notes before deleting anything.
2. Remove stale Node-only server implementation files and package artifacts only when milestone 00 confirmed they are replaceable. Preserve any conceptually useful documentation by translating it into project state notes.
3. Create `server/pyproject.toml`, Python package layout, `tests/`, `.env.example`, `.gitignore` adjustments, and dependency groups for runtime, development, and testing.
4. Add FastAPI, Uvicorn, SQLAlchemy async support, async PostgreSQL driver, Alembic, Pydantic Settings, pytest, pytest-asyncio, httpx, Ruff, and mypy dependencies.
5. Create a minimal importable `app` package without domain features.
6. Update `PFM_PROJECT_STATE.md` with removed files, new layout, setup commands, and phase status.

### Required tests

```bash
cd server
python -m compileall app
python -m pytest --collect-only
ruff check .
ruff format --check .
```

### Local commit

```text
milestone(01) phase 01.1: initialize python server scaffold
```

### Stop condition

The Python server scaffold imports successfully, lint checks pass, and no later-phase domain code was added.

Stop and ask permission before the next phase.

---

## Phase 01.2 — FastAPI app configuration

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Build the application entrypoint and core infrastructure without database domain models.

### Tasks

1. Implement typed settings with `pydantic-settings` and environment-variable loading.
2. Implement app factory or clean application initialization, `/api/v1` router composition, structured logging foundation, CORS settings, and consistent exception envelope.
3. Add application metadata and OpenAPI configuration.
4. Add a simple liveness endpoint that does not require database connectivity.
5. Write tests for application startup, OpenAPI availability, version prefix, liveness response, and error-envelope behavior.
6. Update project state with core modules and test commands.

### Required tests

```bash
cd server
ruff check .
ruff format --check .
mypy app
pytest -q
```

### Local commit

```text
milestone(01) phase 01.2: configure fastapi application core
```

### Stop condition

Application startup, OpenAPI, liveness, logging foundation, and error envelope pass tests.

Stop and ask permission before the next phase.

---

## Phase 01.3 — PostgreSQL persistence

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Add async PostgreSQL connection management and SQLAlchemy base infrastructure.

### Tasks

1. Implement database URL configuration with safe local defaults documented in `.env.example`.
2. Create SQLAlchemy async engine, async session factory, declarative base, metadata conventions, and request-scoped session dependency.
3. Add a disposable test database strategy. Never run destructive tests against a developer database.
4. Add connection test helpers and unit/integration tests for session lifecycle.
5. Document local PostgreSQL database creation commands without embedding credentials.

### Required tests

```bash
cd server
ruff check .
ruff format --check .
mypy app
pytest -q
```

### Local commit

```text
milestone(01) phase 01.3: configure async postgresql persistence
```

### Stop condition

Async database sessions work against a disposable PostgreSQL test database or a clearly recorded external PostgreSQL blocker is proven.

Stop and ask permission before the next phase.

---

## Phase 01.4 — Alembic and health checks

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Add reproducible migrations and database-aware readiness checks.

### Tasks

1. Initialize Alembic for async SQLAlchemy metadata.
2. Create the initial migration baseline appropriate for the empty domain foundation.
3. Implement `/health/live` and `/health/ready`; readiness must verify database connectivity.
4. Add migration and health endpoint tests.
5. Document migration commands in project state.

### Required tests

```bash
cd server
ruff check .
ruff format --check .
mypy app
pytest -q
alembic upgrade head
alembic downgrade base
alembic upgrade head
```

### Local commit

```text
milestone(01) phase 01.4: add migrations and health checks
```

### Stop condition

Alembic smoke checks and both health endpoints pass.

Stop and ask permission before the next phase.

---

## Phase 01.V — Foundation verification

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Run the complete foundation suite and inspect scope before the branch is pushed.

### Tasks

1. Review changed files and confirm no domain features from milestone 02 or later were implemented.
2. Run the full server quality suite and migration smoke checks.
3. Verify `.env` is ignored and `.env.example` contains no secrets.
4. Update project state with milestone verification results and set the next allowed phase to `02.1`.

### Required tests

```bash
cd server
ruff check .
ruff format --check .
mypy app
pytest -q
alembic upgrade head
alembic downgrade base
alembic upgrade head
```

### Local commit

```text
milestone(01) verify: validate fastapi foundation milestone
```

### Stop condition

Milestone 01 is verified. Stop and ask permission to push the branch and begin milestone 02.

Stop and ask permission before the next phase.
