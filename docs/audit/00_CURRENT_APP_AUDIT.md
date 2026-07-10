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

## State Management

- Auth/session state is stored in Zustand through `client/lib/auth/store.ts`.
- Auth tokens are persisted in browser `localStorage` under `pfm.auth.tokens` by `client/lib/auth/tokenStorage.ts`.
- No production `sessionStorage` usage was found.
- No broad finance-domain Zustand store was found; finance pages use local React component state for filters, form fields, loading/error flags, selected options, and list data.
- API access is centralized in `client/lib/api/client.ts`, which wraps Axios, maps API errors, attaches bearer tokens, and refreshes access tokens on eligible `401` responses.
- Finance API helper functions live in `client/lib/finance/api.ts`.
- Dashboard report state lives in `client/lib/dashboard/useDashboardData.ts`.
- Analytics report helper functions live in `client/lib/analytics/api.ts`.
- React context usage found in production source is limited to reusable UI internals such as chart config and OTP input context, not app-wide finance state.

## Mock Data Inventory

- No repository-owned production mock data file was found under `client/app`, `client/components`, `client/lib`, or `client/store`.
- No production hardcoded finance fixture module was found in phase 00.3 scans.
- Default bootstrap data exists on the backend, not as frontend mocks:
  - `server/app/modules/finance_defaults.py` creates a default Cash account when an empty user lists accounts.
  - `server/app/modules/finance_defaults.py` creates default income and expense categories when an empty user lists categories.
- UI placeholder strings still exist in forms, but they are input placeholders and not runtime finance records.
- Test fixtures exist under `server/tests`; they are test-only and not production data sources.

## Account Data Behavior

- Accounts are persisted in the backend `accounts` table and exposed through typed frontend helpers in `client/lib/finance/api.ts`.
- Account fields include `name`, `type`, `currency`, `opening_balance`, `is_archived`, `archived_at`, timestamps, and ownership by `user_id`.
- Supported account types are `cash`, `bank`, `card`, `mobile_pay`, `wallet`, `savings`, and `other`.
- `opening_balance` is non-negative and is used by dashboard available-balance calculations.
- Account currency is a three-letter code and the sidebar account create form uses the signed-in user's `base_currency`.
- Listing accounts requests `include_archived=false`; archived accounts are excluded from normal frontend lists.
- The backend auto-creates one default Cash account with opening balance `0` when a user with no accounts lists accounts.
- Duplicate active account names are rejected per user.
- Account archive/delete is blocked if the account is referenced by finance records.
- There is no default/primary account field in the account model or frontend account UI.
- The frontend account board supports create and delete/archive behavior, but not edit behavior.

## Transaction Data Behavior

- Transactions are persisted in the backend `transactions` table and tied to a user-owned account.
- Income and expense transactions require a category; transfer debit/credit rows do not use categories.
- Transaction fields include `account_id`, optional `category_id`, `type`, `amount`, `currency`, `transaction_at`, optional `description`, `voided_at`, and timestamps.
- Transaction create uses account currency as the transaction currency.
- Transaction create/update validates active account and category ownership; archived accounts/categories are rejected.
- Expense categories and income categories are separate category records with `kind` values of `expense` and `income`.
- Default income categories include Salary, Business, Freelance, Investments, and Other.
- Default expense categories include Groceries, Dining, Transport, Housing, Utilities, Entertainment, Health, Shopping, Bills & Fees, and Other.
- The transaction form stores selected account/source, category, amount, date, note, recurring flag, and recurring period in local component state.
- Recurring rule creation supports income and expense only, with Daily, Weekly, Monthly, and Yearly UI options mapped to backend frequencies.
- Recurring rules persist account, category, type, amount, description, frequency, interval, timezone, start/end bounds, next run state, run count, and status.
- Transfers create paired `transfer_debit` and `transfer_credit` transaction rows plus a transfer link; same-account and cross-currency transfers are rejected.
- Savings transfers create an account debit transaction plus a savings contribution.

## Loan and Debt Data Behavior

- Loan/debt data is persisted through `loan_people`, `loan_records`, and `loan_settlements`.
- People fields include name, phone number, optional note, archive timestamp, and timestamps.
- Phone numbers are unique per user for loan people.
- Loan record fields include person, direction (`given` or `taken`), principal amount, currency, issued date, status (`open`, `settled`, `archived`), optional note, settled timestamp, archive timestamp, and timestamps.
- Loan settlement fields include record, amount, currency, settlement date, optional note, and created timestamp.
- Given loans and taken loans are represented by the `direction` field.
- Outstanding amount is calculated as principal minus settled amount, floored at zero in the response.
- A record becomes settled when total settlements reach or exceed principal.
- The current model has `issued_at` and settlement dates, but no separate repay date field.
- The current model has no account connection for loan records or settlements.
- No explicit overdue state or due-date calculation was found.
- Loan summary returns `total_loan_given`, `total_loan_taken`, and `due_loan`, where `due_loan` is given minus taken for the selected currency.

## Home Dashboard Calculations

- The home dashboard calls `/api/v1/reports/dashboard` through `useDashboardData`.
- Available balance is calculated on the backend as active account opening balances plus income and transfer credits, minus expenses and transfer debits, excluding voided transactions and archived accounts.
- Income total and expense total come from non-voided income/expense transactions in the selected report period.
- Dashboard chart buckets sum the selected transaction type by week, month, or year bucket.
- Recent transactions are loaded separately from `/api/v1/transactions?limit=6` and category labels are resolved with `/api/v1/categories`.
- Budget display is not shown on the home dashboard; budget usage is shown on analytics and budget pages.
- Loans/debts are not included in the home dashboard available balance or income/expense totals.

## Settings Data Behavior

- Settings currently updates `users.base_currency` through `PATCH /api/v1/users/me`.
- The auth store user object is updated locally after a successful settings save.
- The backend enforces the current monthly base-currency change guard, and the settings UI shows a conflict message when a second actual change is rejected.
- Settings does not currently allow configuring which accounts feed the home balance.
- Settings does not currently allow selecting a budget source for dashboard display.
- Settings does not currently allow selecting account or budget display rules for home dashboard calculations.

## Data Gaps Against Requested Requirements

- There is no standalone account page or route; account management is embedded in the sheet menu.
- There is no account primary/default flag.
- The frontend account board does not expose account editing.
- Loan/debt records do not have repay dates.
- Loan/debt records are not connected to accounts.
- Loan/debt records do not expose an overdue state.
- Home dashboard balance source is fixed by backend report logic and cannot be configured by the user.
- Settings has no dashboard account/budget selection controls.
- Recurring expense and recurring income popup behavior is not implemented; recurring is currently a form toggle and frequency selector only.

## Phase 00.3 Check Results

- `cd client && npm run build`: passed after approved rerun. The sandboxed run failed because Next.js could not fetch the configured Google-hosted Urbanist font.
- `cd client && npm run lint`: not run because no lint script exists.
- `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q`: passed after approved rerun with `167 passed, 1 warning`. The sandboxed run failed because the disposable PostgreSQL fixture could not bind `127.0.0.1`.
- No baseline data/domain bugs required repair in phase 00.3.
