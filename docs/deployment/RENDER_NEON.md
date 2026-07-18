# Deploy the Backend to Render with Neon

This runbook deploys the FastAPI backend to the existing Render origin
`https://pfm-app-obn3.onrender.com` and uses Neon as the PostgreSQL system of
record. The production Next.js frontend is built from `client/` and deployed as
a second Render Web Service.

## 1. Confirm the Render service target

The repository-root [`render.yaml`](../../render.yaml) defines `pfm-api` and
`pfm-web`. Before applying the Blueprint to existing Render services, confirm
that their dashboard names match. Blueprint service names are resource
identifiers: a different name can create another service instead of updating
the existing one.

The Blueprint deploys `main`. Merge the reviewed release into `main` before
deploying. It uses the paid `starter` instance because Render documents Free
instances as preview/hobby infrastructure rather than production infrastructure.
Changing or applying this plan can start billing, so review the Render price in
the dashboard before applying it.

## 2. Configure Neon

Rotate any database password that has appeared in chat, logs, shell history, or
another non-secret channel.

In the Neon **Connect** dialog, collect both connection strings:

- **Pooled URL** (hostname contains `-pooler`) for `DATABASE_URL`.
- **Direct URL** (hostname does not contain `-pooler`) for
  `MIGRATION_DATABASE_URL`.

The application accepts standard Neon `postgresql://` strings and normalizes
them for SQLAlchemy's asyncpg driver. It converts `sslmode=require` to
asyncpg's `ssl=require` and removes the libpq-only `channel_binding` option.

Do not commit either URL.

## 3. Configure production OAuth

Create or verify the provider applications in
[`OAUTH_SETUP.md`](./OAUTH_SETUP.md). Their production callbacks must exactly
match:

```text
https://pfm-app-obn3.onrender.com/api/v1/auth/oauth/google/callback
https://pfm-app-obn3.onrender.com/api/v1/auth/oauth/github/callback
```

Set these secret values in Render before deploying:

```text
DATABASE_URL
MIGRATION_DATABASE_URL
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GITHUB_OAUTH_CLIENT_ID
GITHUB_OAUTH_CLIENT_SECRET
```

The Blueprint generates the four independent application secrets for access
tokens, refresh tokens, OAuth state, and OAuth registration tickets. Never
copy development secrets into production.

Important: `sync: false` values are prompted for only when a Blueprint first
creates a service. Render ignores them on later Blueprint updates, so add or
rotate those six values manually in an existing service's Environment page.

## 4. Apply the Blueprint

For a new service:

1. Select **New > Blueprint** in the Render Dashboard.
2. Connect the repository.
3. Select branch `main` and the repository-root `render.yaml`.
4. Enter every prompted secret from sections 2 and 3.
5. Review that the service plan is `starter`, then apply the Blueprint.

For the existing service, synchronize its Blueprint from the dashboard only
after confirming the service name and manually setting every secret above.

The paid service runs `alembic upgrade head` as a pre-deploy command. A failed
migration prevents the new release from replacing the last healthy release.
The application container starts with `RUN_MIGRATIONS=false`, so migrations are
not repeated during restarts or horizontal scaling.

## 5. Connect the frontend

The `pfm-web` service receives this server-only environment value from the
Blueprint:

```dotenv
SERVER_API_BASE_URL=https://pfm-app-obn3.onrender.com
```

Do not use `NEXT_PUBLIC_API_BASE_URL`. `SERVER_API_BASE_URL` is intentionally
server-only because the mobile application proxies authentication and API calls
through its own Next.js routes.

Attach `pfm.morshedalam.dev` as the custom domain of `pfm-web`. The API allows
`https://pfm.morshedalam.dev` in `CORS_ORIGINS`. Add any other real frontend
origin explicitly. Never use a wildcard with credentialed requests.

## 6. Post-deploy verification

Run these checks after Render reports a healthy deploy:

```bash
curl --fail-with-body https://pfm-app-obn3.onrender.com/api/v1/health/live
curl --fail-with-body https://pfm-app-obn3.onrender.com/api/v1/health/ready
curl --head https://pfm-app-obn3.onrender.com/api/v1/auth/oauth/google/start
curl --head https://pfm-app-obn3.onrender.com/api/v1/auth/oauth/github/start
```

Expected results:

- Both health endpoints return `200`.
- Each OAuth start endpoint returns a redirect to the correct provider, not
  `503 OAuth provider is not configured`.
- Completing Google and GitHub sign-in returns to
  `https://pfm.morshedalam.dev/` and creates a mobile session.
- Email routing sends an existing user to `/auth/login` and a new email to
  `/auth/register`.

## Known production limitations

- `STORAGE_BACKEND=local` writes receipt bytes to Render's ephemeral filesystem.
  Receipt uploads are not durable until an object-storage adapter is implemented
  (or a paid persistent disk is mounted at a non-`/tmp` path).
- The Blueprint does not deploy the recurring transaction worker. Recurring
  rules remain stored but do not create transactions automatically.
- `EMAIL_BACKEND=console` writes email payloads to logs and does not deliver
  email.

These limitations do not affect account registration, password login, Google
OAuth, or GitHub OAuth, but their related features should not be advertised as
production-ready.

## Optional paid worker

Add one Render Background Worker using the same image and environment values:

```text
Docker command: python -m app.workers.recurring
RUN_MIGRATIONS=false
```

Verify its logs contain `recurring_worker_tick`.

## Rollback

Roll back application code only when the previous release is compatible with
the current schema. Do not run `alembic downgrade` against production without a
tested downgrade and an accepted data-loss plan. Use Neon's backup or
point-in-time recovery features for database recovery.
