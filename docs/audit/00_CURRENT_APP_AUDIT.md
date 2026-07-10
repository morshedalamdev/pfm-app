# Current App Audit

## Repository Structure

- Root files include `README.md`, `PFM_PROJECT_STATE.md`, `AGENT.md`, `compose.yml`, `render.yaml`, `.gitignore`, and `.gitattributes`.
- `client/` contains the frontend application, generated OpenAPI types, UI components, hooks, API helpers, auth store, Playwright E2E files, static assets, and existing runtime output folders such as `.next/` and `node_modules/`.
- `server/` contains the FastAPI backend, Alembic migrations, tests, scripts, Dockerfile, local virtual environment folder, and Python cache/test cache folders.
- `docs/` contains architecture, development, deployment, and release documentation. This audit adds `docs/audit/`.
- No root `package.json` is present.
- No `server/package.json` is present.
- No `server/requirements.txt` is present; backend dependencies are declared in `server/pyproject.toml`.

## Frontend Stack

- The frontend is a Next.js App Router app under `client/app`.
- `client/package.json` uses Next `16.1.1`, React `19.2.3`, TypeScript `^5`, Tailwind CSS `^4.1.18`, Radix UI primitives, Recharts, Axios, Zod, Lucide React, and Zustand.
- OpenAPI-generated types live in `client/generated/api-types.ts`.
- API helpers exist under `client/lib/api/`, `client/lib/finance/`, `client/lib/analytics/`, and `client/lib/dashboard/`.
- Axios is used through `client/lib/api/client.ts`.
- Runtime API base URL resolution uses `window.__PFM_RUNTIME_CONFIG__` and `NEXT_PUBLIC_API_BASE_URL`.
- Zustand is actively used for auth/session state in `client/lib/auth/store.ts`.
- Browser `localStorage` is actively used only for auth token persistence in `client/lib/auth/tokenStorage.ts` and E2E auth assertions.
- No repository-owned production mock data module was found in `client/app`, `client/components`, or `client/lib`. Existing docs record that older runtime finance fixtures were removed in previous phases.
- `client/package.json` still contains stale metadata keywords `api`, `express`, and `typescript`; this is package metadata only and no Node/Express backend code was found.

## Backend Stack

- The backend is a Python FastAPI modular monolith under `server/app`.
- Backend dependencies are managed by `server/pyproject.toml`.
- PostgreSQL is the persistence target through SQLAlchemy asyncio and asyncpg.
- Alembic migrations live in `server/alembic/versions`.
- Backend modules currently include accounts, auth, budgets, categories, idempotency, loans, notifications, outbox, receipts, recurring, reports, savings, transactions, and users.
- Backend tests exist under `server/tests`.
- No Node, NestJS, or Express backend package or runtime files were found under `server/`.

## Available Scripts

- Root: no `package.json`, so no root npm scripts.
- Client scripts from `client/package.json`:
  - `npm run dev`: starts Next dev server.
  - `npm run build`: runs `next build`.
  - `npm run start`: runs `next start`.
  - `npm run api:schema`: exports FastAPI OpenAPI JSON into `client/generated/openapi.json`.
  - `npm run api:types`: regenerates TypeScript API types from `client/generated/openapi.json`.
  - `npm run api:generate`: runs schema export and type generation.
  - `npm run api:check`: checks generated API contract drift.
  - `npm run e2e`: runs the local full-stack Playwright E2E script.
- Client package has no `lint` script.
- Client package has no unit `test` script.
- Server scripts are Python tool commands documented in `README.md`, `server/README.md`, and `docs/development/CI.md`:
  - `ruff check .`
  - `ruff format --check .`
  - `mypy app`
  - `pytest -q`
  - `alembic upgrade head`
  - `uvicorn app.main:app --reload`
  - `python -m app.workers.recurring`
- Server package has no npm scripts.

## Environment Files

- Root `.env`: not present.
- Root `.env.example`: not present.
- `client/.env.local`: present and ignored local environment file.
- `client/.env.example`: present template.
- `server/.env`: present and ignored local environment file.
- `server/.env.example`: present template.
- No values from local `.env` files were read or copied into this audit.

## Initial Observations

- The repository currently uses a Next.js frontend and a FastAPI backend.
- The current backend is Python/FastAPI, not Node/Nest/Express.
- Node/Express remnants appear limited to stale frontend package metadata keywords.
- The frontend has a typed API client and generated OpenAPI contract artifacts.
- Zustand is used for auth state, not as a broad finance-domain store in this phase 00.1 inventory.
- Persistent browser storage found in production frontend code is limited to auth token storage.
- Backend tests are present and should be run for the baseline.
- Frontend build is the required client baseline check for this phase.
- Client lint and unit test scripts are missing and should be recorded as unavailable rather than invented.

## Baseline Check Results

- `cd client && npm install`: passed; dependencies were already up to date.
- `cd client && npm run build`: passed after approved rerun. The sandboxed run failed because Next.js could not fetch the configured Google-hosted Urbanist font.
- `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q`: passed after approved rerun with `167 passed, 1 warning`. The sandboxed run failed because the disposable PostgreSQL fixture could not bind `127.0.0.1`.
- `cd client && npm run api:check`: passed; generated API contract is up to date.
- `cd client && npm run lint`: not run because no lint script exists.
- `cd client && npm run test`: not run because no unit test script exists.
- No baseline code bugs required repair in phase 00.1.
