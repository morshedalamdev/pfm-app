# PFM_PROJECT_STATE.md — Persistent Project Memory

> Every Codex phase must read this file before inspecting or modifying code. Update this file after each completed phase. Preserve historical entries.

## 1. Project identity

- Repository: `https://github.com/morshedalamdev/pfm-app`
- Live frontend: `https://pfm.morshedalam.dev`
- Product: personal finance tracker for income, expenses, transfers, savings, budgets, reports, recurring transactions, receipts, notifications, and loans/debts.
- Goal: replace the existing Node backend scaffold with Python FastAPI, preserve the completed Next.js UI, then connect the UI to responsive PostgreSQL-backed server data.
- Execution strategy: one milestone branch at a time; one narrowly scoped Codex execution per phase; explicit user permission before the next phase.

## 2. Repository observations verified in milestone 00

- Phase 00.1 verified that the local clone currently has `client/` but no `server/` directory. There is no backend scaffold or backend behavior to preserve in code.
- The frontend source is a Next.js App Router application with placeholder finance values and local component state.
- The client package uses Next.js 16.1.1, TypeScript, React 19, Tailwind CSS 4, Zod, Axios, date-fns, Lucide React, Recharts, and Radix-style UI dependencies.
- `client/package.json` metadata still has stale `express` / `typescript` keywords even though the current package is frontend-only.
- Root `README.md` currently documents the phased Codex milestone pack rather than normal application setup or runtime documentation.
- No committed `.env.example`, Docker, Compose, Vercel, CI, Python, Alembic, or backend test configuration exists yet.
- PostgreSQL availability in the user's terminal environment was not exercised in phase 00.1 because no backend or migration commands exist yet.

## 3. Locked architecture decisions

Only change a locked decision after recording the reason in the Architecture Decision Log.

| Area | Locked decision | Reason |
|---|---|---|
| Backend shape | FastAPI modular monolith | Suitable for one product, one team, and incremental learning without premature distributed-system complexity. |
| API style | Versioned REST under `/api/v1` | Appropriate for CRUD, reports, filtering, generated documentation, and frontend integration. |
| API contract | FastAPI OpenAPI schema generates TypeScript types or SDK | Prevents frontend/backend contract drift. |
| Database | PostgreSQL | Appropriate for transactional finance data, constraints, and analytics queries. |
| ORM | SQLAlchemy 2 async | Explicit production-oriented Python data access. |
| Migrations | Alembic | Reviewable and reproducible schema evolution. |
| Configuration | `pydantic-settings`, environment variables, committed `.env.example` only | Typed configuration without committed secrets. |
| Money | PostgreSQL `NUMERIC`, Python `Decimal` | Prevents floating-point rounding defects. |
| Auth | Email/password, Argon2, short-lived JWT access tokens, rotated refresh sessions | Secure local default without requiring a third-party identity provider. |
| Modules | Domain-oriented modules under `server/app/modules/` | Maintainable modular monolith. |
| Background work | Separate worker with PostgreSQL-backed coordination and idempotency | Keeps durable scheduled work out of requests without requiring Redis initially. |
| Real-time | SSE only for one-way notifications and refresh hints | Browser-native server push is enough for current requirements. |
| Uploads | Storage adapter with local implementation first | Development must not block on cloud credentials. |
| Email | Email adapter with console/local implementation first | Development must not block on SMTP credentials. |
| Frontend | Preserve the current UI; introduce a dedicated typed API layer | Replace fixtures without redesign. |

## 4. Proposed backend layout

Milestone 01 may refine file names while preserving separation of concerns.

```text
server/
├── pyproject.toml
├── alembic.ini
├── .env.example
├── app/
│   ├── main.py
│   ├── api/v1/router.py
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── errors.py
│   │   ├── logging.py
│   │   └── security.py
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── accounts/
│   │   ├── categories/
│   │   ├── transactions/
│   │   ├── budgets/
│   │   ├── savings/
│   │   ├── loans/
│   │   ├── reports/
│   │   ├── recurring/
│   │   ├── notifications/
│   │   └── receipts/
│   └── workers/
├── tests/
└── alembic/
```

## 5. Phase status tracker

Use one of: `NOT_STARTED`, `IN_PROGRESS`, `PASSED`, `BLOCKED`.

| Milestone | Phase | Status | Local commit | Notes |
|---|---|---|---|---|
| 00 | 00.1 Repository audit | PASSED | `3bc4b31` | Verified local repository inventory, missing server directory, frontend baseline checks, and stale documentation findings. |
| 00 | 00.2 Frontend requirements map | PASSED | `66aea05` | Mapped every implemented UI surface, fixture path, data requirement, mutation, validation need, and missing loading/empty/error state. |
| 00 | 00.3 Architecture baseline | PASSED | `82d88b9` | Completed FastAPI system design additions for entity map, API conventions, transaction flow, SSE flow, pagination, error envelope, UTC timestamps, and OpenAPI client generation. |
| 00 | 00.4 Discovery verification | PASSED | phase commit created after this state update | Verified milestone 00 documents, fixture mapping, server replacement boundary, baseline frontend checks, and next phase gate. |
| 01 | 01.1 Python server scaffold | PASSED | phase commit created after this state update | Created FastAPI Python project scaffold under new `server/`; no stale server files existed to remove. |
| 01 | 01.2 FastAPI app configuration | NOT_STARTED | — | — |
| 01 | 01.3 PostgreSQL persistence | NOT_STARTED | — | — |
| 01 | 01.4 Alembic and health checks | NOT_STARTED | — | — |
| 01 | 01.V Foundation verification | NOT_STARTED | — | — |
| 02 | 02.1 User and session models | NOT_STARTED | — | — |
| 02 | 02.2 Registration and hashing | NOT_STARTED | — | — |
| 02 | 02.3 Login and access token | NOT_STARTED | — | — |
| 02 | 02.4 Refresh rotation and logout | NOT_STARTED | — | — |
| 02 | 02.5 Auth edge-case tests | NOT_STARTED | — | — |
| 02 | 02.V Auth verification | NOT_STARTED | — | — |
| 03 | 03.1 Finance domain schema | NOT_STARTED | — | — |
| 03 | 03.2 Accounts and categories | NOT_STARTED | — | — |
| 03 | 03.3 Income and expenses | NOT_STARTED | — | — |
| 03 | 03.4 Transfers and atomicity | NOT_STARTED | — | — |
| 03 | 03.5 Filters, pagination, idempotency | NOT_STARTED | — | — |
| 03 | 03.6 Finance tests | NOT_STARTED | — | — |
| 03 | 03.V Finance verification | NOT_STARTED | — | — |
| 04 | 04.1 Budget schema and rules | NOT_STARTED | — | — |
| 04 | 04.2 Budget APIs and progress | NOT_STARTED | — | — |
| 04 | 04.3 Savings goals and contributions | NOT_STARTED | — | — |
| 04 | 04.4 Budget and savings tests | NOT_STARTED | — | — |
| 04 | 04.V Budget and savings verification | NOT_STARTED | — | — |
| 05 | 05.1 Report contracts | NOT_STARTED | — | — |
| 05 | 05.2 Dashboard summaries | NOT_STARTED | — | — |
| 05 | 05.3 Trends and breakdowns | NOT_STARTED | — | — |
| 05 | 05.4 Query performance | NOT_STARTED | — | — |
| 05 | 05.5 Analytics tests | NOT_STARTED | — | — |
| 05 | 05.V Analytics verification | NOT_STARTED | — | — |
| 06 | 06.1 Recurring and outbox schema | NOT_STARTED | — | — |
| 06 | 06.2 Scheduling rules | NOT_STARTED | — | — |
| 06 | 06.3 Worker process | NOT_STARTED | — | — |
| 06 | 06.4 Retry and idempotency | NOT_STARTED | — | — |
| 06 | 06.5 Worker tests | NOT_STARTED | — | — |
| 06 | 06.V Worker verification | NOT_STARTED | — | — |
| 07 | 07.1 Adapter contracts | NOT_STARTED | — | — |
| 07 | 07.2 Receipt upload | NOT_STARTED | — | — |
| 07 | 07.3 Notifications and email | NOT_STARTED | — | — |
| 07 | 07.4 SSE events | NOT_STARTED | — | — |
| 07 | 07.5 Integration tests | NOT_STARTED | — | — |
| 07 | 07.V Integration verification | NOT_STARTED | — | — |
| 08 | 08.1 Generated API contract | NOT_STARTED | — | — |
| 08 | 08.2 Frontend API and auth layer | NOT_STARTED | — | — |
| 08 | 08.3 Dashboard integration | NOT_STARTED | — | — |
| 08 | 08.4 CRUD screen integration | NOT_STARTED | — | — |
| 08 | 08.5 Loading and error states | NOT_STARTED | — | — |
| 08 | 08.6 Responsive and E2E checks | NOT_STARTED | — | — |
| 08 | 08.V Frontend verification | NOT_STARTED | — | — |
| 09 | 09.1 Docker and Compose | NOT_STARTED | — | — |
| 09 | 09.2 CI checks | NOT_STARTED | — | — |
| 09 | 09.3 Deployment configuration | NOT_STARTED | — | — |
| 09 | 09.4 README update | NOT_STARTED | — | — |
| 09 | 09.5 Deployment smoke test | NOT_STARTED | — | — |
| 09 | 09.V DevOps verification | NOT_STARTED | — | — |
| 10 | 10.1 Backend audit | NOT_STARTED | — | — |
| 10 | 10.2 Frontend audit | NOT_STARTED | — | — |
| 10 | 10.3 Full test execution | NOT_STARTED | — | — |
| 10 | 10.4 Defect repair | NOT_STARTED | — | — |
| 10 | 10.V Final readiness verification | NOT_STARTED | — | — |

## 6. Architecture Decision Log

Append only. Do not rewrite earlier records.

| Date | Decision | Reason | Phase |
|---|---|---|---|
| 2026-06-12 | Use milestone files containing internal gated phases | Reduces context and token usage while preserving stable milestone branch boundaries. | Pack generation |
| 2026-06-12 | Keep one user base currency for MVP, defaulting to `USD` until user confirmation | The current UI has no currency selector; one base currency keeps money behavior deterministic while leaving schema room for later currency support. | 00.3 |
| 2026-06-12 | Use cursor pagination for growing user-owned lists | Transactions, savings goals, loans, notifications, and recurring rules can grow over time and should not rely on offset pagination as the long-term API contract. | 00.3 |
| 2026-06-12 | Serialize API money values as decimal strings and timestamps as timezone-aware UTC ISO 8601 strings | Preserves exact money values and avoids ambiguous time handling across frontend, API, database, worker, and reports. | 00.3 |

## 7. Verified repository inventory

### Phase 00.1 repository audit

- Branch and remote: active branch `discovery-architecture`; remote `origin` is `https://github.com/morshedalamdev/pfm-app.git`.
- Worktree before phase edits was already dirty with modified `AGENTS.md`, `PFM_PROJECT_STATE.md`, and `README.md`; tracked `agents/*.md` files deleted; untracked `milestones/` directory present. These pre-existing changes were preserved.
- Tracked top-level files include `.gitattributes`, `.gitignore`, `AGENTS.md`, `PFM_PROJECT_STATE.md`, `README.md`, `client/`, `docs/architecture/`, and legacy tracked `agents/` files that are currently deleted in the worktree.
- Current filesystem top-level project areas include `client/`, `docs/architecture/`, and `milestones/`. No `server/` directory exists.
- `.gitignore` excludes `node_modules`, `.next/`, `out/`, `build`, `coverage`, `.env*`, `.vercel`, TypeScript build info, logs, `.DS_Store`, and PEM files.
- `client/` has 99 source/config/asset files when excluding `node_modules` and `.next`. It also contains ignored generated/dependency directories `client/node_modules/` and `client/.next/`.
- Client routes contain 16 `page.tsx` files: dashboard root, analytics, budget, budget setup, loan list/detail, profile, savings list/detail, transaction list/detail, and auth entry/login/register/forgot/recover pages.
- Client components contain 42 TSX files, including 25 shadcn/Radix-style files under `client/components/ui/`.
- Client assets include local logos/icons, Urbanist font files under `client/fonts/`, and application images under `client/assets/`.
- No repository-owned test files were found outside dependency packages.
- No environment templates, deployment files, Docker files, Compose files, Python manifests, Alembic files, or CI workflow files were found.
- Existing docs `docs/architecture/SYSTEM_DESIGN.md` and `docs/architecture/UI_API_MATRIX.md` are tracked in the repository history, but phase 00.1 did not validate or update their contents because that belongs to later milestone 00 phases.

### Server replacement evidence

- `find server -maxdepth 4 -type f` failed with `find: server: No such file or directory`.
- Because there is no `server/` directory, there is no Node backend scaffold, Express/Prisma behavior, migrations, routes, models, or tests to preserve directly.
- Milestone 01 can create the FastAPI backend from a clean `server/` path rather than replacing existing files. Any prior documentation that assumes a current Node backend scaffold is stale for this clone.

### Phase 01.1 server scaffold inventory

- No stale Node server implementation files or package artifacts were removed because milestone 00 and phase 01.1 inspection confirmed `server/` did not exist.
- New server scaffold files: `server/pyproject.toml`, `server/README.md`, `server/.env.example`, `server/.gitignore`, `server/app/__init__.py`, `server/app/api/__init__.py`, `server/app/api/v1/__init__.py`, `server/app/core/__init__.py`, `server/app/modules/__init__.py`, `server/app/workers/__init__.py`, and `server/tests/test_package_import.py`.
- Root `.gitignore` now also excludes Python virtual environments, bytecode, and local Python tool caches.
- Runtime dependencies declared: FastAPI, Uvicorn, SQLAlchemy async support, asyncpg, Alembic, Pydantic Settings, and python-dotenv.
- Development and test dependencies declared: Ruff, mypy, pytest, pytest-asyncio, and httpx.
- The `app` package is intentionally import-only in phase 01.1. No FastAPI application entrypoint, endpoints, database configuration, migrations, or domain features were added.

## 8. UI-to-API matrix summary

Detailed matrix: `docs/architecture/UI_API_MATRIX.md`.

### Phase 00.2 screen inventory

- Dashboard/reporting: `/`, `/analytics`, `RootChart`, `IncomeVsExpenseChart`, and `SpendingChart`.
- Transactions: `/transaction`, `/transaction/[id]`, `TransactionItem`, `TransactionInput`, `FilterMenu`, `DateFilter`, and category icon mapping.
- Budgets: `/budget`, `/budget/setup`, `BudgetItem`, and `BudgetInput`.
- Savings: `/savings`, `/savings/[id]`, and `SavingsItem` including add-money and delete drawer actions.
- Loans/debts: `/loan`, `/loan/[id]`, `LoanItem`, and `FilterLoan`.
- Profile/auth/session surfaces: footer profile sheet, `/profile`, `/auth`, `/auth/login`, `/auth/register`, `/auth/forgot-password`, and `/auth/recover-password`.
- Shared layout/navigation/constants: dashboard layout, root layout, `Header`, `BackBtn`, `HeaderItem`, shadcn/Radix UI primitives, `imageConstant`, and `categoryIcons`.

### Phase 00.2 API summary

- Required API groups implied by the current UI: `/api/v1/auth/*`, `/api/v1/users/me`, `/api/v1/transactions/*`, `/api/v1/categories/*`, `/api/v1/budgets/*`, `/api/v1/savings-goals/*`, `/api/v1/loans/*`, and `/api/v1/reports/*`.
- The current UI has no active API helper, generated OpenAPI client, server-state query layer, Zustand store, or repository-owned mock/fixture module.
- All visible finance data is embedded directly in route/component files. Milestone 08 must replace those placeholders with typed API calls while preserving current layout and styling.
- Dynamic route pages currently behave as generic create/edit forms based on broad `[id]` routes, while links use placeholder paths such as `/transaction/create`, `/transaction/edit`, `/savings/create`, `/savings/edit`, `/loan/create`, and `/loan/edit`. Later integration must introduce real create mode and record-id edit links.
- Forms, drawers, delete confirmations, filters, and social auth buttons are visual only. Later phases must add submit handlers, mutation pending states, validation errors, retry behavior, and real record ids.
- Loading, empty, and error states are mostly absent except existing skeleton primitives and profile/avatar skeleton placeholders.

### Fixture paths recorded for milestone 08 replacement

- `client/app/(dashboard)/page.tsx`
- `client/app/(dashboard)/analytics/page.tsx`
- `client/app/(dashboard)/transaction/page.tsx`
- `client/app/(dashboard)/transaction/[id]/page.tsx`
- `client/app/(dashboard)/budget/page.tsx`
- `client/app/(dashboard)/budget/setup/page.tsx`
- `client/app/(dashboard)/savings/page.tsx`
- `client/app/(dashboard)/savings/[id]/page.tsx`
- `client/app/(dashboard)/loan/page.tsx`
- `client/app/(dashboard)/loan/[id]/page.tsx`
- `client/app/(dashboard)/profile/page.tsx`
- `client/app/auth/page.tsx`
- `client/app/auth/login/page.tsx`
- `client/app/auth/register/page.tsx`
- `client/app/auth/forgot-password/page.tsx`
- `client/app/auth/recover-password/page.tsx`
- `client/components/Footer.tsx`
- `client/components/charts/RootChart.tsx`
- `client/components/charts/IncomeVsExpenseChart.tsx`
- `client/components/charts/SpendingChart.tsx`
- `client/components/inputs/BudgetInput.tsx`
- `client/components/inputs/TransactionInput.tsx`
- `client/components/items/BudgetItem.tsx`
- `client/components/items/LoanItem.tsx`
- `client/components/items/SavingsItem.tsx`
- `client/components/items/TransactionItem.tsx`
- `client/components/filters/DateFilter.tsx`
- `client/components/filters/FilterLoan.tsx`
- `client/components/filters/FilterMenu.tsx`
- `client/lib/categoryIcons.ts`

## 9. Implemented endpoints

Append endpoints as they are implemented.

Phase 00.3 documented planned API groups under `/api/v1`; no endpoints have been implemented yet.

Phase 00.4 verified that planned endpoints cover the existing UI surfaces in `docs/architecture/UI_API_MATRIX.md`. Implementation begins no earlier than phase 01.1.

Phase 01.1 added no endpoints. FastAPI app configuration begins no earlier than phase 01.2.

## 10. Database migrations

Append migrations as they are created and verified.

Phase 01.1 created no migrations and did not add database configuration.

## 11. Environment variables

Append required variables with descriptions. Never store secret values.

### Phase 01.1 scaffold variables

Committed template: `server/.env.example`.

| Variable | Description |
|---|---|
| `APP_NAME` | Human-readable API name for local configuration. |
| `APP_ENV` | Runtime environment label; defaults to local in the template. |
| `DEBUG` | Local debug flag placeholder for later typed settings. |

## 12. Test command registry

### Phase 00.1 baseline commands

| Command | Result | Purpose / notes |
|---|---|---|
| `git status --short --branch` | PASS | Reports active branch and dirty worktree state. |
| `cd client && npm install` | PASS | Dependencies were already up to date. |
| `cd client && npm run build` | FAIL in sandbox, PASS with approved network | Sandboxed run failed because Next.js could not fetch Urbanist from Google Fonts. Approved network rerun passed. `next.config.ts` skips TypeScript validation via `typescript.ignoreBuildErrors: true`. |
| `cd client && npm run lint --if-present` | PASS / no-op | No `lint` script is defined in `client/package.json`. |
| `cd client && npm run test --if-present` | PASS / no-op | No `test` script is defined in `client/package.json`. |

No valid server scaffold checks exist yet because `server/` does not exist.

### Phase 00.2 frontend requirements map commands

| Command | Result | Purpose / notes |
|---|---|---|
| `cd client && npm run build` | FAIL in sandbox, PASS with approved network | Sandboxed run failed because Next.js could not fetch Urbanist from Google Fonts. Approved network rerun passed. Build still reports `Skipping validation of types`. |
| `cd client && npm run lint --if-present` | PASS / no-op | No `lint` script is defined in `client/package.json`. |
| `cd client && npm run test --if-present` | PASS / no-op | No `test` script is defined in `client/package.json`. |

### Phase 00.3 architecture baseline commands

| Command | Result | Purpose / notes |
|---|---|---|
| `test -f docs/architecture/SYSTEM_DESIGN.md` | PASS | Confirms system design document exists. |
| `test -f docs/architecture/UI_API_MATRIX.md` | PASS | Confirms UI/API matrix exists. |
| `grep -q "api/v1" docs/architecture/SYSTEM_DESIGN.md` | PASS | Confirms API versioning is documented. |
| `grep -q "FastAPI" docs/architecture/SYSTEM_DESIGN.md` | PASS | Confirms FastAPI architecture is documented. |

### Phase 00.4 discovery verification commands

| Command | Result | Purpose / notes |
|---|---|---|
| `cd client && npm run build` | FAIL in sandbox, PASS with approved network | Sandboxed run failed because Next.js could not fetch Urbanist from Google Fonts. Approved network rerun passed. Build still reports `Skipping validation of types`. |
| `cd client && npm run lint --if-present` | PASS / no-op | No `lint` script is defined in `client/package.json`. |
| `cd client && npm run test --if-present` | PASS / no-op | No `test` script is defined in `client/package.json`. |
| `test -f docs/architecture/SYSTEM_DESIGN.md` | PASS | Confirms system design document exists. |
| `test -f docs/architecture/UI_API_MATRIX.md` | PASS | Confirms UI/API matrix exists. |

### Phase 01.1 Python server scaffold commands

| Command | Result | Purpose / notes |
|---|---|---|
| `cd server && python3 -m venv .venv` | PASS | Created a local virtual environment because global `python` was not available on PATH. |
| `cd server && .venv/bin/python -m pip install -e '.[dev,test]'` | FAIL in sandbox, PASS with approved network | Sandboxed run could not resolve PyPI hostnames while fetching `hatchling`; approved network rerun installed runtime, dev, and test dependencies. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" python -m compileall app` | PASS | Verified the minimal `app` package imports and compiles. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" python -m pytest --collect-only` | PASS | Collected 1 scaffold import test. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check .` | PASS | Ruff lint passed. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check .` | PASS | Ruff format check passed. |

## 13. Open blockers and deferred decisions

Record only active blockers or intentionally deferred decisions.

- Default base currency is recorded as `USD` until user confirmation. MVP multi-currency conversion is deferred; schema should keep room for later currency support.
- Add real lint/type/test scripts in later phases; current frontend optional lint/test commands are no-ops.
- Decide in milestone 01 whether to replace `next/font/google` with local font loading or require network access for production builds.
- Milestone 00 is verified.
- Phase 01.1 is complete. Next allowed phase is 01.2, FastAPI app configuration.

## 14. Progress log

Append a dated entry after every completed phase.

- 2026-06-12: Phase 00.1 repository audit passed. Verified the repository is frontend-only in this worktree, recorded that `server/` is absent, captured stale documentation/package metadata findings, ran baseline client checks, and confirmed the next allowed phase is 00.2.
- 2026-06-12: Phase 00.2 frontend requirements map passed. Updated `docs/architecture/UI_API_MATRIX.md` to cover every implemented screen, route, data-bearing component, fixture path, implied query/mutation, validation requirement, and missing loading/empty/error state. Confirmed no backend implementation was added and the next allowed phase is 00.3.
- 2026-06-12: Phase 00.3 architecture baseline passed. Preserved the existing `docs/architecture/SYSTEM_DESIGN.md` content and patched only missing phase-required sections for entity map, API groups, pagination, error envelope, decimal serialization, UTC timestamps, transaction flow, SSE flow, OpenAPI generation, and non-goals. Confirmed no backend implementation was added and the next allowed phase is 00.4.
- 2026-06-12: Phase 00.4 discovery verification passed. Verified `PFM_PROJECT_STATE.md`, `docs/architecture/SYSTEM_DESIGN.md`, and `docs/architecture/UI_API_MATRIX.md` for milestone 00 consistency, confirmed every fixture is mapped to a planned API source or deferred feature, confirmed `server/` is absent and phase 01.1 should create it cleanly, ran baseline frontend checks, and set the next allowed phase to 01.1.
- 2026-06-12: Phase 01.1 Python server scaffold passed. Created the new `server/` Python project with `pyproject.toml`, package placeholders, `.env.example`, ignored local Python artifacts, and a scaffold import test. Confirmed no stale Node server files existed to remove, ran required compile, pytest collection, Ruff lint, and Ruff format checks, and set the next allowed phase to 01.2.
