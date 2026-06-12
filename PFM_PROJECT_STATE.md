# PFM_PROJECT_STATE.md — Persistent Project Memory

> Every Codex milestone agent must read this file before inspecting or modifying code. Update it at the end of each completed milestone. Do not delete historical progress entries.

## 1. Project identity

- Repository: `https://github.com/morshedalamdev/pfm-app`
- Live frontend: `https://pfm.morshedalam.dev`
- Product: personal finance tracker for income, expenses, savings, budgets, reports, recurring transactions, receipts, and notifications.
- Current user instruction: preserve the completed Next.js UI, replace the backend with Python FastAPI, connect the UI to responsive server data after the backend milestones, and work milestone-by-milestone with permission gates.

## 2. Confirmed repository observations

Verified during milestone 00 against the local clone on 2026-06-12.

- Current branch for milestone 00: `discovery-architecture`.
- The local `main` branch was behind `origin/main` by 1 commit before branch creation.
- Root project files include `.gitignore`, `.gitattributes`, `README.md`, `AGENTS.md`, `PFM_PROJECT_STATE.md`, `agents/`, `client/`, and milestone-created `docs/architecture/`.
- The worktree already had uncommitted changes before milestone 00 work began: `README.md` modified, tracked `server/` scaffold files deleted, and `AGENTS.md`, `PFM_PROJECT_STATE.md`, and `agents/` untracked.
- The current worktree has no `server/` directory. Tracked `HEAD` only had `server/package.json`, `server/package-lock.json`, `server/tsconfig.json`, and an empty `server/server.ts`; no meaningful backend implementation needs to be preserved.
- The client is a Next.js App Router application using React, TypeScript, Tailwind CSS v4, Radix/shadcn-style UI primitives, Recharts, Lucide React, date-fns, Axios, Zod, and Zustand dependencies. No active API helper, Axios call, generated client, or Zustand store was found.
- The frontend currently renders placeholder finance values, charts, profile data, transaction examples, savings goals, budget rows, and loan/debt examples.
- `client/next.config.ts` sets `typescript.ignoreBuildErrors: true`, so `npm run build` does not currently enforce TypeScript validation.
- No `.env`, `.env.example`, frontend test config, or frontend test/spec files were found in the worktree.
- Ignored local artifacts observed: `.DS_Store`, `client/.next/`, and generated `client/next-env.d.ts`.
- PostgreSQL is expected in the user's local environment per the project instruction, but milestone 00 did not require database access.

### Verified Repository Tree Summary

```text
.
├── AGENTS.md
├── PFM_PROJECT_STATE.md
├── README.md
├── agents/
│   ├── 00_DISCOVERY_ARCHITECTURE.md
│   └── 01-10 milestone agent files
├── client/
│   ├── app/
│   │   ├── auth/
│   │   └── (dashboard)/
│   ├── assets/
│   ├── components/
│   │   ├── charts/
│   │   ├── filters/
│   │   ├── inputs/
│   │   ├── items/
│   │   └── ui/
│   ├── fonts/
│   ├── lib/
│   ├── package.json
│   └── package-lock.json
└── docs/
    └── architecture/
        ├── SYSTEM_DESIGN.md
        └── UI_API_MATRIX.md
```

The tracked Node server scaffold is intentionally absent from the current worktree and should be replaced in milestone 01 rather than restored.

## 3. Locked architecture decisions

Only change a locked decision after documenting the reason in the Architecture Decision Log.

| Area                 | Locked decision                                                                              | Reason                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Overall backend      | FastAPI modular monolith                                                                     | Appropriate for one product and one codebase; avoids premature distributed-system overhead.       |
| API style            | Versioned REST API under `/api/v1`                                                           | Clear fit for CRUD, filtering, reports, generated OpenAPI docs, and frontend integration.         |
| API contract         | FastAPI OpenAPI schema generates TypeScript client types or SDK                              | Prevents frontend/backend drift.                                                                  |
| Database             | PostgreSQL                                                                                   | Already available locally and appropriate for transactional financial data and analytics queries. |
| ORM                  | SQLAlchemy 2 async                                                                           | Explicit, mature, and useful for learning production Python data access.                          |
| Migrations           | Alembic                                                                                      | Schema changes must be reproducible and reviewable.                                               |
| Configuration        | `pydantic-settings` with environment variables and `.env.example`                            | Typed configuration without committed secrets.                                                    |
| Money representation | PostgreSQL `NUMERIC`, Python `Decimal`, serialized decimal strings where needed              | Prevents floating-point rounding errors.                                                          |
| Authentication       | Local email/password, Argon2 hashing, short-lived access JWT, rotated refresh sessions       | Secure default without requiring third-party identity services.                                   |
| Backend modules      | Domain-oriented modules under `server/app/modules/`                                          | Keeps a modular monolith maintainable.                                                            |
| Background work      | Separate worker process with PostgreSQL-backed coordination and idempotency                  | Keeps durable scheduled work out of API request handlers without requiring Redis initially.       |
| Real-time transport  | SSE for one-way notifications or data refresh hints                                          | Browser-native server push is sufficient; WebSockets are not justified by current requirements.   |
| Uploads              | Storage adapter with local-development implementation and cloud implementation later         | Avoids blocking local work on external credentials.                                               |
| Email                | Email adapter with console/local implementation and production provider implementation later | Avoids blocking development on SMTP or provider credentials.                                      |
| Frontend integration | Preserve current UI; use generated API contract and a dedicated data-fetching layer          | Replace fixture data without redesigning screens.                                                 |

## 4. Proposed server layout

Milestone 01 may refine file names, but preserve the separation of concerns.

```text
server/
├── pyproject.toml
├── alembic.ini
├── .env.example
├── app/
│   ├── main.py
│   ├── api/
│   │   └── v1/
│   │       └── router.py
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── logging.py
│   │   ├── security.py
│   │   └── errors.py
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
│   ├── workers/
│   └── shared/
├── migrations/
└── tests/
```

## 5. Proposed data model

Milestone 00 must compare this list against the real UI and record any changes before implementation.

| Entity                  | Purpose                                                | Important constraints                                                                                     |
| ----------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `users`                 | Login identity and ownership root                      | Unique normalized email; hashed password only.                                                            |
| `user_profiles`         | Editable profile fields visible in the UI              | Owned by user; display name, phone, occupation, about text, and avatar metadata.                          |
| `refresh_sessions`      | Refresh-token rotation and revocation                  | Store token hash, expiry, revocation metadata, and device/session metadata where useful.                  |
| `password_reset_tokens` | Password reset requests and verification codes         | Store only hashed tokens/codes; short expiry; single use.                                                 |
| `accounts`              | Cash, bank, card, wallet, or savings containers        | Owned by user; currency recorded; archived instead of destructive deletion when referenced.               |
| `categories`            | User-owned and default income/expense categories       | Type-aware; soft delete or archive when referenced.                                                       |
| `transactions`          | Income, expense, and transfer records                  | Decimal amount; user ownership; account references; category rules; timestamps; optional idempotency key. |
| `budgets`               | Category and period spending limits                    | Unique active combination by user/category/period as defined by product behavior.                         |
| `savings_goals`         | Target amount and progress                             | Decimal target; target date optional; progress computed from contributions or linked rules.               |
| `savings_contributions` | Explicit progress movements for goals                  | Decimal amount; linked user and goal; optional transaction link.                                          |
| `loan_accounts`         | Lent and borrowed personal debt records visible in UI  | Decimal principal/current balance; counterparty name and optional phone; due dates; user-owned.           |
| `loan_payments`         | Repayment movements against loan/debt records          | Decimal amount; linked loan and user; optional transaction link.                                          |
| `recurring_rules`       | Schedules for repeat transactions                      | Time zone aware; next-run metadata; active flag; safe retry behavior.                                     |
| `outbox_events`         | Durable events for worker and synchronization delivery | Idempotent consumption; status and retry metadata.                                                        |
| `notifications`         | User-visible notification records                      | Read state; event source; delivery status.                                                                |
| `receipts`              | File metadata linked to a transaction                  | Storage key, media type, size, checksum where useful; never store secrets in metadata.                    |

## 6. API boundaries

Expected route groups. Milestone agents may refine exact endpoints while keeping the boundaries stable.

```text
/api/v1/health
/api/v1/ready
/api/v1/auth/*
/api/v1/users/me
/api/v1/accounts/*
/api/v1/categories/*
/api/v1/transactions/*
/api/v1/budgets/*
/api/v1/savings-goals/*
/api/v1/loans/*
/api/v1/reports/*
/api/v1/recurring-rules/*
/api/v1/notifications/*
/api/v1/events/stream
```

### UI-to-Endpoint Baseline

The exhaustive screen matrix is recorded in `docs/architecture/UI_API_MATRIX.md`. Summary route groups implied by the current UI:

| UI area | Current routes | Required API groups |
| ------- | -------------- | ------------------- |
| Auth | `/auth`, `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/recover-password` | `/api/v1/auth/*` |
| Home dashboard | `/` | `/api/v1/reports/*`, `/api/v1/transactions/*` |
| Analytics | `/analytics` | `/api/v1/reports/*`, `/api/v1/budgets/*`, `/api/v1/savings-goals/*` |
| Transactions | `/transaction`, `/transaction/[id]` | `/api/v1/transactions/*`, `/api/v1/categories/*`, `/api/v1/recurring-rules/*` |
| Budgets | `/budget`, `/budget/setup` | `/api/v1/budgets/*`, `/api/v1/categories/*` |
| Savings | `/savings`, `/savings/[id]` | `/api/v1/savings-goals/*` |
| Loans/debts | `/loan`, `/loan/[id]` | `/api/v1/loans/*` |
| Profile/footer sheet | `/profile` plus footer profile sheet | `/api/v1/users/me`, `/api/v1/auth/logout` |

## 7. Frontend integration principles

- Do not redesign the current UI.
- Inventory every screen and map each visible value, chart, form, filter, and action to an API operation.
- Generate TypeScript contract code from FastAPI OpenAPI rather than manually duplicating response models.
- Keep server state separate from UI state. Zustand may remain for UI/session-oriented state; server-backed data should use a query/cache layer chosen in milestone 08.
- Use loading, empty, error, and retry states for every server-backed screen.
- Preserve responsive behavior on mobile and desktop.

### Screen Inventory

- `/`: balance, income/expense totals, root chart with week/month/year and income/expense toggle, recent transaction list.
- `/analytics`: month picker, savings and income/expense summaries, savings/budget cards, income-vs-expense chart, spending-by-category chart, top expenses, monthly trends.
- `/transaction`: search, type/duration/date filters, grouped transaction list, transaction detail drawer with edit/delete actions.
- `/transaction/[id]`: generic create/edit transaction form for expense and income flows, categories/sources, date, recurring options, ignore-budget flag, and note.
- `/budget`: month picker, monthly budget summary, spent/remaining/progress/days remaining, repeated budget category cards.
- `/budget/setup`: monthly income, default/custom budget allocation forms, category allocation inputs, add-category popover.
- `/savings`: total savings, active/complete/all filter, savings goal cards.
- `/savings/[id]`: generic create/edit savings goal form with target amount, name, monthly saving, note, and target date.
- Savings goal drawer: detail view, add-money contribution form, delete action.
- `/loan`: lent/borrowed totals, search and type filter, loan/debt cards.
- `/loan/[id]`: generic create/edit loan form with lent/borrowed switch, counterparty, phone, dates, amount, and note.
- Loan drawer: loan/debt detail view with edit/delete actions.
- `/profile`: avatar upload field, name, email, phone, occupation, about text.
- Footer sheet: profile summary, navigation links, informational/support/preference actions, reset password, logout, delete account.
- `/auth`: email-first entry plus social buttons.
- `/auth/login`: email/password login.
- `/auth/register`: name, occupation, phone, email, password, confirm password.
- `/auth/forgot-password`: email reset request and 4-digit code form.
- `/auth/recover-password`: new password and confirmation form.

## 8. Environment variable inventory

Milestones add only variables they use. Keep `.env.example` updated.

```dotenv
APP_ENV=development
APP_NAME=pfm-api
API_V1_PREFIX=/api/v1
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/pfm_app
TEST_DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/pfm_app_test
JWT_SECRET_KEY=replace-me
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=30
CORS_ALLOWED_ORIGINS=http://localhost:3000
STORAGE_BACKEND=local
LOCAL_UPLOAD_DIR=.local/uploads
EMAIL_BACKEND=console
```

Cloud credentials must be added only when a production adapter is selected.

### Confirmed Local Development Commands

Current valid client commands:

```bash
cd client
npm install
npm run dev
npm run build
npm run start
npm run lint --if-present
npm run test --if-present
```

Current server commands: none. The worktree has no `server/` directory, and the tracked Node scaffold had no meaningful implementation to run. Milestone 01 must create the FastAPI server commands.

### Confirmed Server Replacement Approach

- Do not restore the deleted Node/Express/Prisma scaffold.
- Replace `server/` with the FastAPI layout in milestone 01.
- Preserve only conceptual dependency lessons from the scaffold: the product expected auth, PostgreSQL, validation, email, uploads, rate limiting/security middleware, logging, and recurring jobs. Implement those through the locked Python architecture as milestones require them.
- Keep receipts and notifications in the backend plan even though no dedicated UI screen exists yet.

### Corrected Deferred Questions

- Base currency: no current UI selector exists; proceed with one configurable user base currency and default `USD`.
- Multi-currency: not required for MVP. Keep currency fields on accounts/money records so later support is possible without redesigning the schema.
- Loans/debts: now confirmed as visible UI scope and added to the proposed data model and API boundaries.
- Social auth: visible buttons are present, but OAuth remains future scope. MVP backend uses local email/password.
- Support/legal/settings footer items: visible but static; backend support can wait until explicitly scoped.

### Baseline Test Results

| Command | Result | Notes |
| ------- | ------ | ----- |
| `cd client && npm install` | Pass after approval | First sandboxed run failed with `npm error Exit handler never called!` because npm could not write logs under `/Users/morshedalam/.npm/_logs`. Approved rerun completed, changed 49 packages, audited 186 packages, and reported 5 vulnerabilities: 2 moderate, 3 high. |
| `cd client && npm run build` | Pass after approval | First sandboxed run failed fetching Google Fonts for `Urbanist`. Approved rerun compiled successfully with Next.js 16.1.1. Build output says type validation is skipped because `typescript.ignoreBuildErrors` is enabled. |
| `cd client && npm run lint --if-present` | Pass/no-op | No `lint` script is currently present. |
| `cd client && npm run test --if-present` | Pass/no-op | No `test` script is currently present. |
| Existing server checks | Not available | No `server/` directory exists in the worktree; tracked scaffold had only package files and an empty `server.ts`. |

## 9. Milestone status

| Milestone | Branch                                     | Status      | Notes                                                    |
| --------: | ------------------------------------------ | ----------- | -------------------------------------------------------- |
|        00 | `discovery-architecture`                   | Completed   | Verified repository, UI/API inventory, and architecture baseline. |
|        01 | `fastapi-foundation`                       | Not started | FastAPI, config, DB, Alembic, health endpoints, tooling. |
|        02 | `auth-users`                               | Not started | Users and secure session flow.                           |
|        03 | `core-finance-ledger`                      | Not started | Accounts, categories, transactions, transfers, balances. |
|        04 | `budgets-savings`                          | Not started | Budgets and savings goals.                               |
|        05 | `reports-analytics`                        | Not started | Dashboard and report queries.                            |
|        06 | `recurring-outbox`                         | Not started | Worker, recurring rules, outbox.                         |
|        07 | `receipts-notifications-sse`               | Not started | Uploads, notifications, email adapters, SSE.             |
|        08 | `frontend-integration`                     | Not started | Replace fixtures with responsive API data.               |
|        09 | `quality-ci-deployment`                    | Not started | CI, hardening, deployment, README.                       |
|        10 | `final-audit`                              | Not started | End-to-end audit only.                                   |

## 10. Deferred user decisions and integration requests

Do not ask for these before the relevant milestone unless a blocker appears.

| Decision or credential                         | Earliest milestone | Default when not provided                                          |
| ---------------------------------------------- | -----------------: | ------------------------------------------------------------------ |
| Base currency and multi-currency requirement   |                 00 | One configurable user base currency; default `USD`.                |
| Production API hosting platform                |                 09 | Keep deployment portable through Docker and environment variables. |
| Cloud receipt storage provider and credentials |                 07 | Use local storage adapter in development.                          |
| Email provider credentials                     |                 07 | Use console email adapter in development.                          |
| Production frontend/API domain relationship    |           08 or 09 | Use environment-configured API base URL and CORS origins.          |
| OAuth social login                             |       Future scope | Do not implement; use local email/password.                        |
| Bank account aggregation provider              |       Future scope | Do not implement.                                                  |

## 11. Architecture Decision Log

Add entries using this template:

```text
### ADR-XXX — Title
- Date:
- Status: Accepted | Superseded
- Context:
- Decision:
- Consequences:
```

### ADR-001 — Use a modular monolith

- Date: 2026-06-12
- Status: Accepted
- Context: The product is a single personal-finance application under active development by a small team. It needs clean architecture but does not need distributed deployment complexity.
- Decision: Build one FastAPI service with domain-oriented modules and one separate worker execution path.
- Consequences: Module boundaries remain explicit. Microservices may be extracted later only after a measured need appears.

### ADR-002 — Use REST plus OpenAPI, not REST-only thinking

- Date: 2026-06-12
- Status: Accepted
- Context: Core operations are resource-oriented, but the system also needs typed frontend contracts, analytics queries, background processing, and selective server push.
- Decision: Use versioned REST endpoints for commands and queries, generate frontend types from OpenAPI, use a worker for durable deferred work, and add SSE for one-way update signals.
- Consequences: The system is simple to operate while still covering non-request-response requirements.

### ADR-003 — Avoid floating-point persisted money

- Date: 2026-06-12
- Status: Accepted
- Context: Personal finance calculations require deterministic decimal behavior.
- Decision: Use PostgreSQL `NUMERIC` and Python `Decimal` for money.
- Consequences: API serialization and frontend parsing must be explicit.

## 12. Progress log

Append milestone completion entries below. Never rewrite previous entries.

```text
### YYYY-MM-DD — Milestone NN
- Branch:
- Commit:
- Implemented:
- Migrations:
- Endpoints:
- Tests:
- Blockers:
- Next allowed milestone:
```

### 2026-06-12 — Milestone 00

- Branch: `discovery-architecture`
- Commit: `milestone(00): record verified architecture baseline`
- Implemented: Verified repository inventory, frontend screen inventory, UI-to-API matrix, server replacement approach, local command baseline, and system design documentation.
- Migrations: None.
- Endpoints: None implemented. Planned route groups updated to include `/api/v1/loans/*`.
- Tests: `npm install` passed after approval; `npm run build` passed after approval; `npm run lint --if-present` passed as no-op because no script exists; `npm run test --if-present` passed as no-op because no script exists; server checks unavailable because `server/` is absent.
- Blockers: No milestone blocker. Baseline caveats: npm audit reports 5 vulnerabilities, no lint/test scripts exist, and `next build` skips TypeScript validation.
- Next allowed milestone: 01, `fastapi-foundation`.
