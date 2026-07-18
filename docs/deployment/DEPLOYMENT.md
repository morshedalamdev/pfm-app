# Production Deployment

This document records the production deployment topology and environment setup
for the implemented FastAPI, worker, PostgreSQL, and Next.js application.

The selected database and backend providers are Neon and Render. Follow
[`RENDER_NEON.md`](./RENDER_NEON.md) for the concrete deployment procedure.
Storage and email providers remain unselected.

## Topology

Run these services as separate production units:

| Service | Responsibility | Notes |
|---|---|---|
| Frontend | Serves the Next.js application. | Set the server-only `SERVER_API_BASE_URL` to the public API origin. The known live frontend domain is `https://pfm.morshedalam.dev`. |
| API | Serves the FastAPI app under `/api/v1`. | Run `uvicorn app.main:app --host 0.0.0.0 --port 8000` behind TLS termination. |
| Worker | Runs durable scheduled work outside request handlers. | Start with `python -m app.workers.recurring`. Keep it on the same release image and database as the API. |
| PostgreSQL | System of record for users, finance records, sessions, receipts metadata, notifications, recurring rules, and outbox rows. | Use managed PostgreSQL or an equivalent production service with backups and restore testing. |
| Storage provider | Stores receipt bytes outside PostgreSQL. | Only `STORAGE_BACKEND=local` is implemented today. In production this requires durable mounted storage, or a future object-storage adapter when a provider is selected. |
| Email provider | Sends notification email side effects. | Only `EMAIL_BACKEND=console` and `EMAIL_BACKEND=local` are implemented today. SMTP or transactional-email variables stay deferred until a provider adapter exists. |
| TLS termination | Terminates HTTPS and forwards to frontend/API services. | Use the hosting edge, load balancer, or reverse proxy. Production browser traffic should use HTTPS only. |
| Log collection | Collects stdout/stderr and platform logs. | Collect API logs, worker logs, frontend logs, TLS/proxy logs, PostgreSQL service events, and migration task output. |

Do not add Redis for this topology. Current coordination uses PostgreSQL row
locks, idempotency records, and durable outbox rows.

## Environment Checklist

Provide values through the deployment platform secret/configuration store. Do
not commit production values, `.env` files, database dumps, uploaded receipts,
or generated secret files.

Backend API and worker:

- `APP_NAME`
- `APP_ENV=production`
- `DEBUG=false`
- `API_V1_PREFIX`
- `CORS_ORIGINS`
- `DATABASE_URL`
- `MIGRATION_DATABASE_URL`
- `DATABASE_ECHO=false`
- `DATABASE_POOL_SIZE`
- `DATABASE_MAX_OVERFLOW`
- `ACCESS_TOKEN_SECRET_KEY`
- `ACCESS_TOKEN_ALGORITHM`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `REFRESH_TOKEN_SECRET_KEY`
- `REFRESH_TOKEN_EXPIRE_DAYS`
- `RECURRING_WORKER_BATCH_SIZE`
- `RECURRING_WORKER_LOCK_SECONDS`
- `RECURRING_WORKER_POLL_SECONDS`
- `OUTBOX_WORKER_BATCH_SIZE`
- `OUTBOX_WORKER_LOCK_SECONDS`
- `OUTBOX_WORKER_MAX_BACKOFF_SECONDS`
- `OUTBOX_WORKER_POLL_SECONDS`
- `STORAGE_BACKEND`
- `LOCAL_STORAGE_ROOT`
- `EMAIL_BACKEND`
- `EMAIL_FROM_ADDRESS`
- `RECEIPT_MAX_UPLOAD_BYTES`
- `RECEIPT_ALLOWED_CONTENT_TYPES`
- `PORT`
- `RUN_MIGRATIONS`
- `FRONTEND_BASE_URL`
- `OAUTH_PUBLIC_API_URL`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GITHUB_OAUTH_CLIENT_ID`
- `GITHUB_OAUTH_CLIENT_SECRET`
- `OAUTH_STATE_SECRET_KEY`
- `OAUTH_REGISTRATION_TICKET_SECRET_KEY`
- `OAUTH_REGISTRATION_TICKET_EXPIRE_MINUTES`
- `OAUTH_LOGIN_EXCHANGE_EXPIRE_SECONDS`

Frontend:

- `SERVER_API_BASE_URL`

`SERVER_API_BASE_URL` is intentionally not a `NEXT_PUBLIC_` variable. The
mobile Next.js application calls FastAPI only from its server routes so backend
topology does not need to be embedded in browser JavaScript.

Provider variables intentionally deferred until provider adapters are selected:

- Object storage bucket, region, endpoint, access key, and secret key.
- SMTP host, port, username, password, TLS mode, and sender address.
- Transactional email API key, provider account id, and sender address.

## CORS and Cookies

Production `CORS_ORIGINS` must be an explicit JSON array of browser origins.
For the current live frontend, include `https://pfm.morshedalam.dev` when that
frontend is connected to the production API. Add the final API/frontend origins
only after the concrete API domain is selected. Do not use wildcard CORS with
credentials.

The current refresh-token transport is JSON request/response body storage from
the frontend integration milestone, not cookies. If cookie transport is added
later, require HTTPS-only cookies with `Secure`, `HttpOnly`, reviewed
`SameSite`, and narrowly scoped domain/path settings that match the final
frontend and API domains.

## Migration Procedure

Run database migration work as a one-off release task using the same backend
image or code revision that will run the API and worker.

1. Confirm the release image and commit are the intended production version.
2. Confirm the PostgreSQL backup or point-in-time recovery window is current.
3. Stop or pause the worker before a schema-changing migration when duplicate
   scheduled writes or outbox side effects could complicate rollback.
4. Run `alembic upgrade head` with the production `DATABASE_URL`.
5. Start or update the API service.
6. Start or update the worker with `python -m app.workers.recurring`.
7. Verify API liveness and readiness probes.
8. Watch API, worker, migration, PostgreSQL, and proxy logs after release.

Never run destructive migration experiments against the production database.
Test upgrade/downgrade/upgrade behavior against a disposable database before
including a destructive migration in a release.

## Health Probes

API probes:

- Liveness: `GET /api/v1/health/live`
- Readiness: `GET /api/v1/health/ready`

Use readiness for load-balancer traffic admission because it verifies
PostgreSQL connectivity. Use liveness for process restart decisions.

Worker probes:

- The worker has no HTTP health endpoint.
- Monitor process status, restart count, and structured log events such as
  `recurring_worker_tick`, `recurring_worker_once_complete`, and
  `outbox_worker_tick`.
- Alert on stale `recurring_rules.locked_until`, stale
  `outbox_events.locked_until`, rising failed outbox rows, or no worker ticks
  within the expected poll interval.

Frontend probes:

- Probe the public frontend origin over HTTPS.
- Include a route-level smoke check for the dashboard shell after deployment.

## Rollback and Recovery

Prefer backward-compatible migrations so application rollback can happen
without database rollback. Before rolling back code, decide whether the new
schema remains compatible with the old API and worker.

Rollback considerations:

- Stop or pause the worker before rollback if scheduled writes or outbox
  side effects might continue against the wrong code version.
- Do not run Alembic downgrade in production unless the downgrade path has been
  tested against representative data and the data loss risk is accepted.
- If a migration caused data damage or incompatible schema state, restore from
  backup or point-in-time recovery rather than guessing at manual repairs.
- Record the migration revision, release image, commit SHA, backup timestamp,
  and operator actions in the incident notes.

Database backups are mandatory for production. Use automated backups with a
documented retention period, point-in-time recovery when available, and periodic
restore tests. If local receipt storage is used in production, the storage path
must be durable, backed up, and restored consistently with database receipt
metadata. If an object-storage adapter is later selected, document bucket
versioning, lifecycle, encryption, and restore behavior with that provider.

## Receipt Storage Behavior

Receipt metadata lives in PostgreSQL, while receipt bytes are stored through the
configured storage adapter. With the current local storage backend, production
must mount `LOCAL_STORAGE_ROOT` on durable storage that survives API and worker
container replacement. Do not store receipt bytes inside ephemeral container
filesystems.

When storage cleanup fails after a receipt soft delete, the API keeps the
database delete result and logs the cleanup failure for operational follow-up.
Storage and database backup policies should account for this possible orphaned
object cleanup path.

## Provider-Specific Files

The Neon and Render settings are documented in
[`RENDER_NEON.md`](./RENDER_NEON.md). The repository-root `render.yaml`
Blueprint builds `server/Dockerfile` without storing secret values. Production
object storage and email delivery still require provider decisions.
