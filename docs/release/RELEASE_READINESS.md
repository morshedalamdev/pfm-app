# Release Readiness

Date: 2026-07-03

Status: ready with documented external configuration.

## Implemented Scope

- FastAPI modular monolith under `/api/v1` with PostgreSQL persistence, SQLAlchemy async sessions, Alembic migrations, typed settings, OpenAPI export, and generated TypeScript API contracts.
- Authentication with email/password registration, Argon2 password hashing, short-lived access JWTs, rotated refresh sessions, logout, and authenticated current-user profile updates.
- Finance source records for accounts, default account/category bootstrapping, categories, income, expense, transfers, idempotent create paths, transaction filters, budgets, savings goals, dashboard reports, analytics reports, recurring rules, durable outbox, receipts metadata/storage adapter, notifications, email adapter, and notification SSE.
- Next.js frontend integrated with authenticated API data for dashboard, transactions, budgets, savings, analytics, profile, and settings base-currency selection while preserving the existing route/design shape.
- Dockerfiles and Compose topology for local PostgreSQL, API, recurring worker, and frontend smoke testing.

## Environment Requirements

- Python 3.12 or compatible project runtime, Node.js 24, npm, PostgreSQL, Docker, and Docker Compose for local full-stack verification.
- Backend API and worker require `DATABASE_URL`, `ACCESS_TOKEN_SECRET_KEY`, `REFRESH_TOKEN_SECRET_KEY`, `CORS_ORIGINS`, worker tuning variables, receipt limits, and storage/email adapter variables from `server/.env.example` and `docs/deployment/DEPLOYMENT.md`.
- Frontend requires `NEXT_PUBLIC_API_BASE_URL` pointing at the public API origin.
- Production secrets must be provided by the deployment environment. Do not commit `.env` files, database dumps, uploaded receipts, generated secrets, or production credentials.

## Migrations

- Current Alembic head: `202607031004_add_user_base_currency.py`.
- Run `cd server && alembic upgrade head` with the production `DATABASE_URL` before starting the released API and worker.
- Final verification applied all migrations to head against a disposable PostgreSQL database, the E2E harness database, and the Compose smoke database.
- The default local `pfm_app` database on this machine rejected the configured password; use a valid local `DATABASE_URL`, disposable database, or Compose database for migration commands.

## Test Results

| Command | Result |
|---|---|
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check .` | PASS |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check .` | PASS, 147 files already formatted |
| `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app` | PASS, no issues in 103 source files |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q` | PASS with localhost approval, 147 passed, 1 warning |
| `cd server && PATH="$PWD/.venv/bin:$PATH" alembic upgrade head` | FAIL with local `pfm_app` credential rejection |
| `cd server && DATABASE_URL=<disposable PostgreSQL URL> PATH="$PWD/.venv/bin:$PATH" alembic upgrade head` | PASS |
| `cd client && npm run build` | PASS with network approval for Google Fonts |
| `cd client && npm run lint --if-present` | PASS / no-op, no script defined |
| `cd client && npm run test --if-present` | PASS / no-op, no script defined |
| `cd client && npx tsc --noEmit` | PASS |
| `cd client && npm run api:check` | PASS |
| `cd client && npm run e2e` | PASS with localhost approval, 1 Playwright test passed |
| `docker compose config` | PASS |
| `POSTGRES_PORT=55432 API_PORT=58000 FRONTEND_PORT=53000 NEXT_PUBLIC_API_BASE_URL=http://localhost:58000 docker compose up -d --build` | PASS |
| `POSTGRES_PORT=55432 API_PORT=58000 FRONTEND_PORT=53000 NEXT_PUBLIC_API_BASE_URL=http://localhost:58000 docker compose run --rm api alembic upgrade head` | PASS |
| `curl -fsS http://127.0.0.1:58000/api/v1/health/live` | PASS |
| `curl -fsS http://127.0.0.1:58000/api/v1/health/ready` | PASS |
| `curl -fsS -o /tmp/pfm-frontend-smoke.html -w "%{http_code}" http://127.0.0.1:53000` | PASS, HTTP 200 |
| `POSTGRES_PORT=55432 API_PORT=58000 FRONTEND_PORT=53000 NEXT_PUBLIC_API_BASE_URL=http://localhost:58000 docker compose logs --tail=40 worker` | PASS, worker tick logs present |
| `POSTGRES_PORT=55432 API_PORT=58000 FRONTEND_PORT=53000 NEXT_PUBLIC_API_BASE_URL=http://localhost:58000 docker compose down` | PASS |
| `test -f docs/release/RELEASE_READINESS.md` | PASS |

## Provider Decisions Still Needed

- Production hosting provider, image registry, API domain, TLS termination, and final CORS origin list.
- Managed PostgreSQL service, backup retention, point-in-time recovery, and restore-test schedule.
- Durable receipt storage choice. Current implementation supports `STORAGE_BACKEND=local`; production local storage requires durable mounted storage, or a future object-storage adapter.
- Email delivery provider. Current implementation supports `EMAIL_BACKEND=console` and `EMAIL_BACKEND=local`; SMTP or transactional-email provider adapters remain deferred.
- Production secrets for token signing, database access, storage, and email must be generated and stored outside the repository.

## Known Limitations

- MVP supports one persisted user base currency and does not convert existing records between currencies.
- Refresh token transport is JSON request/response body storage, not secure cookie transport.
- Loan/debt routes intentionally show unavailable states because no backend loan endpoints exist yet.
- Frontend `lint` and `test` npm scripts are not defined; `--if-present` checks are no-ops. `npx tsc --noEmit` passed, while Next build still skips built-in type validation by configuration.
- Production builds require access to Google Fonts unless the app is later changed to use local font assets.
- Redis, bank aggregation, payments, investments, AI features, organizations, mobile apps, and GraphQL are not part of the implemented MVP scope.

## Deployment Steps

1. Provision PostgreSQL and confirm backups/PITR.
2. Generate production secrets and configure API, worker, and frontend environment variables.
3. Build and publish the API, worker, and frontend images from the verified commit.
4. Stop or pause the worker for schema-changing releases.
5. Run `alembic upgrade head` using the production `DATABASE_URL`.
6. Deploy/update the API, then the frontend, then the worker.
7. Verify `GET /api/v1/health/live`, `GET /api/v1/health/ready`, frontend reachability, login/profile smoke, and worker logs.
8. Monitor API, worker, frontend, database, migration, proxy, storage, and email logs after release.

## Rollback Notes

- Prefer application rollback without database downgrade when migrations are backward compatible.
- Stop or pause the worker before rollback if scheduled writes or outbox side effects could continue against the wrong code version.
- Do not run Alembic downgrade in production unless the downgrade path has been tested and data-loss risk is accepted.
- Restore from database backup or PITR if a migration causes data damage or incompatible schema state.
