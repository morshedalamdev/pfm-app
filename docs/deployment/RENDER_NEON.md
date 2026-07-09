# Deploy the Backend to Render with Neon

This runbook deploys the FastAPI backend as a free Render Web Service and uses
Neon as the PostgreSQL system of record. The Next.js frontend remains a
separate deployment.

## 1. Rotate and collect Neon URLs

Rotate any database password that has been pasted into chat, logs, shell
history, or another non-secret channel before deployment.

In the Neon **Connect** dialog, collect both connection strings:

- **Pooled URL** (hostname contains `-pooler`) for `DATABASE_URL`.
- **Direct URL** (hostname does not contain `-pooler`) for
  `MIGRATION_DATABASE_URL`.

The application accepts standard Neon `postgresql://` strings and normalizes
them for SQLAlchemy's asyncpg driver. It converts `sslmode=require` to
asyncpg's `ssl=require` and removes the libpq-only `channel_binding` option.

Do not commit either URL. Render prompts for them as secret Blueprint values.

## 2. Create the Render service

The repository-root [`render.yaml`](../../render.yaml) defines one free Web
Service:

- Docker build context: `server`
- Dockerfile: `server/Dockerfile`
- Region: Singapore, matching the supplied Neon region
- Health check: `/api/v1/health/ready`
- Automatic deploy: only after GitHub checks pass
- Startup migration: enabled for the single free instance

In the Render Dashboard:

1. Select **New > Blueprint**.
2. Connect `morshedalamdev/pfm-app`.
3. Select branch `main` and the repository-root `render.yaml`.
4. Enter the two prompted Neon connection strings.
5. Apply the Blueprint.

Render generates independent access-token and refresh-token secrets. The
Blueprint contains no production credential values.

## 3. Why migrations run at startup

Render's pre-deploy command is unavailable for free Web Services. The container
therefore runs `alembic upgrade head` before Uvicorn when
`RUN_MIGRATIONS=true`.

This is safe for the Blueprint's single free instance and Alembic upgrades are
idempotent at the current head. Before scaling beyond one instance, move
migrations to Render's paid pre-deploy command and set
`RUN_MIGRATIONS=false`.

Alembic uses the direct Neon URL. Normal API traffic uses the pooled Neon URL.

## 4. Verify the deployment

After Render reports a successful deploy, verify:

```bash
curl --fail-with-body https://YOUR-SERVICE.onrender.com/api/v1/health/live
curl --fail-with-body https://YOUR-SERVICE.onrender.com/api/v1/health/ready
```

The first endpoint proves the API process is alive. The second proves the
migrated Neon database is reachable.

## 5. Connect the frontend

Set the frontend production environment value to the Render API origin and
redeploy the frontend:

```dotenv
NEXT_PUBLIC_API_BASE_URL=https://YOUR-SERVICE.onrender.com
```

The Blueprint allows `https://pfm.morshedalam.dev`. If a Vercel-generated
production domain also serves the application, add that exact HTTPS origin to
`CORS_ORIGINS` in Render. Do not add a placeholder or wildcard.

## Free-tier limitations

- Render spins down a free Web Service after 15 minutes without inbound
  traffic. The next request can take about a minute while it starts.
- Free Render services have an ephemeral filesystem. Receipt bytes under
  `/tmp/pfm-storage` can disappear on restart, redeploy, or spin-down, although
  receipt metadata remains in Neon. Do not rely on production receipt uploads
  until durable storage or an object-storage adapter is added.
- Render background workers do not offer a free instance type. The recurring
  transaction worker is therefore intentionally not deployed by this
  Blueprint. Recurring rules remain stored but will not create transactions
  automatically.
- `EMAIL_BACKEND=console` writes email payloads to logs and does not deliver
  email.

## Optional paid worker

If a paid worker is acceptable later, add a Render Background Worker using the
same Docker context and environment values, with:

```text
Docker command: python -m app.workers.recurring
RUN_MIGRATIONS=false
```

Run exactly one worker instance and verify its logs contain
`recurring_worker_tick`.

## Rollback

Roll back application code through Render only when the previous release is
compatible with the current schema. Do not run `alembic downgrade` against
production without a tested downgrade and an accepted data-loss plan. Use
Neon's backup or point-in-time recovery features for database recovery.
