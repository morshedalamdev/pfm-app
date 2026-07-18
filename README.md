# PFM App

Personal finance management app with a Next.js frontend, FastAPI backend,
PostgreSQL database, and a separate recurring-work worker.

The backend is a Python FastAPI modular monolith under `server/`. The frontend
is a Next.js App Router application under `client/`. PostgreSQL is the system of
record, Alembic manages schema migrations, and the frontend API contract is
generated from the FastAPI OpenAPI schema.

## Project Layout

```text
client/                    Next.js frontend
server/                    FastAPI backend and worker code
docs/architecture/          System design and UI/API mapping
docs/development/CI.md      Local and GitHub Actions CI commands
docs/deployment/DEPLOYMENT.md
compose.yml                Local PostgreSQL/API/worker/frontend stack
milestones/                Phase-by-phase delivery plan
PFM_PROJECT_STATE.md       Persistent phase memory and command log
AGENTS.md                  Codex execution rules
```

## Prerequisites

- Python 3.12+
- Node.js 24+ and npm
- PostgreSQL server/client tools for local database work
- Docker with Compose for the containerized local stack

## Environment Files

Use the committed templates and keep real values out of Git:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env.local
```

Local defaults use key-free adapters:

- `STORAGE_BACKEND=local` stores receipt bytes under an ignored local storage
  root.
- `EMAIL_BACKEND=console` logs email delivery instead of using external
  credentials.

Production storage and email providers are optional future adapter choices.
Provider credentials must be supplied through the deployment environment, never
committed.

## Install Dependencies

Backend:

```bash
cd server
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[dev,test]"
```

Frontend:

```bash
cd client
npm install
```

## Run With Docker Compose

Validate the local stack:

```bash
docker compose config
```

Build the images:

```bash
docker compose build
```

Apply migrations and start the full stack:

```bash
docker compose up -d postgres
docker compose run --rm api alembic upgrade head
docker compose up
```

The API runs at `http://localhost:8000`, and the frontend runs at
`http://localhost:3000`. PostgreSQL is published on host port `5433` by
default so it does not collide with a PostgreSQL server already using `5432`.

When `server/.env` exists, Compose overlays it onto the API container after
`server/.env.example`. This makes ignored local Google and GitHub OAuth
credentials available to the API without committing them or exposing them to
the worker container.

Override host ports without editing committed files:

```bash
POSTGRES_PORT=55432 API_PORT=58000 FRONTEND_PORT=53000 docker compose up
```

The frontend container uses the server-only `SERVER_API_BASE_URL=http://api:8000`
to reach FastAPI over the Compose network. Browser requests stay same-origin
and go through the frontend's `/api/*` route handlers, so no backend URL is
embedded in browser JavaScript. If a Docker metadata or registry timeout stops
`docker compose build`, rerun the build before `docker compose up`.

Compose also derives local API CORS origins from `FRONTEND_PORT` for both
`localhost` and `127.0.0.1`. Set `CORS_ORIGINS` to an explicit JSON array when
using another browser hostname.

Stop the stack:

```bash
docker compose down
```

Reset local Compose data, including PostgreSQL and local receipt storage:

```bash
docker compose down --volumes
```

Run one recurring worker tick in the container:

```bash
docker compose run --rm worker python -m app.workers.recurring --once
```

## Run Without Docker

Create a local PostgreSQL database:

```bash
createuser pfm_app
createdb --owner=pfm_app pfm_app
```

Start the API:

```bash
cd server
source .venv/bin/activate
export DATABASE_URL=postgresql+asyncpg://pfm_app@localhost:5432/pfm_app
alembic upgrade head
uvicorn app.main:app --reload
```

Start the recurring worker in a second terminal:

```bash
cd server
source .venv/bin/activate
export DATABASE_URL=postgresql+asyncpg://pfm_app@localhost:5432/pfm_app
python -m app.workers.recurring
```

Start the frontend in a third terminal:

```bash
cd client
npm run dev
```

Health endpoints:

- `GET /api/v1/health/live`
- `GET /api/v1/health/ready`

Workers do not expose HTTP health endpoints. Monitor worker process status and
structured log events such as `recurring_worker_tick` and `outbox_worker_tick`.

## Migrations

Run Alembic from `server/` with a valid PostgreSQL `DATABASE_URL`:

```bash
alembic upgrade head
```

For migration development, test upgrade/downgrade/upgrade behavior against a
disposable database. Do not run destructive migration checks against a personal
or production database.

## API Contract

Generate the frontend OpenAPI JSON and TypeScript API types from FastAPI:

```bash
cd client
npm run api:generate
```

Check for contract drift:

```bash
cd client
npm run api:check
```

Generated files live in `client/generated/` and should not be hand-edited.

## Tests And Quality Checks

Backend checks from `server/`:

```bash
ruff check .
ruff format --check .
mypy app
pytest -q
alembic upgrade head
```

Frontend checks from `client/`:

```bash
npm run check
npm run e2e
```

`npm run check` validates generated API contract drift, lint, TypeScript, unit
tests, and a production Next.js build. The E2E suite runs the mobile-width user
journeys with Playwright.

## Documentation

- Architecture: `docs/architecture/SYSTEM_DESIGN.md`
- UI/API mapping: `docs/architecture/UI_API_MATRIX.md`
- CI: `docs/development/CI.md`
- Deployment: `docs/deployment/DEPLOYMENT.md`
- Render + Neon: `docs/deployment/RENDER_NEON.md`
- Backend details: `server/README.md`

## Milestone Workflow

Codex work follows the phase workflow in `AGENTS.md` and
`PFM_PROJECT_STATE.md`:

1. Work on one milestone branch at a time.
2. Execute exactly one requested phase from the active milestone file.
3. Run the phase-required checks and repair failures.
4. Update `PFM_PROJECT_STATE.md`.
5. Create one local phase commit.
6. Stop and ask permission before continuing.

Do not push milestone branches until the verification phase passes and the user
explicitly requests a push.
