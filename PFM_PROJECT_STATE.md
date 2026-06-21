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
| 01 | 01.2 FastAPI app configuration | PASSED | phase commit created after this state update | Added app factory, typed settings, `/api/v1` router, CORS, logging foundation, error envelope, liveness endpoint, and tests. |
| 01 | 01.3 PostgreSQL persistence | PASSED | phase commit created after this state update | Added async SQLAlchemy engine/session/base infrastructure, database settings, disposable PostgreSQL tests, and local setup docs. |
| 01 | 01.4 Alembic and health checks | PASSED | phase commit created after this state update | Added async Alembic baseline, liveness/readiness health checks, migration smoke tests, and migration command docs. |
| 01 | 01.V Foundation verification | PASSED | phase commit created after this state update | Verified milestone 01 scope, `.env` ignore behavior, server quality suite, and Alembic upgrade/downgrade/upgrade smoke checks. |
| 02 | 02.1 User and session models | PASSED | phase commit created after this state update | Added persisted user and refresh-session schema with repository/service skeletons and migration smoke coverage. |
| 02 | 02.2 Registration and hashing | PASSED | phase commit created after this state update | Added secure registration, email normalization, password policy, Argon2 hashing, response redaction, and endpoint tests. |
| 02 | 02.3 Login and access token | PASSED | phase commit created after this state update | Added credential login, short-lived JWT access tokens, current-user authorization dependency, protected user endpoint, and token edge-case tests. |
| 02 | 02.4 Refresh rotation and logout | PASSED | phase commit created after this state update | Added opaque refresh tokens, HMAC token hashing, refresh-session rotation, reuse family revocation, logout revocation, and security tests. |
| 02 | 02.5 Auth edge-case tests | PASSED | phase commit created after this state update | Hardened bearer-token exception handling, added auth edge-case tests, documented auth OpenAPI behavior, and recorded login/register rate-limit design notes. |
| 02 | 02.V Auth verification | PASSED | verification commit created after this state update | Verified auth milestone quality suite, migration smoke checks, OpenAPI auth routes, protected dependency behavior, and committed-secret posture. |
| 03 | 03.1 Finance domain schema | PASSED | phase commit created after this state update | Added finance source-of-truth models, ownership constraints, indexes, Alembic migration, and schema/migration tests. |
| 03 | 03.2 Accounts and categories | PASSED | phase commit created after this state update | Added owned account/category CRUD APIs, safe archive behavior, pagination, kind filtering, ownership tests, and OpenAPI coverage. |
| 03 | 03.3 Income and expenses | PASSED | phase commit created after this state update | Added authenticated income/expense transaction CRUD, validation, soft void behavior, ownership checks, source-record reproducibility tests, and OpenAPI coverage. |
| 03 | 03.4 Transfers and atomicity | PASSED | phase commit created after this state update | Added auditable transfer create/retrieve APIs, atomic debit/credit/link writes, validation, rollback tests, and transfer invariant documentation. |
| 03 | 03.5 Filters, pagination, idempotency | PASSED | phase commit created after this state update | Added transaction cursor pagination, filters, deterministic ordering, idempotent transaction/transfer creates, conflict handling, and regression tests. |
| 03 | 03.6 Finance tests | PASSED | phase commit created after this state update | Hardened money OpenAPI contracts, idempotent replay ordering, finance API matrix notes, and contract/integration coverage. |
| 03 | 03.V Finance verification | NOT_STARTED | — | — |
| 04 | 04.1 Budget schema and rules | PASSED | phase commit created after this state update | Added budget persistence, period semantics, active same-scope overlap protection, migration, and schema tests. |
| 04 | 04.2 Budget APIs and progress | PASSED | phase commit created after this state update | Added authenticated budget CRUD/archive APIs, budget list filters, and computed progress from expense source records. |
| 04 | 04.3 Savings goals and contributions | PASSED | phase commit created after this state update | Added authenticated savings goal CRUD/archive APIs, auditable contributions, computed progress, completion rules, migration, and tests. |
| 04 | 04.4 Budget and savings tests | PASSED | phase commit created after this state update | Hardened budget/savings edge-case tests, OpenAPI contract tests, and UI/API matrix status. |
| 04 | 04.V Budget and savings verification | NOT_STARTED | — | — |
| 05 | 05.1 Report contracts | PASSED | phase commit created after this state update | Defined report query/response schemas and documented the minimal dashboard and analytics report endpoint contracts from verified UI needs. |
| 05 | 05.2 Dashboard summaries | PASSED | phase commit created after this state update | Implemented authenticated dashboard report summary, active-account balance aggregation, period totals, zero-filled chart buckets, and tests. |
| 05 | 05.3 Trends and breakdowns | PASSED | phase commit created after this state update | Implemented authenticated monthly summary, cash-flow trend, and spending-by-category analytics endpoints with deterministic chart tests. |
| 05 | 05.4 Query performance | PASSED | phase commit created after this state update | Added report query indexes, documented EXPLAIN plan findings, verified migration smoke, and kept report analytics on direct source-record aggregation. |
| 05 | 05.5 Analytics tests | PASSED | phase commit created after this state update | Hardened analytics fixture coverage and verified report OpenAPI contracts against chart/UI response needs. |
| 05 | 05.V Analytics verification | PASSED | verification commit created after this state update | Verified milestone 05 report endpoints, query-plan documentation, full server quality suite, full tests, and disposable Alembic upgrade. |
| 06 | 06.1 Recurring and outbox schema | PASSED | phase commit created after this state update | Added recurring rule and durable outbox persistence, worker coordination fields, migration, schema tests, and recurrence limitations documentation. |
| 06 | 06.2 Scheduling rules | PASSED | phase commit created after this state update | Added recurring-rule CRUD/list/update/pause/resume/archive APIs, deterministic UTC schedule calculation, ownership validation, and tests. |
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
| 2026-06-15 | Transport refresh tokens in JSON request/response bodies for MVP auth | The current frontend/API deployment topology does not yet define a shared cookie domain, SameSite policy, or HTTPS-only deployment contract. JSON transport keeps phase 02.4 testable and explicit; frontend storage and deployment hardening remain for later integration phases. | 02.4 |
| 2026-06-15 | Defer login and registration rate limiting until a shared persistent throttle foundation exists | Phase 02 has no cross-worker throttling foundation. Process-local counters would give false protection, so the intended future shape is PostgreSQL-backed throttling keyed by endpoint, normalized email when present, client network bucket, and time window with generic responses. | 02.5 |
| 2026-06-15 | Store finance source amounts as `NUMERIC(18,4)` with positive rows and type-directed balance effects | Four decimal places preserve exact `Decimal` math beyond cents while the UI can still format to cents; positive rows plus explicit transaction types keep income, expense, and transfer direction auditable. | 03.1 |
| 2026-06-19 | Allow a final savings contribution to exceed the target, then freeze completed or archived goals against later contributions | Real deposits may not match the exact target; preserving the source contribution keeps progress reproducible, while rejecting further writes to completed or archived goals gives clear lifecycle behavior. | 04.3 |
| 2026-06-21 | Limit MVP recurring transaction templates to income and expense source rows | The current UI recurring control lives on the income/expense transaction form and existing transaction creation requires one owned account and category; recurring transfers, split templates, exceptions, and business-day adjustments are deferred until a concrete UI/API need exists. | 06.1 |

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

### Phase 01.2 application core inventory

- Added `server/app/main.py` with `create_app`, FastAPI metadata, OpenAPI/docs configuration, CORS middleware, exception handler registration, dependency overrides for app-local settings, and `/api/v1` router mounting.
- Added `server/app/core/config.py` for typed `pydantic-settings` configuration loaded from environment variables and `.env`.
- Added `server/app/core/logging.py` as the structured logging foundation using `logging.config.dictConfig`.
- Added `server/app/core/errors.py` with a consistent JSON error envelope for HTTP, validation, and unhandled exceptions.
- Added `server/app/api/v1/router.py` and `server/app/api/v1/health.py` for versioned route composition and DB-free liveness.
- Added `server/tests/test_app_core.py` for app startup, OpenAPI metadata, version prefix behavior, liveness response, error-envelope behavior, and logging foundation checks.
- No domain models, database engine/session setup, Alembic configuration, authentication, finance modules, or readiness checks were added in phase 01.2.

### Phase 01.3 PostgreSQL persistence inventory

- Added `server/app/core/database.py` with SQLAlchemy 2 async engine creation, async session factory creation, declarative `Base`, metadata naming conventions, request-scoped session dependency, and connection check helper.
- Extended `server/app/core/config.py` and `server/.env.example` with PostgreSQL database URL, echo, pool size, and max overflow settings.
- Added `server/tests/test_database.py` with configuration, metadata, connection helper, async session factory, and request-scoped dependency tests.
- The database tests start a disposable PostgreSQL server under pytest temporary directories using local `initdb` and `pg_ctl`; they do not touch the developer's personal database.
- Added local PostgreSQL database creation commands to `server/README.md` without embedding credentials.
- No Alembic configuration, migrations, readiness endpoint, or domain models were added in phase 01.3.

### Phase 01.4 Alembic and health inventory

- Added `server/alembic.ini`, `server/alembic/env.py`, `server/alembic/script.py.mako`, and initial empty baseline revision `server/alembic/versions/202606120114_initial_empty_baseline.py`.
- Alembic runs with async SQLAlchemy metadata from `app.core.database.Base.metadata` and reads the target PostgreSQL URL from the Alembic config or typed `DATABASE_URL` setting.
- Extended `server/app/api/v1/health.py` with `GET /api/v1/health/ready`, which verifies database connectivity through the async connection helper before returning ready.
- Moved the disposable PostgreSQL pytest fixture into `server/tests/conftest.py` for reuse by persistence and migration tests.
- Added migration smoke test coverage in `server/tests/test_migrations.py`.
- Updated `server/tests/test_app_core.py` to cover OpenAPI exposure for readiness, DB-free liveness, successful readiness, and readiness error envelope behavior.
- Added migration command documentation to `server/README.md`.
- No domain models, user/auth tables, finance tables, or later milestone endpoints were added in phase 01.4.

### Phase 01.V foundation verification inventory

- Verified the milestone 01 server scope contains only FastAPI foundation files, core configuration, async PostgreSQL infrastructure, Alembic baseline migration, health endpoints, and tests.
- Confirmed `server/app/modules/` still contains only `__init__.py`; no auth, user, finance, budget, report, worker domain behavior, or other later-milestone features were implemented.
- Confirmed `.env` and `server/.env` are ignored by `.gitignore`, while `server/.env.example` remains committed.
- Reviewed `server/.env.example` and confirmed it contains only local placeholders/defaults, no secrets or external credentials.
- Ran the full foundation quality suite and Alembic upgrade/downgrade/upgrade smoke checks against a disposable PostgreSQL database.

### Phase 02.1 user and session schema inventory

- Added `server/app/modules/users/models.py` with a `users` SQLAlchemy model using UUID primary keys, normalized email storage, unique email constraint, password hash, active flag, and timezone-aware created/updated timestamps.
- Added `server/app/modules/auth/models.py` with a `refresh_sessions` SQLAlchemy model using UUID primary keys, hashed refresh token storage, expiry, revocation metadata, parent/replacement session links, and session family metadata for later rotation.
- Added repository/service skeletons in `server/app/modules/users/repositories.py`, `server/app/modules/auth/repositories.py`, and `server/app/modules/auth/services.py`; no auth endpoint behavior was added.
- Updated `server/alembic/env.py` to import user and auth models so Alembic metadata includes the new tables.
- Added `server/tests/test_auth_schema.py` covering model shape, repository/service skeleton composition, and auth migration upgrade/downgrade/upgrade table behavior.

### Phase 02.2 registration and password hashing inventory

- Added `pwdlib[argon2]` as a backend runtime dependency for Argon2 password hashing.
- Added `server/app/core/security.py` with password hashing and verification helpers backed by `pwdlib.PasswordHash.recommended()`.
- Added `server/app/modules/auth/validation.py` and `server/app/modules/auth/schemas.py` for email normalization, password policy validation, registration request schema, and safe user response schema.
- Extended `server/app/modules/auth/services.py` and `server/app/modules/users/repositories.py` to create users with normalized email and hashed passwords while handling duplicate email conflicts deterministically.
- Added `server/app/modules/auth/router.py` and mounted it from `server/app/api/v1/router.py` for registration only.
- Updated validation error handling in `server/app/core/errors.py` to redact sensitive submitted inputs such as `password` from API validation error responses.
- Added `server/tests/test_registration.py` covering successful registration, duplicate email, invalid email, weak password redaction, normalization, Argon2 storage, and serialization safety.

### Phase 02.3 login and access-token inventory

- Added `PyJWT` as a backend runtime dependency for signed HS256 access tokens.
- Extended `server/app/core/config.py` and `server/.env.example` with access-token signing algorithm, secret-key placeholder, and expiry settings.
- Extended `server/app/core/security.py` with access-token creation and decode validation, including `sub`, `email`, `typ`, `iat`, `exp`, and `jti` claims.
- Added `server/app/modules/auth/dependencies.py` with reusable bearer-token current-user resolution.
- Extended `server/app/modules/auth/schemas.py`, `server/app/modules/auth/services.py`, and `server/app/modules/auth/router.py` with login request/response schemas, credential verification, inactive-user rejection, generic invalid-credential responses, and `POST /api/v1/auth/login`.
- Added `server/app/modules/users/router.py` and `server/app/modules/users/schemas.py` for protected `GET /api/v1/users/me`.
- Extended `server/app/modules/users/repositories.py` with user lookup by UUID.
- Added `server/tests/test_login.py` covering valid login, protected user access, invalid credentials, inactive account, malformed token, expired token, and invalid signature.

### Phase 02.4 refresh rotation and logout inventory

- Extended `server/app/core/config.py` and `server/.env.example` with refresh-token HMAC secret and expiry settings.
- Extended `server/app/core/security.py` with opaque refresh-token generation and HMAC-SHA256 refresh-token hashing; plaintext refresh tokens are never persisted.
- Extended `server/app/modules/auth/repositories.py` with refresh-session locking, family lookup, create, commit, and rollback helpers.
- Extended `server/app/modules/auth/schemas.py`, `server/app/modules/auth/services.py`, and `server/app/modules/auth/router.py` with refresh-token response fields, refresh request, logout request/response, refresh-session creation, rotation, expiry rejection, family revocation on reuse, and logout revocation.
- `POST /api/v1/auth/login` now returns both a short-lived access token and an opaque refresh token.
- Refresh-token transport is JSON body request/response for this MVP backend phase. Cookie transport is deferred until frontend integration/deployment topology defines domain, HTTPS, and SameSite requirements.
- Added `server/tests/test_refresh.py` covering hashed refresh-token storage, refresh success, rotation, reuse rejection with family revocation, expiry rejection, logout, and revoked-token reuse rejection.

### Phase 02.5 auth edge-case inventory

- Narrowed the current-user bearer dependency to translate only known invalid access-token exceptions into HTTP 401, leaving unexpected decode failures visible to the global internal-error handler.
- Extended `server/tests/test_login.py` with password validation redaction, missing bearer credentials, missing-user token rejection, and unexpected decode failure coverage.
- Extended `server/tests/test_refresh.py` with refresh-token validation redaction and parallel same-token refresh attempts proving only one rotation can succeed.
- Updated `docs/architecture/SYSTEM_DESIGN.md` with implemented auth endpoint contract notes, token transport notes, validation redaction expectations, and deferred PostgreSQL-backed rate-limit design notes.

### Phase 02.V auth verification inventory

- Verified the milestone 02 auth surface remains limited to users, registration, login, access tokens, refresh rotation, logout, and current-user authorization.
- Verified generated OpenAPI includes `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, and `GET /api/v1/users/me`.
- Verified `GET /api/v1/users/me` uses the bearer-token current-user dependency and OpenAPI marks it with `HTTPBearer` security.
- Verified `.env` and `server/.env` are ignored, `server/.env.example` remains tracked as a placeholder template, and tracked-file scans found no known private-key, cloud-key, GitHub-token, OpenAI-key, Google-key, or Slack-token patterns.
- Ran the full server quality suite and Alembic upgrade/downgrade/upgrade smoke checks against a disposable PostgreSQL database.

### Phase 03.1 finance domain schema inventory

- Added `server/app/modules/accounts/` with an `Account` SQLAlchemy model using UUID primary keys, user ownership, currency, non-negative `NUMERIC(18,4)` opening balance, archive fields, timestamps, and user/name/archive indexes.
- Added `server/app/modules/categories/` with a `Category` SQLAlchemy model using UUID primary keys, user ownership, income/expense kind constraint, icon key, default/archive flags, per-user/kind name uniqueness, and user/kind/archive indexes.
- Added `server/app/modules/transactions/` with a `Transaction` model for positive income, expense, transfer debit, and transfer credit rows. Transactions use `NUMERIC(18,4)`, timezone-aware transaction timestamps, optional category and void fields, and indexes for user/date/account/category/type access patterns.
- Added `server/app/modules/transactions/` `TransferLink` model to connect one debit transaction row and one credit transaction row with unique side constraints, positive amount, currency, and user ownership.
- Added `server/app/modules/idempotency/` with an `IdempotencyRecord` model keyed uniquely by user, operation, and idempotency key, storing request hash, optional response metadata, lock expiry, and expiry.
- Finance cross-record ownership is enforced with composite foreign keys containing `user_id` for transaction account/category references and transfer debit/credit references.
- Updated Alembic metadata imports and created finance migration `202606150301_add_finance_domain_schema.py`.
- Added `server/tests/test_finance_schema.py` for model metadata, indexes, money precision, migration up/down/up, and migrated composite ownership constraints.
- Narrowed the existing auth migration test to revision `202606150201` so it continues testing the auth migration now that the milestone 03 finance migration is the new head.
- Updated `docs/architecture/SYSTEM_DESIGN.md` with the implemented finance core schema. No finance API endpoints or CRUD behavior were added in phase 03.1.

### Phase 03.2 accounts and categories inventory

- Added account API schemas, repository, service, router, and cursor helper under `server/app/modules/accounts/`.
- Added category API schemas, repository, service, and router under `server/app/modules/categories/`.
- Mounted account and category routers from `server/app/api/v1/router.py`.
- Implemented authenticated `POST /api/v1/accounts`, `GET /api/v1/accounts`, `GET /api/v1/accounts/{account_id}`, `PATCH /api/v1/accounts/{account_id}`, and `DELETE /api/v1/accounts/{account_id}`.
- Implemented authenticated `POST /api/v1/categories`, `GET /api/v1/categories`, `PATCH /api/v1/categories/{category_id}`, and `DELETE /api/v1/categories/{category_id}`.
- Account and category queries/mutations are scoped by current `user_id`; cross-user access returns not found.
- Account and category list endpoints use `limit`, optional opaque `cursor`, `include_archived`, and a response envelope with `items`, `next_cursor`, and `has_more`. Category list also supports `kind=income|expense`.
- Account delete and category delete are safe archive operations that set `is_archived=true` and `archived_at`; rows are not hard deleted.
- Account money validation rejects floating-point JSON numbers and uses `Decimal`; response money serializes as decimal strings from PostgreSQL `NUMERIC(18,4)`.
- Category duplicate name/kind per user returns HTTP 409 from the database uniqueness constraint.
- Added `server/tests/test_accounts_categories.py` covering CRUD, validation, cross-user access rejection, archive behavior, pagination, filters, duplicate categories, and OpenAPI schemas.
- Updated the existing auth migration test to downgrade to base before exercising revision `202606150201`, keeping it independent of shared disposable database state.

### Phase 03.3 income and expenses inventory

- Added transaction API schemas, repository, service, and router under `server/app/modules/transactions/`.
- Mounted the transaction router from `server/app/api/v1/router.py`.
- Implemented authenticated `POST /api/v1/transactions`, `GET /api/v1/transactions`, `GET /api/v1/transactions/{transaction_id}`, `PATCH /api/v1/transactions/{transaction_id}`, and `DELETE /api/v1/transactions/{transaction_id}` for income and expense records.
- Transaction create/update validates positive Decimal amounts, rejects JSON float amounts, requires UTC-aware transaction timestamps, trims optional descriptions, and normalizes timestamps to UTC.
- Transaction create/update validates owned, active accounts and owned, active categories whose kind matches the requested income or expense transaction type.
- Transaction queries and mutations are scoped by current `user_id`; cross-user access returns not found.
- Transaction delete uses a void strategy by setting `voided_at`; voided transactions remain retrievable by id for audit behavior but are excluded from list results and cannot be updated.
- Transaction list returns the current user's non-voided income/expense rows sorted newest first. Pagination, filtering, and idempotency remain assigned to phase 03.5.
- Added `server/tests/test_transactions.py` covering CRUD, precise Decimal source-record totals, void behavior, ownership rejection, archived reference rejection, category kind validation, unsupported transaction types, float rejection, and naive timestamp rejection.

### Phase 03.4 transfers and atomicity inventory

- Extended transaction schemas, repository, service, and router under `server/app/modules/transactions/` for account transfers.
- Implemented authenticated `POST /api/v1/transactions/transfers` and `GET /api/v1/transactions/transfers/{transfer_id}`.
- Transfer create writes one positive `transfer_debit` transaction row for the source account, one positive `transfer_credit` transaction row for the destination account, and one `transfer_links` row connecting both sides.
- Transfer writes are committed as one database unit; service rollback is explicit if any flushed source row or transfer-link write fails before commit.
- Transfer create validates positive Decimal amounts, rejects JSON float amounts, requires timezone-aware transaction timestamps, trims optional descriptions, rejects same-account transfers, rejects inactive or cross-user accounts, and rejects currency mismatches because MVP transfers do not perform conversion.
- Transfer retrieval is scoped by current `user_id` and returns the transfer id, source/destination account ids, debit/credit transaction ids, amount, currency, transaction time, description, and created timestamp.
- Transfer source rows remain excluded from the phase 03.3 income/expense list endpoint until phase 03.5 defines broader transaction filtering and pagination behavior.
- Added transfer tests in `server/tests/test_transactions.py` covering create/retrieve representation, source-record/link invariants, validation, cross-user access rejection, archived account rejection, and rollback after a forced transfer-link write failure.
- Updated `docs/architecture/SYSTEM_DESIGN.md` with phase 03.4 transfer invariants.

### Phase 03.5 filters, pagination, and idempotency inventory

- Added `server/app/modules/transactions/pagination.py` for transaction list cursor encoding and decoding using `transaction_at`, `created_at`, and `id`.
- Added `server/app/modules/idempotency/repositories.py` for the existing `idempotency_records` table.
- Extended `GET /api/v1/transactions` with `limit`, `cursor`, `date_from`, `date_to`, `account_id`, `category_id`, `type`, and `search` query parameters.
- Transaction list now returns all current-user non-voided source rows, including income, expense, transfer debit, and transfer credit rows, with deterministic descending ordering by transaction time, creation time, and id.
- Transaction list responses now include `items`, `next_cursor`, and `has_more`.
- Transaction list filter validation rejects malformed cursors, timezone-naive date filters, reversed date ranges, and cross-user account/category filter ids.
- Added optional `Idempotency-Key` header support to `POST /api/v1/transactions` and `POST /api/v1/transactions/transfers`.
- Idempotent transaction and transfer creates store the original successful 201 response in `idempotency_records`; repeating the same key with the same request returns the original response, while reusing the key with a different request returns HTTP 409.
- Updated `docs/architecture/SYSTEM_DESIGN.md` with transaction cursor and idempotency behavior.
- Extended `server/tests/test_transactions.py` with filter, pagination boundary, ordering, invalid filter, repeated idempotency key, and mismatched request reuse coverage.

### Phase 03.6 finance tests and contract review inventory

- Added `server/app/core/money.py` with shared Pydantic Decimal aliases that preserve `Decimal` validation while documenting money fields in OpenAPI as decimal strings.
- Updated account and transaction request schemas so `opening_balance` and `amount` fields no longer advertise JSON numbers in the OpenAPI contract.
- Reordered transaction and transfer create idempotency checks so repeated matching `Idempotency-Key` requests return the stored original response before revalidating mutable account/category archive state.
- Added integration tests proving idempotent transaction and transfer replays still return the original response after referenced accounts/categories are archived.
- Added `server/tests/test_finance_contracts.py` covering finance money field schemas, transaction list pagination/filter parameters, and `Idempotency-Key` header contracts for retryable create endpoints.
- Updated `docs/architecture/UI_API_MATRIX.md` with implemented account/category/transaction/transfer contract status, transaction filter mapping, decimal string contract, and category icon API notes.
- Updated `docs/architecture/SYSTEM_DESIGN.md` to record decimal string request/response contracts and idempotent replay ordering.
- Reviewed current finance money mutations for Decimal validation, user ownership checks, transaction boundaries, auditability, and idempotency scope. No new durable worker, budget, reporting, or frontend integration work was added.

### Phase 04.1 budget schema and rules inventory

- Added `server/app/modules/budgets/` with a `Budget` SQLAlchemy model using UUID primary keys, user ownership, optional category scope, calendar-month or custom period dates, positive `NUMERIC(18,4)` limit amounts, currency, archive fields, and timestamps.
- Budget periods are stored as half-open date ranges `[period_start, period_end)`. `period_start` must be before `period_end`.
- `period_type='monthly'` requires `period_start` to be the first day of a calendar month and `period_end` to be exactly one month later. `period_type='custom'` allows explicit dates that satisfy the same ordered range rule.
- Active budgets cannot overlap for the same user and same budget scope. PostgreSQL enforces this with a GiST exclusion constraint over `user_id`, normalized `category_id` scope, and `daterange(period_start, period_end, '[)')` where `is_archived=false`.
- Global budgets (`category_id IS NULL`) and category-specific budgets are allowed to overlap for the same dates because they represent different scopes: total spending versus a category cap. Category budgets for different categories may also overlap.
- Budget category references use a composite foreign key containing `user_id`, preserving user ownership boundaries. Phase 04.2 should validate that category-scoped budgets point to expense categories.
- Archive behavior is soft: archived budget rows remain persisted with `is_archived=true` and `archived_at` set. Archived rows are excluded from active overlap enforcement.
- Updated Alembic metadata imports and created budget migration `202606190401_add_budget_schema.py`.
- Added `server/tests/test_budget_schema.py` for budget model metadata, indexes, money precision, archive consistency, and overlap-rule constraint coverage.
- Updated `server/tests/test_finance_schema.py` so finance migration tests reset to base and target revision `202606150301`, preserving their original scope now that the budget migration is the Alembic head.
- No budget endpoints, progress calculations, savings schema, savings endpoints, report behavior, or frontend integration were added in phase 04.1.

### Phase 04.2 budget API and progress inventory

- Added budget API schemas, cursor pagination, repository, service, and router under `server/app/modules/budgets/`.
- Mounted the budget router from `server/app/api/v1/router.py`.
- Implemented authenticated `POST /api/v1/budgets`, `GET /api/v1/budgets`, `GET /api/v1/budgets/{budget_id}`, `PATCH /api/v1/budgets/{budget_id}`, and `DELETE /api/v1/budgets/{budget_id}`.
- Budget create/update validates positive Decimal limit amounts, rejects JSON float money values, normalizes currency, validates monthly period boundaries, and validates optional category scope against an owned, active expense category.
- Budget queries and mutations are scoped by current `user_id`; cross-user access returns not found and cross-user category filters/references are rejected.
- Budget list supports `limit`, optional opaque `cursor`, `include_archived`, `category_id`, and `month=YYYY-MM`. Month filtering returns budgets whose half-open period intersects the selected calendar month.
- Budget responses include `category_name` when category-scoped and a computed `progress` object with `spent_amount`, `remaining_amount`, `percent_used`, and `status`.
- Progress is computed at read time from non-voided `expense` transaction source rows in the budget's half-open `[period_start, period_end)` range. Global budgets include all expense categories; category budgets include only matching category expense rows. Income, transfers, voided expenses, and transactions exactly at `period_end` are excluded.
- Active same-scope overlap conflicts from the PostgreSQL exclusion constraint return HTTP 409. Global and category budgets can still coexist for the same dates because they are different scopes.
- Budget delete is a safe archive operation that sets `is_archived=true` and `archived_at`; archived budgets are excluded from default list results and included only with `include_archived=true`.
- Added `server/tests/test_budgets.py` covering CRUD, progress calculations, category filters, period boundaries, overlap rules, archive behavior, ownership, invalid references, and OpenAPI exposure.
- No migrations, savings schema, savings endpoints, report behavior, or frontend integration were added in phase 04.2.

### Phase 04.3 savings goals and contributions inventory

- Added `server/app/modules/savings/` with SQLAlchemy models, schemas, cursor pagination, repository, service, and router for savings goals and contributions.
- Added `SavingsGoal` persistence with UUID primary keys, user ownership, name, target amount, monthly target amount, currency, optional target date, status (`active`, `completed`, `archived`), note, completion/archive timestamps, and created/updated timestamps.
- Added `SavingsContribution` persistence with UUID primary keys, user ownership, composite goal/user ownership reference, positive `NUMERIC(18,4)` amount, currency, timezone-aware contribution timestamp, optional note, and created timestamp. Contributions are append-only in the API and are the source records for saved amount calculations.
- Mounted the savings router from `server/app/api/v1/router.py`.
- Implemented authenticated goal endpoints: `POST /api/v1/savings-goals`, `GET /api/v1/savings-goals`, `GET /api/v1/savings-goals/{goal_id}`, `PATCH /api/v1/savings-goals/{goal_id}`, and `DELETE /api/v1/savings-goals/{goal_id}`.
- Implemented authenticated contribution endpoints: `POST /api/v1/savings-goals/{goal_id}/contributions` and `GET /api/v1/savings-goals/{goal_id}/contributions`.
- Savings goal and contribution requests reject JSON float money values, validate positive/non-negative Decimal strings, normalize currency, trim optional notes, require timezone-aware contribution timestamps, and reject target dates in the past.
- Savings queries and mutations are scoped by current `user_id`; cross-user goal access and contribution access return not found.
- Goal list supports `limit`, optional opaque `cursor`, and `status=all|active|completed|archived`. The default `all` view excludes archived goals; `status=archived` returns archived goals.
- Goal responses include computed `progress` with `saved_amount`, `remaining_amount`, `percent_complete`, and `is_target_met`, calculated from contribution source rows rather than stored counters.
- Contributions above the target are allowed while a goal is active; the contribution is persisted and the goal status becomes `completed` when saved amount is greater than or equal to target amount. Completed and archived goals reject later contribution creates with HTTP 409.
- Goal delete is a safe archive operation that sets `status='archived'` and `archived_at`; archived goals remain retrievable by direct ID but are hidden from default list results.
- Added Alembic metadata imports and migration `202606190403_add_savings_goals_schema.py`.
- Added `server/tests/test_savings_schema.py` for savings model metadata, indexes, money precision, timestamp, status, and ownership constraint coverage.
- Added `server/tests/test_savings.py` covering CRUD, contribution listing, progress calculations, over-target completion, completed/archived contribution rejection, target-date validation, invalid amounts, ownership, and OpenAPI exposure.
- No budget test expansion phase, reporting behavior, loans, recurring behavior, worker behavior, or frontend integration was added in phase 04.3.

### Phase 04.4 budget and savings hardening inventory

- Reviewed budget and savings Decimal request/response handling, progress serialization, cursor pagination contracts, UTC budget period boundaries, archived record visibility, and authenticated mutation contracts.
- Added budget integration coverage for UTC half-open period boundaries using non-UTC transaction offsets, budget list pagination, invalid budget cursors, and invalid month filters.
- Added savings integration coverage for savings goal pagination, contribution pagination, invalid goal/contribution cursors, and explicit `status=archived` list behavior.
- Added `server/tests/test_budget_savings_contracts.py` covering budget/savings OpenAPI money fields as decimal strings, list envelope shapes, query parameters, progress enum/boolean fields, and bearer security on budget/savings mutations.
- Updated `docs/architecture/UI_API_MATRIX.md` with the implemented budget CRUD/progress and savings goal/contribution contract status, including deferred summary/setup endpoints that remain later work.
- No endpoint behavior, migrations, environment variables, frontend integration, report summaries, budget setup templates, or later milestone modules were added in phase 04.4.

### Phase 05.1 report contract inventory

- Added `server/app/modules/reports/` with Pydantic query and response schemas for dashboard reports, monthly analytics summaries, cash-flow buckets, and spending-by-category breakdowns.
- Report query contracts validate dashboard period/type enums, `month=YYYY-MM`, timezone-aware UTC-normalized date ranges, and ordered half-open report ranges.
- Report response contracts define decimal-string money and percent fields, UTC range metadata, zero-fillable chart buckets, category breakdown rows, monthly top-expense rows, and monthly trend card data.
- Updated `docs/architecture/UI_API_MATRIX.md` to reduce earlier loose report planning to four documented endpoints: dashboard, monthly summary, cash-flow, and spending-by-category. Top-expense and monthly-trend cards are intentionally included in monthly summary until the UI needs independent pagination or filtering.
- Updated `docs/architecture/SYSTEM_DESIGN.md` with report endpoint contracts, UTC half-open date-range semantics, Sunday-start dashboard week behavior, interval grouping rules, empty-period behavior, and decimal serialization expectations.
- Added `server/tests/test_report_contracts.py` covering report query validation, UTC normalization, decimal-string schema contracts, and zero bucket serialization.
- No report routes, SQL aggregation, endpoint behavior, migrations, environment variables, frontend integration, query-plan work, or later analytics implementation was added in phase 05.1.

### Phase 05.2 dashboard summary inventory

- Added `server/app/modules/reports/repositories.py`, `server/app/modules/reports/services.py`, and `server/app/modules/reports/router.py` for the first implemented report endpoint.
- Mounted the reports router from `server/app/api/v1/router.py`.
- Implemented authenticated `GET /api/v1/reports/dashboard` with `period=week|month|year`, `type=income|expense`, and optional `as_of=YYYY-MM-DD`.
- Dashboard reports compute active-account available balance from non-archived account opening balances plus non-voided source rows on non-archived accounts. Income and transfer credits increase balance; expenses and transfer debits decrease balance.
- Dashboard period totals compute selected-period income, expense, and net flow from non-voided transaction source rows using UTC half-open period boundaries.
- Dashboard chart buckets are deterministic and zero-filled: week returns seven Sunday-start daily buckets with weekday labels, month returns one daily bucket for each UTC day in the month, and year returns twelve calendar-month buckets.
- Recent dashboard transactions continue to use the existing `GET /api/v1/transactions?limit=6` endpoint rather than duplicating recent rows inside the report payload.
- Added `server/tests/test_dashboard_reports.py` covering empty-state determinism, Decimal aggregation, active-account balance behavior, transfer neutrality, void exclusion, period boundary behavior, cross-user isolation, year buckets, and bearer auth.
- No migrations, environment variables, frontend integration, monthly summary endpoint, cash-flow endpoint, spending-by-category endpoint, or query-plan optimization was added in phase 05.2.

### Phase 05.3 trends and breakdowns inventory

- Extended `server/app/modules/reports/repositories.py`, `server/app/modules/reports/services.py`, and `server/app/modules/reports/router.py` to implement the remaining chart-oriented analytics endpoints from the phase 05.1 contracts.
- Implemented authenticated `GET /api/v1/reports/monthly-summary` with `month=YYYY-MM`. It returns selected-month income, expense, net flow, savings contribution total, savings month-over-month percent versus prior-month contributions, active savings goal count, aggregate budget usage, bounded top-expense category cards, average daily spending, most-expensive day, and budget adherence percent.
- Implemented authenticated `GET /api/v1/reports/cash-flow` with `date_from`, `date_to`, and `interval=day|week|month`. It returns deterministic zero-filled income, expense, and net-flow buckets using UTC-normalized half-open report ranges.
- Implemented authenticated `GET /api/v1/reports/spending-by-category` with `date_from` and `date_to`. It returns expense category slices with category id/name/icon, amount, total amount, and percent values.
- Report analytics exclude voided transactions, preserve cross-user isolation, normalize timezone-aware query ranges to UTC, and quantize derived report percentages/averages to the report decimal contract.
- Added `server/tests/test_report_analytics.py` covering empty analytics shapes, source-record aggregation, period boundaries, timezone normalization, Decimal values, budget/savings summary fields, day/week/month cash-flow grouping, spending category percents, cross-user isolation, and bearer auth.
- No migrations, environment variables, frontend integration, query-plan optimization, report pagination, or materialized views were added in phase 05.3.

### Phase 05.4 query performance inventory

- Reviewed dashboard and analytics report query shapes for period income/expense totals, cash-flow buckets, spending-by-category breakdowns, monthly savings contributions, and active budget month lookups.
- Added a covering partial transaction index `ix_transactions_reports_active_user_at` on `(user_id, transaction_at)` for non-voided report windows, including `type`, `category_id`, `account_id`, and `amount`.
- Added `ix_savings_contributions_reports_user_contributed_at` on `(user_id, contributed_at)` with included `amount` so monthly savings totals can use a user/date path without a `goal_id` predicate.
- Added a partial budget report index `ix_budgets_reports_active_user_period` on `(user_id, period_start, period_end)` for active budgets with included `category_id` and `limit_amount`.
- Captured disposable PostgreSQL `EXPLAIN (ANALYZE, BUFFERS)` plans. The transaction period total changed to an index-only scan on `ix_transactions_reports_active_user_at`; savings contribution totals changed to an index-only scan on `ix_savings_contributions_reports_user_contributed_at`; larger representative budget data used `ix_budgets_reports_active_user_period` for the month-overlap lookup.
- Spending-by-category still preferred the existing transaction user/date index on the representative seed, so no category-specific report index or materialized view was added.
- Updated `docs/architecture/SYSTEM_DESIGN.md` with report query-plan and index notes.
- No endpoint behavior, environment variables, frontend integration, report pagination, durable jobs, or later analytics hardening work was added in phase 05.4.

### Phase 05.5 analytics correctness and contract inventory

- Added a multi-account, multi-category analytics integration fixture covering separate bank/card accounts, current-month and adjacent-period transactions, negative savings month-over-month percent, global budget usage, over-budget category percentage, top-expense ordering, cash-flow day buckets, spending chart category icons, and cross-user isolation.
- Verified analytics response shapes for monthly summary top expenses/trends, cash-flow buckets, and spending-by-category items against the UI/API matrix expectations.
- Added report OpenAPI contract coverage for the four implemented report paths, bearer security, dashboard period/type enums, cash-flow interval enum, response schema references, nested chart response fields, and decimal-string money/percent schemas.
- Reused the existing deterministic empty-state, UTC boundary, Decimal, grouping, and user-isolation coverage from phases 05.2 and 05.3.
- No endpoint behavior, migrations, environment variables, frontend integration, query-plan changes, report pagination, or later milestone behavior was added in phase 05.5.

### Phase 05.V analytics verification inventory

- Verified the milestone 05 endpoint set remains limited to authenticated report reads for dashboard, monthly summary, cash-flow, and spending-by-category analytics.
- Verified report endpoint contracts are recorded in `docs/architecture/UI_API_MATRIX.md` and `docs/architecture/SYSTEM_DESIGN.md`.
- Verified query-plan notes are recorded in `docs/architecture/SYSTEM_DESIGN.md` and project state, including the three report indexes and the decision not to add MVP materialized views.
- Ran the complete server quality suite, full pytest suite, and Alembic upgrade to head against disposable PostgreSQL.
- No source endpoint behavior, migrations, environment variables, frontend integration, or milestone 06 worker behavior was added in phase 05.V.

### Phase 06.1 recurring and outbox schema inventory

- Added `server/app/modules/recurring/` with a `RecurringRule` SQLAlchemy model for user-owned recurring income and expense transaction templates.
- Recurring rules store owned account/category references, positive `NUMERIC(18,4)` amount, currency, optional description, `daily|weekly|monthly|yearly` frequency, positive interval count, timezone, start/end bounds, next/last run metadata, `last_run_key`, run count, status, pause/archive timestamps, and worker lock fields.
- Added `server/app/modules/outbox/` with an `OutboxEvent` SQLAlchemy model for durable side-effect work.
- Outbox events store event type, optional user and aggregate references, JSONB payload, unique event idempotency key, status, attempts/max attempts, available/processed timestamps, error metadata, and worker lock fields.
- Added Alembic metadata imports and migration `202606210601_add_recurring_outbox_schema.py` for `recurring_rules` and `outbox_events`.
- Added schema and migration tests in `server/tests/test_recurring_schema.py`, covering model columns, constraints, indexes, ownership foreign keys, worker due index, outbox idempotency uniqueness, and migration up/down/up behavior.
- Updated `docs/architecture/SYSTEM_DESIGN.md` with supported recurrence rules and intentional MVP limitations. No recurring APIs, scheduling calculation, worker entrypoint, retry logic, or endpoint behavior was added in phase 06.1.

### Phase 06.2 recurring schedule rule inventory

- Added recurring-rule API schemas, cursor pagination, deterministic schedule helpers, repository, service, and router under `server/app/modules/recurring/`.
- Mounted the recurring router from `server/app/api/v1/router.py`.
- Implemented authenticated `POST /api/v1/recurring-rules`, `GET /api/v1/recurring-rules`, `GET /api/v1/recurring-rules/{rule_id}`, `PATCH /api/v1/recurring-rules/{rule_id}`, `POST /api/v1/recurring-rules/{rule_id}/pause`, `POST /api/v1/recurring-rules/{rule_id}/resume`, and `DELETE /api/v1/recurring-rules/{rule_id}`.
- Recurring rule create/update validates positive Decimal string amounts, rejects JSON float amounts, validates IANA timezones, requires timezone-aware start/end timestamps, validates end-after-start bounds, and enforces owned active account/category references whose category kind matches `income` or `expense`.
- Recurring list uses cursor pagination and `status=all|active|paused|archived`; default `all` excludes archived rules. Archive is a safe state change to `status='archived'` with `archived_at`.
- Pause and resume preserve ownership boundaries; archived rules cannot be updated, paused, or resumed. Resume recalculates `next_run_at` deterministically from the rule schedule and current UTC time.
- Schedule helpers compute daily, weekly, monthly, and yearly recurrences from `start_at`, `frequency`, `interval_count`, and `timezone`, normalize API timestamps to UTC, preserve local wall-clock time, and clamp month-end/yearly leap-day dates when the target month is shorter.
- Added `server/tests/test_recurring_rules.py` for CRUD, pagination, pause/resume/archive behavior, ownership, invalid references, invalid cursors, OpenAPI exposure, UTC normalization, timezone validation, month-end behavior, leap-year behavior, and supported interval calculation.
- Updated `docs/architecture/SYSTEM_DESIGN.md` and `docs/architecture/UI_API_MATRIX.md` with implemented recurring-rule API and schedule semantics. No worker process, due transaction creation, outbox processing, retry handling, idempotent due-run execution, migrations, or frontend integration was added in phase 06.2.

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

### Phase 03.6 finance contract matrix update

- `docs/architecture/UI_API_MATRIX.md` now records the implemented finance API contract status for accounts, categories, transactions, transfers, decimal string money fields, and idempotent create headers.
- The transaction list matrix now maps UI duration/date filters to backend `date_from`/`date_to` range parameters and records the implemented transaction type enum values.
- The transaction create matrix now records that `POST /api/v1/transactions` should use `Idempotency-Key` and decimal string money values.
- The category icon matrix now records that `GET /api/v1/categories` returns `icon_key` and server-side category CRUD exists, while frontend category management remains later integration work.

### Phase 04.4 budget and savings contract matrix update

- `docs/architecture/UI_API_MATRIX.md` now records implemented budget CRUD/progress endpoints, filters, archive visibility, UTC half-open period behavior, and decimal string progress fields.
- `docs/architecture/UI_API_MATRIX.md` now records implemented savings goal CRUD/archive endpoints, contribution create/list endpoints, status filters, over-target completion behavior, completed/archived contribution rejection, and decimal string progress fields.
- Budget summary/setup endpoints and savings summary endpoints remain explicitly deferred for later report or frontend integration work.

### Phase 05.1 report contract matrix update

- `docs/architecture/UI_API_MATRIX.md` now records documented report contracts for `GET /api/v1/reports/dashboard`, `GET /api/v1/reports/monthly-summary`, `GET /api/v1/reports/cash-flow`, and `GET /api/v1/reports/spending-by-category`.
- Dashboard report contracts cover available balance, selected-period income/expense/net-flow totals, RootChart week/month/year buckets, and reuse of the existing transaction list endpoint for recent transactions.
- Analytics report contracts cover monthly summary cards, active savings count, budget usage, top-expense cards, monthly trend cards, income-vs-expense cash-flow buckets, and spending-by-category pie slices.
- Report contracts define UTC half-open date ranges, `YYYY-MM` month expansion, Sunday-start dashboard weeks, deterministic `day|week|month` grouping, zero-filled empty buckets, empty category/top-expense arrays, and decimal-string money/percent serialization.

### Phase 05.2 dashboard summary matrix update

- `docs/architecture/UI_API_MATRIX.md` now records `GET /api/v1/reports/dashboard` as implemented.
- Dashboard available balance is documented as active-account balance over non-archived accounts and non-voided source rows on non-archived accounts.
- The dashboard recent-transactions surface remains mapped to the existing `GET /api/v1/transactions?limit=6` list endpoint.
- Monthly summary, cash-flow, and spending-by-category report endpoints remain documented but not yet implemented.

### Phase 05.3 analytics matrix update

- `docs/architecture/UI_API_MATRIX.md` now records `GET /api/v1/reports/monthly-summary`, `GET /api/v1/reports/cash-flow`, and `GET /api/v1/reports/spending-by-category` as implemented.
- The analytics screen matrix now maps summary cards, income-vs-expense chart buckets, spending pie slices, top expenses, and monthly trend cards to implemented report endpoints.
- `docs/architecture/SYSTEM_DESIGN.md` now records that phase 05.3 implements the chart-oriented analytics report endpoints and clarifies selected-month savings contribution and month-over-month semantics.

### Phase 05.4 query performance update

- `docs/architecture/SYSTEM_DESIGN.md` now records the report query-plan review, the three report indexes, and the decision not to add materialized views for MVP report queries.

### Phase 05.5 analytics contract update

- Report OpenAPI contracts were verified for all implemented dashboard and analytics report endpoints, including bearer security, query parameters, response schema references, enum values, and decimal-string chart fields.

### Phase 05.V analytics verification update

- Milestone 05 verification confirmed the UI/API matrix and system design continue to record the implemented dashboard, monthly summary, cash-flow, and spending-by-category report contracts and the report query-plan notes.

### Phase 06.2 recurring rule matrix update

- `docs/architecture/UI_API_MATRIX.md` now records implemented recurring-rule CRUD, list, pause, resume, and archive endpoints for the transaction form's recurring template behavior.
- Recurring templates are limited to income and expense rules with owned active account/category references, decimal-string amount fields, timezone-aware start/end timestamps, and `daily|weekly|monthly|yearly` frequencies with positive interval counts.

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

Phase 01.2 added `GET /api/v1/health/live`, a database-free liveness endpoint returning status, service, environment, and API version. No domain endpoints were added.

Phase 01.3 added no endpoints. Database-aware readiness begins no earlier than phase 01.4.

Phase 01.4 added `GET /api/v1/health/ready`, a database-aware readiness endpoint returning `{"status": "ok", "database": "ready"}` when PostgreSQL connectivity succeeds and the standard error envelope with HTTP 503 when it does not.

Phase 01.V added no endpoints.

Phase 02.1 added no endpoints. Registration and login endpoints begin no earlier than phase 02.2.

Phase 02.2 added `POST /api/v1/auth/register`, which creates an active user with normalized email and an Argon2 password hash, returning only safe user fields.

Phase 02.3 added `POST /api/v1/auth/login`, which verifies credentials and returns a short-lived bearer access token, and `GET /api/v1/users/me`, which returns the current authenticated user from a valid access token.

Phase 02.4 changed `POST /api/v1/auth/login` to also return `refresh_token`, added `POST /api/v1/auth/refresh` for refresh-token rotation and new access-token issuance, and added `POST /api/v1/auth/logout` for refresh-token revocation.

Phase 02.5 added no endpoints. It documented the current auth OpenAPI contract expectations and kept the implemented auth endpoint set unchanged.

Phase 02.V added no endpoints. Verification confirmed the milestone 02 implemented endpoint set remains `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, and `GET /api/v1/users/me`.

Phase 03.1 added no endpoints. It added only finance domain models, database constraints, migration, and schema tests. Accounts, categories, transactions, transfers, filters, pagination, and idempotency API behavior begin no earlier than later phase 03 executions.

Phase 03.2 added account management endpoints: `POST /api/v1/accounts`, `GET /api/v1/accounts`, `GET /api/v1/accounts/{account_id}`, `PATCH /api/v1/accounts/{account_id}`, and `DELETE /api/v1/accounts/{account_id}`. Account list returns `items`, `next_cursor`, and `has_more`; delete performs safe archive instead of hard delete.

Phase 03.2 added category management endpoints: `POST /api/v1/categories`, `GET /api/v1/categories`, `PATCH /api/v1/categories/{category_id}`, and `DELETE /api/v1/categories/{category_id}`. Category list supports `kind=income|expense`, returns `items`, `next_cursor`, and `has_more`; delete performs safe archive instead of hard delete.

Phase 03.3 added income/expense transaction endpoints: `POST /api/v1/transactions`, `GET /api/v1/transactions`, `GET /api/v1/transactions/{transaction_id}`, `PATCH /api/v1/transactions/{transaction_id}`, and `DELETE /api/v1/transactions/{transaction_id}`. Transaction create/update validates owned active account/category references, positive Decimal amounts, category kind matching, and timezone-aware timestamps. Delete voids the transaction instead of hard deleting. List returns the current user's non-voided income/expense rows.

Phase 03.4 added transfer endpoints: `POST /api/v1/transactions/transfers` and `GET /api/v1/transactions/transfers/{transfer_id}`. Transfer create writes linked debit and credit source rows plus a transfer link atomically, validates owned active accounts, rejects same-account and cross-currency transfers, and returns an auditable transfer representation.

Phase 03.5 changed `GET /api/v1/transactions` to support cursor pagination and filters: `limit`, `cursor`, `date_from`, `date_to`, `account_id`, `category_id`, `type`, and `search`. The endpoint now returns `items`, `next_cursor`, and `has_more` and includes all non-voided transaction source rows, including transfer debit and transfer credit rows.

Phase 03.5 changed `POST /api/v1/transactions` and `POST /api/v1/transactions/transfers` to accept an optional `Idempotency-Key` header. Repeated matching requests return the stored original response; mismatched reuse returns HTTP 409.

Phase 03.6 added no endpoints. It changed the OpenAPI contract for finance money request fields to decimal strings, verified transaction list pagination/filter shape, and hardened idempotent transaction/transfer replay behavior so stored successful responses are returned before archived account/category state is rechecked.

Phase 04.1 added no endpoints. It added only budget domain persistence, database constraints, migration, and schema tests. Budget CRUD and progress calculations begin no earlier than phase 04.2.

Phase 04.2 added budget management endpoints: `POST /api/v1/budgets`, `GET /api/v1/budgets`, `GET /api/v1/budgets/{budget_id}`, `PATCH /api/v1/budgets/{budget_id}`, and `DELETE /api/v1/budgets/{budget_id}`. Budget list supports `limit`, `cursor`, `include_archived`, `category_id`, and `month=YYYY-MM`. Responses include computed progress from expense source records; delete performs safe archive instead of hard delete.

Phase 04.3 added savings goal endpoints: `POST /api/v1/savings-goals`, `GET /api/v1/savings-goals`, `GET /api/v1/savings-goals/{goal_id}`, `PATCH /api/v1/savings-goals/{goal_id}`, and `DELETE /api/v1/savings-goals/{goal_id}`. Goal list supports `limit`, `cursor`, and `status=all|active|completed|archived`; delete performs safe archive instead of hard delete. Goal responses include computed progress from contribution source records.

Phase 04.3 added savings contribution endpoints: `POST /api/v1/savings-goals/{goal_id}/contributions` and `GET /api/v1/savings-goals/{goal_id}/contributions`. Contribution creates append auditable source records for active goals and return HTTP 409 when the goal is already completed or archived.

Phase 04.4 added no endpoints. It hardened budget/savings edge-case and OpenAPI contract coverage and updated the UI/API matrix endpoint status.

Phase 05.1 added no implemented endpoints. It documented the future report contracts for `GET /api/v1/reports/dashboard`, `GET /api/v1/reports/monthly-summary`, `GET /api/v1/reports/cash-flow`, and `GET /api/v1/reports/spending-by-category`.

Phase 05.2 added `GET /api/v1/reports/dashboard`, an authenticated dashboard report endpoint supporting `period=week|month|year`, `type=income|expense`, and optional `as_of=YYYY-MM-DD`. It returns active-account available balance, selected-period income, expense, net flow, UTC range metadata, and zero-filled chart buckets. Recent transactions remain served by `GET /api/v1/transactions?limit=6`.

Phase 05.3 added chart-oriented analytics endpoints: `GET /api/v1/reports/monthly-summary?month=YYYY-MM`, `GET /api/v1/reports/cash-flow?date_from=<ISO datetime>&date_to=<ISO datetime>&interval=day|week|month`, and `GET /api/v1/reports/spending-by-category?date_from=<ISO datetime>&date_to=<ISO datetime>`. These authenticated endpoints return selected-month summary cards and trends, deterministic cash-flow buckets, and spending category slices from existing transaction, budget, and savings source records.

Phase 05.4 added no endpoints. It added only report query-plan indexes and documentation for the existing report endpoints.

Phase 05.5 added no endpoints. It only expanded analytics correctness tests and report OpenAPI contract coverage for the existing report endpoints.

Phase 05.V added no endpoints. Verification confirmed the milestone 05 endpoint set remains `GET /api/v1/reports/dashboard`, `GET /api/v1/reports/monthly-summary`, `GET /api/v1/reports/cash-flow`, and `GET /api/v1/reports/spending-by-category`.

Phase 06.1 added no endpoints. It added only recurring rule and outbox persistence for later recurring-rule APIs and worker execution.

Phase 06.2 added recurring rule endpoints: `POST /api/v1/recurring-rules`, `GET /api/v1/recurring-rules`, `GET /api/v1/recurring-rules/{rule_id}`, `PATCH /api/v1/recurring-rules/{rule_id}`, `POST /api/v1/recurring-rules/{rule_id}/pause`, `POST /api/v1/recurring-rules/{rule_id}/resume`, and `DELETE /api/v1/recurring-rules/{rule_id}`. List supports `status=all|active|paused|archived`, `cursor`, and `limit`; create/update validates owned active references and deterministic schedule fields.

## 10. Database migrations

Append migrations as they are created and verified.

Phase 01.1 created no migrations and did not add database configuration.

Phase 01.2 created no migrations and did not add database configuration.

Phase 01.3 created no migrations.

Phase 01.4 created initial empty Alembic baseline migration `202606120114_initial_empty_baseline.py`. Upgrade/downgrade/upgrade smoke checks passed against a disposable PostgreSQL database.

Phase 01.V created no migrations. Verification reapplied the existing `202606120114_initial_empty_baseline.py` migration with upgrade/downgrade/upgrade smoke checks against a disposable PostgreSQL database.

Phase 02.1 created Alembic migration `202606150201_add_user_refresh_session_schema.py` for `users` and `refresh_sessions`. Upgrade/downgrade -1/upgrade smoke checks passed against a disposable PostgreSQL database.

Phase 02.2 created no migrations. It uses the existing `users` table from migration `202606150201`.

Phase 02.3 created no migrations.

Phase 02.4 created no migrations. It uses the existing `refresh_sessions` table from migration `202606150201`.

Phase 02.5 created no migrations.

Phase 02.V created no migrations. Verification reapplied the existing auth schema migration path with `alembic upgrade head`, `alembic downgrade -1`, and `alembic upgrade head` against a disposable PostgreSQL database.

Phase 03.1 created Alembic migration `202606150301_add_finance_domain_schema.py` for `accounts`, `categories`, `transactions`, `transfer_links`, and `idempotency_records`. Upgrade/downgrade -1/upgrade smoke checks passed against a disposable PostgreSQL database.

Phase 03.2 created no migrations. It uses the existing finance schema from migration `202606150301`.

Phase 03.3 created no migrations. It uses the existing finance schema from migration `202606150301`.

Phase 03.4 created no migrations. It uses the existing finance schema from migration `202606150301`.

Phase 03.5 created no migrations. It uses the existing `idempotency_records` table and finance schema from migration `202606150301`.

Phase 03.6 created no migrations. It uses the existing `idempotency_records` table and finance schema from migration `202606150301`.

Phase 04.1 created Alembic migration `202606190401_add_budget_schema.py` for `budgets` and the PostgreSQL `btree_gist` extension needed by the active same-scope no-overlap exclusion constraint. Upgrade/downgrade -1/upgrade smoke checks passed against a disposable PostgreSQL database.

Phase 04.2 created no migrations. It uses the existing budget schema from migration `202606190401`.

Phase 04.3 created Alembic migration `202606190403_add_savings_goals_schema.py` for `savings_goals` and `savings_contributions`. Upgrade/downgrade -1/upgrade smoke checks passed against a disposable PostgreSQL database.

Phase 04.4 created no migrations. It uses the existing budget schema from migration `202606190401` and savings schema from migration `202606190403`.

Phase 05.1 created no migrations. It defined report contracts only and uses existing finance, budget, and savings source-record schemas for later implementation phases.

Phase 05.2 created no migrations. The dashboard report reads existing account and transaction source-record schemas.

Phase 05.3 created no migrations. The analytics report endpoints read existing transaction, category, budget, savings goal, and savings contribution source-record schemas.

Phase 05.4 created Alembic migration `202606210504_add_report_query_indexes.py` for report query indexes on non-voided transaction report windows, savings contribution user/date totals, and active budget period overlap lookups. Upgrade/downgrade -1/upgrade smoke checks passed against a disposable PostgreSQL database.

Phase 05.5 created no migrations. It uses the existing report indexes from migration `202606210504` and existing finance, budget, and savings source-record schemas.

Phase 05.V created no migrations. Verification ran `alembic upgrade head` against disposable PostgreSQL through migration `202606210504_add_report_query_indexes.py`.

Phase 06.1 created Alembic migration `202606210601_add_recurring_outbox_schema.py` for `recurring_rules` and `outbox_events`. Upgrade/downgrade -1/upgrade smoke checks passed against a disposable PostgreSQL database.

Phase 06.2 created no migrations. It uses the existing recurring and outbox schema from migration `202606210601`.

## 11. Environment variables

Append required variables with descriptions. Never store secret values.

### Phase 01.1 scaffold variables

Committed template: `server/.env.example`.

| Variable | Description |
|---|---|
| `APP_NAME` | Human-readable API name for local configuration. |
| `APP_ENV` | Runtime environment label; defaults to local in the template. |
| `DEBUG` | Local debug flag placeholder for later typed settings. |
| `API_V1_PREFIX` | Versioned API mount prefix; defaults to `/api/v1`. |
| `CORS_ORIGINS` | JSON array of allowed browser origins for CORS. |
| `DATABASE_URL` | SQLAlchemy async PostgreSQL URL for the application database. Default local template is `postgresql+asyncpg://pfm_app@localhost:5432/pfm_app`. |
| `DATABASE_ECHO` | Enables SQLAlchemy SQL echo logging for local diagnostics. |
| `DATABASE_POOL_SIZE` | Base SQLAlchemy connection pool size. |
| `DATABASE_MAX_OVERFLOW` | Maximum SQLAlchemy overflow connections beyond the base pool. |

### Phase 02.2 auth dependencies

- No new environment variables were added. `pwdlib[argon2]` is now a runtime Python dependency for local and deployed password hashing.

### Phase 02.3 access-token variables

| Variable | Description |
|---|---|
| `ACCESS_TOKEN_SECRET_KEY` | Secret key used to sign and verify access JWTs. `.env.example` contains only a placeholder and real deployments must override it. |
| `ACCESS_TOKEN_ALGORITHM` | JWT signing algorithm; defaults to `HS256`. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Short-lived access-token expiry in minutes; defaults to `15`. |

### Phase 02.4 refresh-token variables

| Variable | Description |
|---|---|
| `REFRESH_TOKEN_SECRET_KEY` | Secret key used to HMAC-hash opaque refresh tokens before persistence. `.env.example` contains only a placeholder and real deployments must override it. |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh-token lifetime in days; defaults to `30`. |

### Phase 03.2 finance API variables

- No new environment variables were added.

### Phase 03.3 transaction API variables

- No new environment variables were added.

### Phase 03.4 transfer API variables

- No new environment variables were added.

### Phase 03.5 transaction API variables

- No new environment variables were added.

### Phase 03.6 finance contract variables

- No new environment variables were added.

### Phase 04.1 budget schema variables

- No new environment variables were added.

### Phase 04.2 budget API variables

- No new environment variables were added.

### Phase 04.3 savings API variables

- No new environment variables were added.

### Phase 04.4 budget and savings hardening variables

- No new environment variables were added.

### Phase 05.1 report contract variables

- No new environment variables were added.

### Phase 05.2 dashboard summary variables

- No new environment variables were added.

### Phase 05.3 trends and breakdowns variables

- No new environment variables were added.

### Phase 05.4 query performance variables

- No new environment variables were added.

### Phase 05.5 analytics test variables

- No new environment variables were added.

### Phase 05.V analytics verification variables

- No new environment variables were added.

### Phase 06.1 recurring and outbox schema variables

- No new environment variables were added.

### Phase 06.2 recurring schedule rule variables

- No new environment variables were added.

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

### Phase 01.2 FastAPI app configuration commands

| Command | Result | Purpose / notes |
|---|---|---|
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check .` | PASS after repair | Required lint check. Initial run flagged FastAPI dependency injection default syntax; repaired with `Annotated`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check .` | PASS after repair | Required format check. Initial run required reformatting `app/core/logging.py`; repaired with `ruff format .`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app` | PASS after repair | Required type check. Initial run flagged narrowed exception handler signatures; repaired with typed casts at handler registration. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q` | PASS after repair | Required test suite. Initial run showed test app settings were not used by health dependency; repaired by overriding `get_settings` in `create_app`. Final result: 8 passed, 1 Starlette/httpx deprecation warning from dependency packages. |

### Phase 01.3 PostgreSQL persistence commands

| Command | Result | Purpose / notes |
|---|---|---|
| `psql --version` | PASS | Confirmed PostgreSQL client tools are installed: PostgreSQL 18.1 via Homebrew. |
| `pg_isready` | FAIL / no local server | Confirmed no default PostgreSQL server is listening on `/tmp:5432`; phase tests therefore use a disposable server. |
| `createdb --version` | PASS | Confirmed database creation tooling is installed. |
| `which initdb` | PASS | Confirmed local disposable PostgreSQL cluster initialization binary exists. |
| `which pg_ctl` | PASS | Confirmed local disposable PostgreSQL server control binary exists. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check .` | PASS after repair | Required lint check. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check .` | PASS after repair | Required format check. Initial run required reformatting `tests/test_database.py`; repaired with `ruff format .`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app` | PASS after repair | Required type check. Initial run flagged an `Any` return from the SQLAlchemy scalar helper; repaired by returning `bool(...)`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q` | FAIL in sandbox, PASS with approval | Required test suite. Sandboxed run could not bind `127.0.0.1` for disposable PostgreSQL (`PermissionError: Operation not permitted`). Approved rerun started a temp PostgreSQL cluster and passed: 13 passed, 1 Starlette/httpx dependency warning. |

### Phase 01.4 Alembic and health commands

| Command | Result | Purpose / notes |
|---|---|---|
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check .` | PASS after repair | Required lint check. Initial run flagged import ordering, one long line, and an unused import; repaired with small edits and Ruff fixes. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check .` | PASS after repair | Required format check. Initial run required reformatting `app/api/v1/health.py`; repaired with `ruff format .`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app` | PASS | Required type check. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q` | FAIL in sandbox, PASS with approval | Required test suite. Sandboxed run could not bind `127.0.0.1` for disposable PostgreSQL. Approved rerun passed: 17 passed, 1 Starlette/httpx dependency warning. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" DATABASE_URL="postgresql+asyncpg://pfm_test@127.0.0.1:51228/postgres" alembic upgrade head` | FAIL in sandbox, PASS with approval | Required migration smoke check against disposable PostgreSQL. Sandboxed run could not connect to localhost; approved rerun upgraded to `202606120114`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" DATABASE_URL="postgresql+asyncpg://pfm_test@127.0.0.1:51228/postgres" alembic downgrade base` | PASS with approval | Required migration smoke check against disposable PostgreSQL. Downgraded from `202606120114` to base. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" DATABASE_URL="postgresql+asyncpg://pfm_test@127.0.0.1:51228/postgres" alembic upgrade head` | PASS with approval | Required final migration smoke check against disposable PostgreSQL. Upgraded to `202606120114` again. |

### Phase 01.V foundation verification commands

| Command | Result | Purpose / notes |
|---|---|---|
| `git status --short --branch` | PASS | Confirmed clean `fastapi-foundation` worktree before verification edits. |
| `git diff --name-status c63cb4b..HEAD` | PASS | Reviewed milestone branch scope. Server changes were limited to foundation files; no later domain modules were added. |
| `find server/app/modules -maxdepth 4 -type f -print` | PASS | Confirmed `server/app/modules/` contains only `__init__.py` plus ignored bytecode. |
| `git check-ignore -v server/.env .env server/.env.example` | PASS | Confirmed `.env` and `server/.env` are ignored, while `server/.env.example` is not ignored. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check .` | PASS | Full foundation lint check passed. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check .` | PASS | Full foundation format check passed. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app` | PASS | Full foundation type check passed. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q` | FAIL in sandbox, PASS with approval | Sandboxed run could not bind `127.0.0.1` for disposable PostgreSQL. Approved rerun passed: 17 passed, 1 Starlette/httpx dependency warning. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" DATABASE_URL="postgresql+asyncpg://pfm_test@127.0.0.1:49728/postgres" alembic upgrade head` | PASS with approval | Required migration smoke check against disposable PostgreSQL. Upgraded to `202606120114`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" DATABASE_URL="postgresql+asyncpg://pfm_test@127.0.0.1:49728/postgres" alembic downgrade base` | PASS with approval | Required migration smoke check against disposable PostgreSQL. Downgraded from `202606120114` to base. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" DATABASE_URL="postgresql+asyncpg://pfm_test@127.0.0.1:49728/postgres" alembic upgrade head` | PASS with approval | Required final migration smoke check against disposable PostgreSQL. Upgraded to `202606120114` again. |

### Phase 02.1 user and session schema commands

| Command | Result | Purpose / notes |
|---|---|---|
| `git status --short --branch` | PASS | Confirmed clean `fastapi-foundation` worktree before creating milestone branch; later observed unrelated `RUN_COMMANDS.md` formatting changes and did not stage them. |
| `git switch -c auth-security` | PASS with approval | Created the required milestone 02 branch from verified milestone 01. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check .` | PASS after repair | Required lint check. Initial run flagged import ordering in the new migration; repaired with `ruff check . --fix`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check .` | PASS | Required format check. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app` | PASS | Required type check. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q` | FAIL in sandbox, PASS with approval | Required test suite. Sandboxed run could not bind `127.0.0.1` for disposable PostgreSQL. Approved rerun passed: 21 passed, 1 Starlette/httpx dependency warning. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" DATABASE_URL="postgresql+asyncpg://pfm_test@127.0.0.1:49963/postgres" alembic upgrade head` | PASS with approval | Required migration smoke check against disposable PostgreSQL. Upgraded to `202606150201`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" DATABASE_URL="postgresql+asyncpg://pfm_test@127.0.0.1:49963/postgres" alembic downgrade -1` | PASS with approval | Required migration smoke check against disposable PostgreSQL. Downgraded from `202606150201` to `202606120114`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" DATABASE_URL="postgresql+asyncpg://pfm_test@127.0.0.1:49963/postgres" alembic upgrade head` | PASS with approval | Required final migration smoke check against disposable PostgreSQL. Upgraded to `202606150201` again. |

### Phase 02.2 registration and password hashing commands

| Command | Result | Purpose / notes |
|---|---|---|
| `git status --short --branch` | PASS | Confirmed active branch `auth-security` before phase edits. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" python -m pip install -e '.[dev,test]'` | FAIL in sandbox, PASS with approval | Required after adding `pwdlib[argon2]`. Sandboxed run could not resolve PyPI; approved rerun installed `pwdlib 0.3.0` and Argon2 dependencies. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check .` | PASS after repair | Required lint check. Initial run flagged import ordering; repaired with `ruff check . --fix`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check .` | PASS | Required format check. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app` | PASS after repair | Required type check. Initial run flagged validation error sanitizer input typing; repaired with a `Sequence[Any]` signature. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests` | FAIL in sandbox, PASS with approval | Required test suite. Sandboxed run could not bind `127.0.0.1` for disposable PostgreSQL. Approved rerun passed: 26 passed, 1 Starlette/httpx dependency warning. |

### Phase 02.3 login and access token commands

| Command | Result | Purpose / notes |
|---|---|---|
| `git status --short --branch` | PASS | Confirmed active branch `auth-security` and clean worktree before phase edits. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" python -m pip install -e '.[dev,test]'` | FAIL in sandbox, PASS with approval | Required after adding `PyJWT`. Sandboxed run could not resolve PyPI; approved rerun installed `pyjwt 2.13.0`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check .` | PASS after repair | Required lint check. Initial run flagged formatting/import line length; repaired with `ruff format .`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check .` | PASS after repair | Required format check. Initial run required formatting `app/modules/auth/services.py` and `tests/test_login.py`; repaired with `ruff format .`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app` | PASS | Required type check. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests` | FAIL in sandbox, PASS with approval | Required test suite. Sandboxed run could not bind `127.0.0.1` for disposable PostgreSQL. Approved rerun passed: 32 passed, 1 Starlette/httpx dependency warning. |

### Phase 02.4 refresh rotation and logout commands

| Command | Result | Purpose / notes |
|---|---|---|
| `git status --short --branch` | PASS | Confirmed active branch `auth-security` and clean worktree before phase edits. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check .` | PASS after repair | Required lint check. Initial run flagged import ordering and test line wrapping; repaired with `ruff format .` and `ruff check . --fix`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check .` | PASS after repair | Required format check. Initial run required formatting `tests/test_refresh.py`; repaired with `ruff format .`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app` | PASS | Required type check. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests` | FAIL in sandbox, PASS with approval | Required test suite. Sandboxed run could not bind `127.0.0.1` for disposable PostgreSQL. Approved rerun passed: 38 passed, 1 Starlette/httpx dependency warning. |

### Phase 02.5 auth edge-case commands

| Command | Result | Purpose / notes |
|---|---|---|
| `git status --short --branch` | PASS | Confirmed active branch `auth-security` before phase edits. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests/test_login.py tests/test_refresh.py` | FAIL in sandbox, PASS after repair with approval | Focused auth regression run. Sandboxed run could not bind `127.0.0.1` for disposable PostgreSQL; first approved run found a TestClient 500-response harness issue; repaired and approved rerun passed: 18 passed, 1 Starlette/httpx dependency warning. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check .` | PASS after repair | Required lint check. Initial run flagged nested context managers and import ordering in tests; repaired manually and reran successfully. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check .` | PASS | Required format check. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app` | PASS | Required type check. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests` | FAIL in sandbox, PASS with approval | Required test suite. Sandboxed focused run proved localhost binding is blocked for disposable PostgreSQL; approved full suite passed: 44 passed, 1 Starlette/httpx dependency warning. |

### Phase 02.V authentication verification commands

| Command | Result | Purpose / notes |
|---|---|---|
| `git status --short --branch` | PASS | Confirmed active branch `auth-security` and clean worktree before verification edits. |
| `sed -n '1,220p' server/app/modules/auth/dependencies.py` | PASS | Inspected protected-route dependency behavior. |
| `sed -n '1,260p' server/app/modules/auth/router.py` | PASS | Inspected auth route surface and response schemas. |
| `sed -n '1,200p' server/app/modules/users/router.py` | PASS | Confirmed `/users/me` uses `CurrentUserDependency`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check .` | PASS | Required lint check. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check .` | PASS | Required format check. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app` | PASS | Required type check. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q` | PASS with approval | Required full test suite. Approved run was needed because the disposable PostgreSQL test fixture binds localhost. Result: 44 passed, 1 Starlette/httpx dependency warning. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" DATABASE_URL="postgresql+asyncpg://pfm_test@127.0.0.1:51007/postgres" alembic upgrade head` | PASS with approval | Required migration smoke check against disposable PostgreSQL. Upgraded through `202606120114` and `202606150201`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" DATABASE_URL="postgresql+asyncpg://pfm_test@127.0.0.1:51007/postgres" alembic downgrade -1` | PASS with approval | Required migration smoke check against disposable PostgreSQL. Downgraded from `202606150201` to `202606120114`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" DATABASE_URL="postgresql+asyncpg://pfm_test@127.0.0.1:51007/postgres" alembic upgrade head` | PASS with approval | Required final migration smoke check against disposable PostgreSQL. Upgraded from `202606120114` to `202606150201`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" python - <<'PY' ... create_app().openapi() ... PY` | PASS | Verified OpenAPI exposes the milestone auth routes and marks `/api/v1/users/me` with `HTTPBearer` security. |
| `git check-ignore -v .env server/.env server/.env.example` | PASS | Confirmed `.env` and `server/.env` are ignored and `server/.env.example` is not ignored. |
| `git grep -n -I -E 'BEGIN (RSA\|OPENSSH\|PRIVATE) KEY\|AKIA[0-9A-Z]{16}\|ghp_[A-Za-z0-9_]{20,}\|sk-[A-Za-z0-9]{20,}\|xox[baprs]-\|AIza[0-9A-Za-z_-]{20,}' -- . ':!client/package-lock.json' ':!server/uv.lock'` | PASS | No known private-key, cloud-key, GitHub-token, OpenAI-key, Google-key, or Slack-token patterns found in tracked files. |
| `git grep -n -I -E 'SECRET_KEY=\|TOKEN=.*[A-Za-z0-9]\|PASSWORD=.*[A-Za-z0-9]' -- server/.env.example server/tests server/app` | PASS | Found only `server/.env.example` placeholder secret-key values. |

### Phase 03.1 finance domain schema commands

| Command | Result | Purpose / notes |
|---|---|---|
| `git status --short --branch` | PASS | Confirmed clean `auth-security` worktree before creating milestone branch, then active `finance-core` branch before edits. |
| `git switch -c finance-core` | FAIL in sandbox, PASS with approval | Required milestone branch creation. Sandboxed run could not create `.git/refs/heads/finance-core.lock`; approved rerun created and switched to `finance-core`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check .` | PASS after repair | Required lint check. Initial run flagged line wrapping/import formatting in new finance files; repaired with `ruff format .`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check .` | PASS after repair | Required format check. Initial run reported five new files needed formatting; repaired with `ruff format .`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app` | PASS | Required type check. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q` | FAIL in sandbox, PASS after repair with approval | Required test suite. Sandboxed run could not bind `127.0.0.1` for disposable PostgreSQL. First approved run found an auth migration test still assuming the auth migration was the latest head; repaired the test to upgrade to revision `202606150201`. Final approved run passed: 51 passed, 1 Starlette/httpx dependency warning. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" DATABASE_URL="postgresql+asyncpg://pfm_test@127.0.0.1:56230/postgres" alembic upgrade head` | PASS with approval | Required migration smoke check against disposable PostgreSQL. Upgraded through `202606120114`, `202606150201`, and `202606150301`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" DATABASE_URL="postgresql+asyncpg://pfm_test@127.0.0.1:56230/postgres" alembic downgrade -1` | PASS with approval | Required migration smoke check against disposable PostgreSQL. Downgraded from `202606150301` to `202606150201`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" DATABASE_URL="postgresql+asyncpg://pfm_test@127.0.0.1:56230/postgres" alembic upgrade head` | PASS with approval | Required final migration smoke check against disposable PostgreSQL. Upgraded from `202606150201` to `202606150301`. |

### Phase 03.2 accounts and categories commands

| Command | Result | Purpose / notes |
|---|---|---|
| `git status --short --branch` | PASS | Confirmed active branch `finance-core` and clean worktree before phase edits. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check .` | PASS after repair | Required lint check. Initial run flagged line wrapping/import formatting in new account/category files; repaired with `ruff format .`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check .` | PASS after repair | Required format check. Initial run reported five files needed formatting; repaired with `ruff format .`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app` | PASS | Required type check. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests` | FAIL in sandbox, PASS after repair with approval | Required test suite. Sandboxed run could not bind `127.0.0.1` for disposable PostgreSQL. Approved runs found and repaired money scale expectation, server-managed timestamp refresh after commit, auth migration test isolation, and pre-validation currency normalization. Final approved run passed: 55 passed, 1 Starlette/httpx dependency warning. |

### Phase 03.3 income and expenses commands

| Command | Result | Purpose / notes |
|---|---|---|
| `git status --short --branch` | PASS | Confirmed active branch `finance-core` and clean worktree before phase edits. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check .` | PASS after repair | Required lint check. Initial run flagged formatting in new transaction files; repaired with Ruff formatting. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check .` | PASS | Required format check. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app` | PASS | Required type check. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests` | FAIL in sandbox, PASS with approval | Required test suite. Sandboxed run could not bind `127.0.0.1` for disposable PostgreSQL. Approved run passed: 58 passed, 1 Starlette/httpx dependency warning. |

### Phase 03.4 transfers and atomicity commands

| Command | Result | Purpose / notes |
|---|---|---|
| `git status --short --branch` | PASS | Confirmed active branch `finance-core` and clean worktree before phase edits. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check .` | PASS after repair | Required lint check. Initial run flagged import ordering and one long test line; repaired with Ruff fixes and a small manual wrap. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check .` | PASS after repair | Required format check. Initial run required formatting transaction repository and transaction tests; repaired with `ruff format .`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app` | PASS | Required type check. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests` | PASS after repair with approval | Required test suite. Approved disposable PostgreSQL run was needed for localhost binding. Initial approved runs found rollback-test issues in the new test code; final approved run passed: 61 passed, 1 Starlette/httpx dependency warning. |

### Phase 03.5 filters, pagination, and idempotency commands

| Command | Result | Purpose / notes |
|---|---|---|
| `git status --short --branch` | PASS | Confirmed active branch `finance-core` and clean worktree before phase edits. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check .` | PASS after repair | Required lint check. Initial run flagged import ordering in transaction repository, router, and service files; repaired with `ruff check . --fix`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check .` | PASS | Required format check. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app` | PASS | Required type check. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests` | PASS with approval | Required test suite. Approved disposable PostgreSQL run was needed for localhost binding. Final result: 65 passed, 1 Starlette/httpx dependency warning. |

### Phase 03.6 finance tests and contract review commands

| Command | Result | Purpose / notes |
|---|---|---|
| `git status --short --branch` | PASS | Confirmed active branch `finance-core` and clean worktree before phase edits. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests/test_finance_contracts.py` | PASS | Focused OpenAPI finance contract check passed: 3 passed. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check .` | PASS | Required lint check. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check .` | PASS | Required format check. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app` | PASS | Required type check. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests` | PASS with approval | Required test suite. Approved disposable PostgreSQL run was needed for localhost binding. Final result: 70 passed, 1 Starlette/httpx dependency warning. |

### Phase 04.1 budget schema and rules commands

| Command | Result | Purpose / notes |
|---|---|---|
| `git status --short --branch` | PASS | Confirmed clean `finance-core` worktree before creating milestone branch. |
| `git switch -c budgets-savings` | FAIL in sandbox, PASS with approval | Required milestone branch creation. Sandboxed run could not create `.git/refs/heads/budgets-savings.lock`; approved rerun created and switched to `budgets-savings`. |
| `server/.venv/bin/python -m pip install -e 'server[dev,test]'` | FAIL in sandbox, PASS with approval | Recreated the ignored local server virtualenv because phase test tools were not present. Sandboxed install could not resolve package registry DNS; approved install succeeded. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check .` | PASS after repair | Required lint check. Initial run flagged import ordering in the new budget model; repaired with `ruff check . --fix`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check .` | PASS after repair | Required format check. Initial runs flagged the new migration; repaired with `ruff format alembic/versions/202606190401_add_budget_schema.py`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app` | PASS | Required type check. Final result: no issues in 53 source files. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q` | FAIL in sandbox, PASS after repair with approval | Required test suite. Sandboxed run could not bind localhost for disposable PostgreSQL. Approved runs exposed and repaired expression-based exclusion constraint migration DDL, downgrade DDL, and a finance migration test that assumed finance remained head. Final result: 72 passed, 1 Starlette/httpx dependency warning. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" DATABASE_URL="postgresql+asyncpg://pfm_test@127.0.0.1:52888/postgres" alembic upgrade head` | FAIL in sandbox, PASS with approval | Required migration smoke check against disposable PostgreSQL. Sandboxed run could not connect to localhost; approved run upgraded through `202606190401`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" DATABASE_URL="postgresql+asyncpg://pfm_test@127.0.0.1:52888/postgres" alembic downgrade -1` | PASS with approval | Required migration smoke check against disposable PostgreSQL. Downgraded from `202606190401` to `202606150301`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" DATABASE_URL="postgresql+asyncpg://pfm_test@127.0.0.1:52888/postgres" alembic upgrade head` | PASS with approval | Required final migration smoke check against disposable PostgreSQL. Upgraded from `202606150301` to `202606190401`. |

### Phase 04.2 budget APIs and progress commands

| Command | Result | Purpose / notes |
|---|---|---|
| `git status --short --branch` | PASS | Confirmed active branch `budgets-savings` and clean worktree before phase edits. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check .` | PASS after repair | Required lint check. Initial run flagged one long line in the new budget service; repaired manually. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check .` | PASS | Required format check. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app` | PASS | Required type check. Final result: no issues in 58 source files. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests` | FAIL in sandbox, PASS with approval | Required test suite. Sandboxed run could not bind localhost for disposable PostgreSQL. Approved run passed: 75 passed, 1 Starlette/httpx dependency warning. |

### Phase 04.3 savings goals and contributions commands

| Command | Result | Purpose / notes |
|---|---|---|
| `git status --short --branch` | PASS | Confirmed active branch `budgets-savings` and clean worktree before phase edits. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check .` | PASS after repair | Required lint check. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check .` | PASS after repair | Required format check. Initial phase run formatted new savings files; final check reported 88 files already formatted. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app` | PASS after repair | Required type check. Initial run required narrowing stored savings goal status to response literals; final result: no issues in 65 source files. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q` | FAIL in sandbox, PASS with approval | Required full test suite. Sandboxed run could not bind localhost for disposable PostgreSQL. Approved run passed: 79 passed, 1 Starlette/httpx dependency warning. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" DATABASE_URL="postgresql+asyncpg://pfm_test@127.0.0.1:53738/postgres" alembic upgrade head` | PASS with approval | Required migration smoke check against disposable PostgreSQL. Upgraded through `202606190403`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" DATABASE_URL="postgresql+asyncpg://pfm_test@127.0.0.1:53738/postgres" alembic downgrade -1` | PASS with approval | Required migration smoke check against disposable PostgreSQL. Downgraded from `202606190403` to `202606190401`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" DATABASE_URL="postgresql+asyncpg://pfm_test@127.0.0.1:53738/postgres" alembic upgrade head` | PASS with approval | Required final migration smoke check against disposable PostgreSQL. Upgraded from `202606190401` to `202606190403`. |

### Phase 04.4 budget and savings hardening commands

| Command | Result | Purpose / notes |
|---|---|---|
| `git status --short --branch` | PASS | Confirmed active branch `budgets-savings`, one prior local phase commit ahead of origin, and clean worktree before phase edits. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check .` | PASS | Required lint check. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check .` | PASS after repair | Required format check. Initial run required formatting `tests/test_budget_savings_contracts.py`; final check reported 89 files already formatted. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app` | PASS | Required type check. Final result: no issues in 65 source files. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests` | FAIL in sandbox, PASS with approval | Required test suite. Sandboxed run could not bind localhost for disposable PostgreSQL. Approved run passed: 85 passed, 1 Starlette/httpx dependency warning. |

### Phase 05.1 report contract commands

| Command | Result | Purpose / notes |
|---|---|---|
| `git status --short --branch` | PASS | Confirmed clean active branch `budgets-savings` before creating the milestone 05 branch. |
| `git switch -c reports-analytics` | FAIL in sandbox, PASS with approval | Required milestone branch creation. Sandboxed run could not create `.git/refs/heads/reports-analytics.lock`; approved rerun created and switched to `reports-analytics`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check .` | PASS after repair | Required lint check. Initial run flagged Python 3.12 type-alias style in the new report schema; repaired with `type` aliases. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check .` | PASS after repair | Required format check. Initial run required formatting new report module/test files; repaired with `ruff format`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app` | PASS | Required type check. Final result: no issues in 67 source files. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests` | FAIL in sandbox, PASS after repair with approval | Required test suite. Sandboxed run could not bind localhost for disposable PostgreSQL and also exposed a new report contract test that needed to resolve Pydantic `$defs` aliases. After repair, approved rerun passed: 89 passed, 1 Starlette/httpx dependency warning. |

### Phase 05.2 dashboard summary commands

| Command | Result | Purpose / notes |
|---|---|---|
| `git status --short --branch` | PASS | Confirmed active branch `reports-analytics` and clean worktree before phase edits. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests/test_report_contracts.py` | PASS | Focused contract regression check passed: 4 passed. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests/test_dashboard_reports.py` | PASS with approval | Focused dashboard report integration tests. Approved disposable PostgreSQL run was needed for localhost binding. Result: 3 passed, 1 Starlette/httpx dependency warning. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check .` | PASS after repair | Required lint check. Initial focused run flagged line wrapping in new report files; repaired with `ruff format`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check .` | PASS | Required format check. Final result: 96 files already formatted. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app` | PASS after repair | Required type check. Initial run required typing the report scalar aggregate helper as a SQLAlchemy executable. Final result: no issues in 70 source files. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests` | FAIL in sandbox, PASS with approval | Required test suite. Sandboxed run could not bind localhost for disposable PostgreSQL. Approved rerun passed: 92 passed, 1 Starlette/httpx dependency warning. |

### Phase 05.3 trends and breakdowns commands

| Command | Result | Purpose / notes |
|---|---|---|
| `git status --short --branch` | PASS | Confirmed active branch `reports-analytics` and clean worktree before phase edits. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests/test_report_contracts.py tests/test_dashboard_reports.py tests/test_report_analytics.py` | FAIL in sandbox, PASS with approval | Focused report regression and analytics endpoint tests. Sandboxed run could not bind localhost for disposable PostgreSQL. Approved rerun passed: 10 passed, 1 Starlette/httpx dependency warning. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check .` | PASS after repair | Required lint check. Initial run flagged import ordering and line wrapping in report service/tests; repaired with Ruff formatting and an import-order patch. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check .` | PASS after repair | Required format check. Initial run required formatting report repository, service, and analytics test files; final result: 97 files already formatted. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app` | PASS | Required type check. Final result: no issues in 70 source files. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests` | FAIL in sandbox, PASS with approval | Required test suite. Sandboxed run could not bind localhost for disposable PostgreSQL. Approved rerun passed: 95 passed, 1 Starlette/httpx dependency warning. |

### Phase 05.4 query performance commands

| Command | Result | Purpose / notes |
|---|---|---|
| `git status --short --branch` | PASS | Confirmed active branch `reports-analytics` and clean worktree before phase edits. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" python - <<'PY' ... EXPLAIN (ANALYZE, BUFFERS) ... PY` | FAIL in sandbox, PASS with approval | Disposable PostgreSQL report plan review. Sandboxed run could not bind localhost. Approved pre-index plan showed transaction and savings report queries using existing broader indexes and active-budget lookup using a sequential scan on the small seed. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" python - <<'PY' ... EXPLAIN (ANALYZE, BUFFERS) ... PY` | PASS with approval | Disposable PostgreSQL post-index plan review. Period income/expense used `Index Only Scan using ix_transactions_reports_active_user_at` with zero heap fetches; savings contributions used `Index Only Scan using ix_savings_contributions_reports_user_contributed_at`; larger budget data used `Bitmap Index Scan on ix_budgets_reports_active_user_period`; spending-by-category still preferred the existing transaction user/date index. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" python - <<'PY' ... command.upgrade(head); command.downgrade(-1); command.upgrade(head) ... PY` | PASS with approval | Required migration smoke for new migration `202606210504_add_report_query_indexes.py` against a disposable PostgreSQL database. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check .` | PASS | Required lint check. Result: all checks passed. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check .` | PASS | Required format check. Result: 98 files already formatted. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app` | PASS | Required type check. Result: no issues in 70 source files. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests` | FAIL in sandbox, PASS with approval | Required test suite. Sandboxed run could not bind localhost for disposable PostgreSQL. Approved rerun passed: 95 passed, 1 Starlette/httpx dependency warning. |

### Phase 05.5 analytics tests and contract review commands

| Command | Result | Purpose / notes |
|---|---|---|
| `git status --short --branch` | PASS | Confirmed active branch `reports-analytics` and clean worktree before phase edits. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests/test_report_contracts.py` | FAIL after edit, PASS after repair | Focused report contract and OpenAPI check. Initial run exposed a test helper that only resolved Pydantic `$defs`; repaired it to also resolve FastAPI `#/components/schemas` refs. Final focused result: 5 passed. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests/test_report_analytics.py` | FAIL in sandbox, PASS after repair with approval | Focused analytics integration tests. Sandboxed run could not bind localhost for disposable PostgreSQL; first approved run exposed an invalid test fixture account type; final approved run passed: 4 passed, 1 Starlette/httpx dependency warning. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check .` | PASS | Required lint check. Result: all checks passed. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check .` | FAIL then PASS after formatting | Required format check. Initial run required formatting `tests/test_report_analytics.py`; after `ruff format tests/test_report_analytics.py`, final result: 98 files already formatted. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app` | PASS | Required type check. Result: no issues in 70 source files. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests` | FAIL in sandbox, PASS with approval | Required test suite. Sandboxed run could not bind localhost for disposable PostgreSQL. Approved rerun passed: 97 passed, 1 Starlette/httpx dependency warning. |

### Phase 05.V analytics verification commands

| Command | Result | Purpose / notes |
|---|---|---|
| `git status --short --branch` | PASS | Confirmed active branch `reports-analytics`, one local commit ahead of origin, and clean worktree before verification edits. |
| `rg -n "reports/dashboard|monthly-summary|cash-flow|spending-by-category|ix_transactions_reports_active_user_at|ix_savings_contributions_reports_user_contributed_at|ix_budgets_reports_active_user_period|materialized views|Phase 05\\.4|Phase 05\\.5|05\\.V|Next allowed phase" PFM_PROJECT_STATE.md docs/architecture/SYSTEM_DESIGN.md docs/architecture/UI_API_MATRIX.md server/tests/test_report_contracts.py server/tests/test_report_analytics.py server/app/modules/reports/router.py server/alembic/versions/202606210504_add_report_query_indexes.py` | PASS | Verified report endpoints and query-plan notes are recorded in docs, tests, migrations, router code, and project state. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check .` | PASS | Required lint check. Result: all checks passed. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check .` | PASS | Required format check. Result: 98 files already formatted. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app` | PASS | Required type check. Result: no issues in 70 source files. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q` | FAIL in sandbox, PASS with approval | Required full test suite. Sandboxed run could not bind localhost for disposable PostgreSQL and stopped with 37 passed, 60 errors. Approved rerun passed: 97 passed, 1 Starlette/httpx dependency warning. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" DATABASE_URL=<disposable PostgreSQL URL> alembic upgrade head` | PASS with approval | Required migration upgrade check against disposable PostgreSQL. Applied all migrations through `202606210504_add_report_query_indexes.py`. |

### Phase 06.1 recurring and outbox schema commands

| Command | Result | Purpose / notes |
|---|---|---|
| `git status --short --branch` | PASS | Confirmed active branch `reports-analytics` and clean worktree before creating the milestone branch. |
| `git switch -c recurring-worker` | PASS with approval | Created the required milestone 06 branch. |
| `cd server && ruff check .` | FAIL / unavailable PATH | Bare shell did not have `ruff` on `PATH`; reran with the project virtualenv on `PATH`. |
| `cd server && ruff format --check .` | FAIL / unavailable PATH | Bare shell did not have `ruff` on `PATH`; reran with the project virtualenv on `PATH`. |
| `cd server && mypy app` | FAIL / unavailable PATH | Bare shell did not have `mypy` on `PATH`; reran with the project virtualenv on `PATH`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check .` | PASS | Required lint check. Result: all checks passed. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check .` | PASS after repair | Required format check. Initial virtualenv run required formatting the new migration and schema test; repaired with `ruff format .`. Final result: 104 files already formatted. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app` | PASS | Required type check. Result: no issues in 74 source files. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q` | FAIL in sandbox, PASS with approval | Required full test suite. Sandboxed run could not bind localhost for disposable PostgreSQL and stopped with 39 passed, 62 errors. Approved rerun passed: 101 passed, 1 Starlette/httpx dependency warning. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" DATABASE_URL=<disposable PostgreSQL URL> alembic upgrade head` | PASS with approval | Required migration smoke check against disposable PostgreSQL. Applied all migrations through `202606210601_add_recurring_outbox_schema.py`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" DATABASE_URL=<disposable PostgreSQL URL> alembic downgrade -1` | PASS with approval | Required migration smoke check against disposable PostgreSQL. Downgraded from `202606210601` to `202606210504`. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" DATABASE_URL=<disposable PostgreSQL URL> alembic upgrade head` | PASS with approval | Required final migration smoke check against disposable PostgreSQL. Upgraded from `202606210504` to `202606210601`. |

### Phase 06.2 recurring schedule rule commands

| Command | Result | Purpose / notes |
|---|---|---|
| `git status --short --branch` | PASS | Confirmed active branch `recurring-worker` and clean worktree before phase edits. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests/test_recurring_rules.py` | FAIL in sandbox, PASS with approval | Focused recurring-rule API and schedule tests. Sandboxed run could not bind localhost for disposable PostgreSQL. Approved rerun passed: 3 passed, 1 Starlette/httpx dependency warning. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check .` | PASS after repair | Required lint check. Initial run flagged line wrapping and an unused import in new recurring files; repaired with Ruff fixes and formatting. Final result: all checks passed. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check .` | PASS after repair | Required format check. Initial run required formatting new recurring files; repaired with `ruff format`. Final result: 111 files already formatted. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app` | PASS | Required type check. Result: no issues in 80 source files. |
| `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests` | FAIL in sandbox, PASS with approval | Required test suite. Sandboxed run could not bind localhost for disposable PostgreSQL and stopped with 40 passed, 64 errors. Approved rerun passed: 104 passed, 1 Starlette/httpx dependency warning. |

## 13. Open blockers and deferred decisions

Record only active blockers or intentionally deferred decisions.

- Default base currency is recorded as `USD` until user confirmation. MVP multi-currency conversion is deferred; schema should keep room for later currency support.
- Add real lint/type/test scripts in later phases; current frontend optional lint/test commands are no-ops.
- Decide in milestone 01 whether to replace `next/font/google` with local font loading or require network access for production builds.
- Milestone 00 is verified.
- Milestone 01 is verified.
- Phase 02.1 is passed.
- Phase 02.2 is passed.
- Phase 02.3 is passed.
- Phase 02.4 is passed.
- Phase 02.5 is passed.
- Milestone 02 is verified.
- Phase 03.1 is passed.
- Phase 03.2 is passed.
- Phase 03.3 is passed.
- Phase 03.4 is passed.
- Phase 03.5 is passed.
- Phase 03.6 is passed.
- Phase 04.1 is passed.
- Phase 04.2 is passed.
- Phase 04.3 is passed.
- Phase 04.4 is passed. Next allowed phase is 04.V, Budget and savings verification, after user permission. Milestone 03.V remains not started in this state file because milestone 04 phases were explicitly requested by the user.
- Phase 05.1 is passed. Next allowed phase is 05.2, Dashboard summaries, after user permission. Milestone 03.V and 04.V remain not started in this state file because later milestone phases were explicitly requested by the user.
- Phase 05.2 is passed. Next allowed phase is 05.3, Trends and breakdowns, after user permission. Milestone 03.V and 04.V remain not started in this state file because later milestone phases were explicitly requested by the user.
- Phase 05.3 is passed. Next allowed phase is 05.4, Query performance review, after user permission. Milestone 03.V and 04.V remain not started in this state file because later milestone phases were explicitly requested by the user.
- Phase 05.4 is passed. Next allowed phase is 05.5, Analytics tests, after user permission. Milestone 03.V and 04.V remain not started in this state file because later milestone phases were explicitly requested by the user.
- Phase 05.5 is passed. Next allowed phase is 05.V, Analytics verification, after user permission. Milestone 03.V and 04.V remain not started in this state file because later milestone phases were explicitly requested by the user.
- Milestone 05 is verified. Next allowed phase is 06.1, Recurring and outbox schema, after user permission to push the `reports-analytics` branch and begin milestone 06. Milestone 03.V and 04.V remain not started in this state file because later milestone phases were explicitly requested by the user.
- Phase 06.1 is passed. Next allowed phase is 06.2, Scheduling rules, after user permission. Milestone 03.V and 04.V remain not started in this state file because later milestone phases were explicitly requested by the user.
- Phase 06.2 is passed. Next allowed phase is 06.3, Worker process, after user permission. Milestone 03.V and 04.V remain not started in this state file because later milestone phases were explicitly requested by the user.

## 14. Progress log

Append a dated entry after every completed phase.

- 2026-06-12: Phase 00.1 repository audit passed. Verified the repository is frontend-only in this worktree, recorded that `server/` is absent, captured stale documentation/package metadata findings, ran baseline client checks, and confirmed the next allowed phase is 00.2.
- 2026-06-12: Phase 00.2 frontend requirements map passed. Updated `docs/architecture/UI_API_MATRIX.md` to cover every implemented screen, route, data-bearing component, fixture path, implied query/mutation, validation requirement, and missing loading/empty/error state. Confirmed no backend implementation was added and the next allowed phase is 00.3.
- 2026-06-12: Phase 00.3 architecture baseline passed. Preserved the existing `docs/architecture/SYSTEM_DESIGN.md` content and patched only missing phase-required sections for entity map, API groups, pagination, error envelope, decimal serialization, UTC timestamps, transaction flow, SSE flow, OpenAPI generation, and non-goals. Confirmed no backend implementation was added and the next allowed phase is 00.4.
- 2026-06-12: Phase 00.4 discovery verification passed. Verified `PFM_PROJECT_STATE.md`, `docs/architecture/SYSTEM_DESIGN.md`, and `docs/architecture/UI_API_MATRIX.md` for milestone 00 consistency, confirmed every fixture is mapped to a planned API source or deferred feature, confirmed `server/` is absent and phase 01.1 should create it cleanly, ran baseline frontend checks, and set the next allowed phase to 01.1.
- 2026-06-12: Phase 01.1 Python server scaffold passed. Created the new `server/` Python project with `pyproject.toml`, package placeholders, `.env.example`, ignored local Python artifacts, and a scaffold import test. Confirmed no stale Node server files existed to remove, ran required compile, pytest collection, Ruff lint, and Ruff format checks, and set the next allowed phase to 01.2.
- 2026-06-12: Phase 01.2 FastAPI app configuration passed. Added typed settings, app factory, OpenAPI metadata, `/api/v1` router composition, CORS, logging foundation, consistent error envelopes, DB-free liveness endpoint, and focused tests. Ran required Ruff, mypy, and pytest checks successfully and set the next allowed phase to 01.3.
- 2026-06-12: Phase 01.3 PostgreSQL persistence passed. Added typed async PostgreSQL configuration, SQLAlchemy async engine/session/base infrastructure, metadata naming conventions, request-scoped session dependency, connection helper, local database setup docs, and disposable PostgreSQL tests. Required Ruff and mypy checks passed; pytest passed with approval after sandboxed localhost binding blocked the disposable PostgreSQL server.
- 2026-06-12: Phase 01.4 Alembic and health checks passed. Added async Alembic configuration, initial empty baseline migration, DB-aware readiness endpoint, migration smoke tests, shared disposable PostgreSQL test fixture, and migration command docs. Required Ruff, mypy, pytest, and Alembic upgrade/downgrade/upgrade smoke checks passed; localhost database operations required approval because sandbox networking blocks binding/connecting to the disposable PostgreSQL server.
- 2026-06-15: Phase 01.V foundation verification passed. Verified milestone 01 scope contains no later domain features, confirmed `.env` is ignored and `.env.example` contains no secrets, ran the full server quality suite, ran Alembic upgrade/downgrade/upgrade smoke checks against a disposable PostgreSQL database, and set the next allowed phase to 02.1.
- 2026-06-15: Phase 02.1 user and session models passed. Added persisted `users` and `refresh_sessions` schema, auth/user repository and service skeletons, Alembic migration `202606150201`, schema tests, and migration upgrade/downgrade/upgrade checks against a disposable PostgreSQL database. No endpoints were added, and the next allowed phase is 02.2.
- 2026-06-15: Phase 02.2 registration and password hashing passed. Added `POST /api/v1/auth/register`, normalized email validation, password policy, Argon2 hashing through `pwdlib`, deterministic duplicate-email handling, validation redaction for sensitive inputs, and registration security tests. No migrations were added, and the next allowed phase is 02.3.
- 2026-06-15: Phase 02.3 login and access token passed. Added `POST /api/v1/auth/login`, `GET /api/v1/users/me`, PyJWT-backed short-lived access-token creation and validation, bearer current-user dependency, typed access-token settings, generic invalid-credential responses, inactive-user rejection, and token edge-case tests. No migrations were added, and the next allowed phase is 02.4.
- 2026-06-15: Phase 02.4 refresh rotation and logout passed. Added opaque refresh-token issuance on login, HMAC-hashed refresh-token persistence, JSON-body refresh-token transport, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, rotation with old-token revocation, family revocation on reuse, expiry rejection, logout revocation, and refresh security tests. No migrations were added, and the next allowed phase is 02.5.
- 2026-06-15: Phase 02.5 auth edge-case tests passed. Narrowed bearer-token exception handling, added validation redaction coverage for password and refresh-token inputs, added missing-bearer and missing-user authorization checks, added concurrent same-token refresh coverage, documented auth OpenAPI contract expectations, and recorded deferred PostgreSQL-backed login/register rate-limit design notes. No migrations or endpoints were added, and the next allowed phase is 02.V.
- 2026-06-15: Phase 02.V authentication verification passed. Verified milestone 02 auth scope, generated OpenAPI auth routes, protected `/api/v1/users/me` bearer dependency behavior, ignored environment files, tracked-file secret posture, full server quality suite, and Alembic upgrade/downgrade/upgrade smoke checks against a disposable PostgreSQL database. No migrations or endpoints were added, and the next allowed phase is 03.1 after user approval to push the branch and begin milestone 03.
- 2026-06-15: Phase 03.1 finance domain schema passed. Added finance source-of-truth models for accounts, categories, transactions, transfer links, and idempotency records; enforced user ownership with composite foreign keys; added migration `202606150301`; updated system design; ran required Ruff, mypy, pytest, and Alembic upgrade/downgrade/upgrade checks. No endpoints were added, and the next allowed phase is 03.2.
- 2026-06-15: Phase 03.2 accounts and categories passed. Added authenticated account and category management endpoints, ownership-scoped repositories/services, safe archive behavior, cursor list envelopes, category kind filtering, validation and duplicate handling, OpenAPI coverage, and integration tests. No migrations were added, and the next allowed phase is 03.3.
- 2026-06-15: Phase 03.3 income and expenses passed. Added authenticated income/expense transaction endpoints, owned active account/category validation, precise Decimal amount handling, UTC-aware transaction timestamps, source-record reproducibility tests, safe void behavior, ownership and invalid-state tests, and OpenAPI coverage. No migrations were added, and the next allowed phase is 03.4.
- 2026-06-16: Phase 03.4 transfers and atomicity passed. Added authenticated transfer create/retrieve endpoints, linked debit and credit source rows, transfer-link representations, same-account/cross-user/archived/currency validation, explicit rollback behavior for failed multi-record writes, transfer invariant documentation, and integration tests. No migrations were added, and the next allowed phase is 03.5.
- 2026-06-16: Phase 03.5 filters, pagination, and idempotency passed. Added cursor-paginated and filtered transaction listing, deterministic ordering, broad source-row list behavior, idempotent transaction and transfer create mutations backed by `idempotency_records`, conflict handling for mismatched key reuse, design notes, and integration tests. No migrations were added, and the next allowed phase is 03.6.
- 2026-06-16: Phase 03.6 finance tests and contract review passed. Hardened money OpenAPI schemas to decimal strings, moved idempotent transaction/transfer replay checks before mutable reference validation, added replay-after-archive integration coverage, added finance contract tests for decimal fields, pagination/filter shape, and idempotency headers, updated finance UI/API matrix notes, and confirmed the next allowed phase is 03.V.
- 2026-06-19: Phase 04.1 budget schema and rules passed. Added budget persistence with monthly/custom period semantics, soft archive fields, optional category scope, active same-scope overlap protection, migration `202606190401`, schema tests, and documented that global/category budgets may overlap across different scopes. No endpoints were added, and the next allowed phase is 04.2.
- 2026-06-19: Phase 04.2 budget APIs and progress passed. Added authenticated budget CRUD/archive endpoints, month/category/list filters, computed progress from non-voided expense source records, category/global overlap behavior, archived budget behavior, and integration tests. No migrations were added, and the next allowed phase is 04.3.
- 2026-06-19: Phase 04.3 savings goals and contributions passed. Added authenticated savings goal CRUD/archive endpoints, auditable contribution create/list endpoints, progress computed from contribution source records, over-target completion behavior, completed/archived contribution rejection, migration `202606190403`, schema tests, and integration tests. No frontend integration or later reporting behavior was added, and the next allowed phase is 04.4.
- 2026-06-19: Phase 04.4 budget and savings hardening passed. Added edge-case tests for budget UTC boundaries, budget cursors, savings goal/contribution cursors, archived savings filters, and budget/savings OpenAPI decimal/list/security contracts; updated the UI/API matrix with implemented budget and savings contract status and deferred summary/setup endpoints. No migrations or endpoints were added, and the next allowed phase is 04.V.
- 2026-06-21: Phase 05.1 report contracts passed. Added report query/response schema contracts, documented dashboard, monthly summary, cash-flow, and spending-by-category report endpoints before implementation, recorded UTC range/grouping/empty-period/decimal semantics, updated the UI/API matrix and system design, and confirmed the next allowed phase is 05.2.
- 2026-06-21: Phase 05.2 dashboard summaries passed. Implemented authenticated dashboard report aggregation from account and transaction source records, active-account available balance, selected-period income/expense/net-flow totals, zero-filled week/month/year chart buckets, dashboard report tests, and documentation/state updates. No migrations or frontend integration were added, and the next allowed phase is 05.3.
- 2026-06-21: Phase 05.3 trends and breakdowns passed. Implemented authenticated monthly summary, cash-flow, and spending-by-category report endpoints from existing transaction, category, budget, and savings source records; added deterministic chart analytics tests for empty states, UTC boundaries, Decimal values, grouping intervals, budget/savings summary fields, and user isolation; updated docs and confirmed the next allowed phase is 05.4.
- 2026-06-21: Phase 05.4 query performance passed. Added report query indexes for non-voided transaction windows, savings contribution user/date totals, and active budget month-overlap lookups; captured disposable PostgreSQL EXPLAIN plans, verified migration upgrade/downgrade/upgrade, documented that materialized views are deferred, and confirmed the next allowed phase is 05.5.
- 2026-06-21: Phase 05.5 analytics tests and contract review passed. Added multi-account, multi-category, multi-period analytics fixture coverage; verified report OpenAPI security, parameters, response references, enums, and decimal-string chart fields; ran the full backend quality suite; and confirmed the next allowed phase is 05.V.
- 2026-06-21: Phase 05.V analytics verification passed. Verified milestone 05 report endpoints and query-plan notes are recorded, ran the required Ruff, mypy, pytest, and disposable Alembic upgrade checks, and set the next allowed phase to 06.1 after permission to push the branch and begin milestone 06.
- 2026-06-21: Phase 06.1 recurring and outbox schema passed. Added recurring income/expense rule persistence, durable outbox event persistence, worker locking and idempotency fields, migration `202606210601`, schema/migration tests, and recurrence limitation documentation. Required Ruff, mypy, pytest, and Alembic upgrade/downgrade/upgrade checks passed, and the next allowed phase is 06.2.
- 2026-06-21: Phase 06.2 recurring schedule rules passed. Added authenticated recurring-rule CRUD/list/update/pause/resume/archive APIs, deterministic daily/weekly/monthly/yearly next-run calculation with UTC normalization and timezone-aware month-end handling, ownership/reference validation, OpenAPI coverage, and integration tests. Required Ruff, mypy, and pytest checks passed, and the next allowed phase is 06.3.
