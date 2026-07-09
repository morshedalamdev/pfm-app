# PFM Server

FastAPI backend scaffold for the PFM app.

## Local setup

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[dev,test]"
```

## Phase 01.1 checks

```bash
python -m compileall app
python -m pytest --collect-only
ruff check .
ruff format --check .
```

## Local PostgreSQL

Create a local development database without embedding credentials:

```bash
createuser pfm_app
createdb --owner=pfm_app pfm_app
```

Then set:

```bash
DATABASE_URL=postgresql+asyncpg://pfm_app@localhost:5432/pfm_app
```

## Migrations

Run Alembic from `server/` with a PostgreSQL `DATABASE_URL`:

```bash
alembic upgrade head
alembic downgrade base
```

## Running locally

Start the API and the recurring worker as separate processes that point at the
same PostgreSQL database.

Terminal 1:

```bash
cd server
source .venv/bin/activate
export DATABASE_URL=postgresql+asyncpg://pfm_app@localhost:5432/pfm_app
alembic upgrade head
uvicorn app.main:app --reload
```

Terminal 2:

```bash
cd server
source .venv/bin/activate
export DATABASE_URL=postgresql+asyncpg://pfm_app@localhost:5432/pfm_app
python -m app.workers.recurring
```

For a one-shot local tick, use:

```bash
python -m app.workers.recurring --once
```

The recurring worker also accepts CLI overrides for local checks:

```bash
python -m app.workers.recurring \
  --once \
  --batch-size 10 \
  --lock-seconds 60 \
  --poll-seconds 5 \
  --worker-id local-recurring-worker
```

The durable outbox worker is imported by event-specific adapters. Notification
email delivery registers a `notification.email.requested` handler through
`app.workers.notifications`; there is no standalone generic outbox command
because each event type needs an explicit handler.

## Running with Docker Compose

The repository root `compose.yml` starts local PostgreSQL, the FastAPI API, the
recurring worker, and the Next.js frontend with key-free local defaults. It uses
the committed `server/.env.example` and `client/.env.example` templates, then
overrides container-specific values such as `DATABASE_URL` and
`LOCAL_STORAGE_ROOT`.

Build the images:

```bash
docker compose build
```

Start the database first when applying migrations:

```bash
docker compose up -d postgres
docker compose run --rm api alembic upgrade head
```

Start the full local stack:

```bash
docker compose up
```

The API is exposed on `http://localhost:8000`, and the frontend is exposed on
`http://localhost:3000`. PostgreSQL uses host port `5433` by default to avoid
colliding with a host PostgreSQL service on `5432`. Override host ports or
local-only credentials without editing committed files:

```bash
API_PORT=8001 FRONTEND_PORT=3001 POSTGRES_PORT=55432 docker compose up
```

Compose derives local API CORS origins from `FRONTEND_PORT` for both
`localhost` and `127.0.0.1`. Provide `CORS_ORIGINS` as a JSON array to use a
different browser hostname.

Stop the stack while keeping named volumes:

```bash
docker compose down
```

Reset local Compose data, including PostgreSQL and local receipt storage:

```bash
docker compose down --volumes
```

Run a one-shot recurring worker tick inside the built worker image:

```bash
docker compose run --rm worker python -m app.workers.recurring --once
```

The Compose defaults are for local development only. Set real deployment
secrets through the deployment environment instead of committing `.env` files.

## Worker environment

The API and workers share the normal application settings, especially
`DATABASE_URL`, `DATABASE_ECHO`, `DATABASE_POOL_SIZE`, and
`DATABASE_MAX_OVERFLOW`.

Recurring worker settings:

| Variable | Default | Description |
|---|---:|---|
| `RECURRING_WORKER_BATCH_SIZE` | `25` | Maximum due recurring rules claimed per tick. |
| `RECURRING_WORKER_LOCK_SECONDS` | `60` | Claim lease duration before another worker may reclaim stale work. |
| `RECURRING_WORKER_POLL_SECONDS` | `30` | Sleep interval between polling ticks. |

Outbox worker settings used by event-specific worker registrations:

| Variable | Default | Description |
|---|---:|---|
| `OUTBOX_WORKER_BATCH_SIZE` | `25` | Maximum available outbox events claimed per tick. |
| `OUTBOX_WORKER_LOCK_SECONDS` | `60` | Claim lease duration before another outbox worker may reclaim stale work. |
| `OUTBOX_WORKER_MAX_BACKOFF_SECONDS` | `300` | Maximum retry backoff delay for retryable outbox failures. |
| `OUTBOX_WORKER_POLL_SECONDS` | `30` | Sleep interval between polling ticks. |

## Adapter configuration

Local development uses key-free infrastructure adapters. Receipt workflows use
the storage adapter contract, and notification delivery uses the email adapter
contract.

Storage settings:

| Variable | Default | Description |
|---|---:|---|
| `STORAGE_BACKEND` | `local` | Storage adapter backend. Only local filesystem storage is implemented in this phase. |
| `LOCAL_STORAGE_ROOT` | `.local/storage` | Local filesystem root for stored objects and metadata sidecars. This path is ignored by Git. |

Email settings:

| Variable | Default | Description |
|---|---:|---|
| `EMAIL_BACKEND` | `console` | Email adapter backend. `console` logs deliveries; `local` also keeps an in-memory copy for local tests. |
| `EMAIL_FROM_ADDRESS` | `no-reply@localhost` | Sender address used by local email adapters. |

Production storage and email providers should be added behind the same adapter
contracts in `app.adapters.storage` and `app.adapters.email`. The notification
email worker uses `EMAIL_BACKEND=console|local` until a real provider backend is
selected. Provider API keys, SMTP credentials, bucket names, and endpoint URLs
should stay optional until then and should be represented only as environment
variables, never committed secrets.

The committed `.env.example` intentionally omits production provider variables
until a concrete storage or email provider adapter is selected. Local
development and tests should continue to run with `STORAGE_BACKEND=local` and
`EMAIL_BACKEND=console|local` and no external API keys.

## Health and observability

Use `GET /api/v1/health/live` to confirm the API process is running and
`GET /api/v1/health/ready` to confirm it can reach PostgreSQL.

Workers do not expose an HTTP health endpoint. They run as separate processes
and report observable progress through structured log events:

- `recurring_worker_tick` includes `worker_id`, `claimed`, `created`, and
  `skipped`.
- `recurring_worker_once_complete` includes `claimed`, `created`, and `skipped`.
- `outbox_worker_tick` includes `worker_id`, `claimed`, `processed`,
  `retried`, and `failed`.

Operational recovery should inspect `recurring_rules.locked_until` and
`outbox_events.locked_until` for stale claims, and inspect failed outbox rows by
`event_type`, `idempotency_key`, `attempts`, `max_attempts`, `error_type`, and
`error_message` before manually requeueing.
