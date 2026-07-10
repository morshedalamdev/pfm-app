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

## Frontend Routes

- Dashboard routes are grouped under `client/app/(dashboard)` and protected by `AuthGuard` in `client/app/(dashboard)/layout.tsx`.
- Implemented dashboard pages:
  - `/`: home dashboard from `client/app/(dashboard)/page.tsx`.
  - `/analytics`: analytics report screen from `client/app/(dashboard)/analytics/page.tsx`.
  - `/transaction`: transaction list from `client/app/(dashboard)/transaction/page.tsx`.
  - `/transaction/[id]`: transaction create/edit form from `client/app/(dashboard)/transaction/[id]/page.tsx`; `/transaction/create` is handled as a pseudo-id.
  - `/loan`: loan/debt list and people drawer from `client/app/(dashboard)/loan/page.tsx`.
  - `/loan/[id]`: loan/debt create/edit form from `client/app/(dashboard)/loan/[id]/page.tsx`; `/loan/create` is handled as a pseudo-id.
  - `/budget`: budget planning page from `client/app/(dashboard)/budget/page.tsx`.
  - `/budget/setup`: budget setup page from `client/app/(dashboard)/budget/setup/page.tsx`.
  - `/savings`: savings goals page from `client/app/(dashboard)/savings/page.tsx`.
  - `/savings/[id]`: savings goal create/edit form from `client/app/(dashboard)/savings/[id]/page.tsx`; `/savings/create` is handled as a pseudo-id.
  - `/settings`: settings page from `client/app/(dashboard)/settings/page.tsx`.
  - `/profile`: profile page from `client/app/(dashboard)/profile/page.tsx`.
- Auth routes exist under `client/app/auth`: `/auth`, `/auth/login`, `/auth/register`, `/auth/forgot-password`, and `/auth/recover-password`.

## Sidebar and Navigation

- Primary navigation is implemented in `client/components/Footer.tsx` as a fixed bottom navigation shown only on `/`, `/analytics`, `/transaction`, and `/loan`.
- Bottom navigation targets are `/analytics` labeled `Income`, `/transaction`, `/`, and `/loan`.
- The fifth footer action opens a Radix `Sheet` menu containing profile summary, board links, the account board, support buttons, settings, reset password, delete account, and logout.
- Board links currently present in the sheet:
  - Savings Goals: `/savings`.
  - Budget Planning: `/budget`.
  - Budget Setup: `/budget/setup`.
- The footer fetches unread notification count only on the four primary routes.
- Responsive structure is mobile-first: the root `body` is constrained to `max-w-md`, the footer is fixed with `max-w-md`, sheet contents scroll with `100svh`-based sizing, and many list pages reserve bottom padding for the footer.
- Global viewport is `width=device-width, initialScale=1`; mobile form controls use `16px` font sizing through `client/app/globals.css`.

## Existing Account UI

- Account UI currently lives inside `client/components/AccountBoard.tsx`, rendered from the sheet menu in `client/components/Footer.tsx`.
- The account section title is `Account`, with an add/close icon button.
- The add form supports account name and account type.
- Account type options currently include Cash, Card, Mobile Pay, Bank, Wallet, Savings, and Other.
- Account creation uses `createAccount` with the signed-in user's `base_currency` and an opening balance of `0`.
- Account listing uses `listAccounts`, displays account name, type label, and formatted opening balance.
- Account removal uses `deleteAccount` and surfaces API errors, including referenced-account conflicts, as inline messages.
- There is no standalone `/accounts` or `/account` route in the current App Router tree.

## Existing Loan/Debt UI

- `/loan` shows summary cards for Given, Taken, and Due using `getLoanSummary`.
- `/loan` loads people, records, and summary from loan APIs, with loading, empty, error, retry, search, and direction filter states.
- Loan people are managed in a drawer with add/edit/archive behavior.
- The people drawer includes a browser Contact Picker path behind feature detection and keeps manual name/phone entry available.
- Loan records render through `LoanItem` with delete and settlement behavior.
- `/loan/create` and `/loan/[id]` share the loan detail form, including amount, given/taken toggle, person selector, date, note, create/update calls, and empty-state guidance when no people exist.

## Existing Home Dashboard UI

- `/` uses `useDashboardData` to load dashboard report data and recent transactions.
- The dashboard shows available balance, income, expense, a root chart, and recent transactions.
- Dashboard values are formatted from server response currency, defaulting to `USD` when no report exists.
- Loading skeletons, error retry states, and empty recent-transaction states are present.
- Recent transaction rows link to `/transaction/{id}`.

## Existing Settings UI

- `/settings` shows the current currency and a currency selector.
- Currency options currently include USD, EUR, GBP, BDT, INR, CAD, AUD, JPY, and CNY.
- Saving settings patches `/api/v1/users/me` with `base_currency` and updates the auth store user.
- A conflict response is shown as `Currency can only be changed once per month.`
- Settings currently does not expose controls for dashboard balance source, dashboard account selection, or budget selection.

## Existing Transaction UI

- `/transaction` lists transactions from server APIs with search, date filter, duration filter, type filter, grouped date headings, row drawers, edit links, delete behavior, loading/error/empty states, and a create link to `/transaction/create`.
- `/transaction/create` and `/transaction/[id]` share the transaction form.
- The transaction form has Expense, Income, and Transfer tabs.
- Expense loads accounts, expense categories, and current-month budgets. The displayed Account / Source options include account labels, a monthly budget label, and budget labels; saving still requires an account-backed source.
- Income uses account-only account options and income categories.
- Transfer uses account source options and destination options that include Budget labels plus account labels; saving requires an account destination and rejects same-account transfers.
- Expense and income create paths can create recurring rules when the Recurring toggle is enabled, with Daily, Weekly, Monthly, and Yearly frequency options.
- Edit mode disables the Transfer tab and updates existing non-transfer transaction records.

## Missing UI Routes

- Savings Goals route exists at `/savings`.
- Budget Planning route exists at `/budget`.
- Budget Setup route exists at `/budget/setup`.
- Standalone Accounts route is missing; account management currently exists only inside the footer sheet menu through `AccountBoard`.
- No desktop-specific sidebar route shell was found; navigation is implemented as a mobile-width fixed footer plus sheet menu.

## Phase 00.2 Check Results

- `cd client && npm run build`: passed after approved rerun. The sandboxed run failed because Next.js could not fetch the configured Google-hosted Urbanist font.
- `cd client && npm run lint`: not run because no lint script exists.
- No baseline UI/build bugs required repair in phase 00.2.
