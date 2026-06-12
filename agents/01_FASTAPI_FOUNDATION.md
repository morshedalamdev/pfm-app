# Milestone 01 Agent — FastAPI Foundation

- Branch: `fastapi-foundation`
- Commit: `milestone(01): establish FastAPI backend foundation`

## Required workflow

Follow `AGENTS.md` exactly. Read `PFM_PROJECT_STATE.md` first. Work only on this milestone. Think, execute, run the required tests, fix failures until they pass, update `PFM_PROJECT_STATE.md`, commit the milestone, report exact results, and stop. Ask permission before starting the next milestone.

## Objective

Replace the stale Node server scaffold with a production-oriented Python FastAPI foundation. Do not implement business modules beyond health and readiness behavior.

## Tasks

1. Verify milestone 00 passed and start from its branch.
2. Remove or archive obsolete Express/Prisma server files only after confirming they are not required. Do not leave misleading Node backend setup instructions.
3. Create a `server/pyproject.toml` and a Python package layout aligned with `PFM_PROJECT_STATE.md`.
4. Configure:
   - FastAPI application factory or clear entrypoint;
   - `/api/v1/health` liveness endpoint;
   - `/api/v1/ready` readiness endpoint that checks database connectivity;
   - `pydantic-settings` configuration;
   - `.env.example` without secrets;
   - SQLAlchemy 2 async engine and session dependency;
   - PostgreSQL async driver;
   - Alembic migration environment;
   - structured logging;
   - CORS configured from environment variables;
   - consistent error response format;
   - API router composition;
   - test database isolation;
   - Ruff, formatting, mypy, pytest, pytest-asyncio, and HTTPX test tooling.
5. Create an initial migration baseline if required by the chosen Alembic arrangement.
6. Add local setup instructions for an already-installed PostgreSQL server. Provide database creation commands but do not assume credentials.
7. Keep dependency versions compatible. Do not pin arbitrary stale versions without a reason.

## Tests

```bash
cd server
ruff check .
ruff format --check .
mypy app
pytest
alembic upgrade head
```

Also verify:

```bash
curl -i http://localhost:8000/api/v1/health
curl -i http://localhost:8000/api/v1/ready
```

Use a disposable development or test database. Test any created migration with downgrade and re-upgrade where safe.

## Completion gate

Finish only when a clean FastAPI server starts, database readiness works, migrations execute, and quality checks pass. Do not begin authentication. Stop and ask permission to proceed to milestone 02.
