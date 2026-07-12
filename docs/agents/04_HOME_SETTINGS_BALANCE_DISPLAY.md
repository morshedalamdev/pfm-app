# Agent 04 — Settings and Home Page Balance Rules

## Phase 04.1 — Settings and Home Baseline Audit

## Files Inspected

- `AGENT.md`
- `docs/audit/00_CURRENT_APP_AUDIT.md`
- `docs/agents/02_ACCOUNT_PAGE_AND_RULES.md`
- `docs/agents/02_ACCOUNT_TEST_REPORT.md`
- `docs/agents/03_LOAN_DEBT_ACCOUNT_INTEGRATION.md`
- `docs/agents/03_LOAN_DEBT_TEST_REPORT.md`
- `client/package.json`
- `client/app/(dashboard)/settings/page.tsx`
- `client/app/(dashboard)/page.tsx`
- `client/lib/dashboard/useDashboardData.ts`
- `client/lib/finance/api.ts`
- `server/app/modules/accounts/models.py`
- `server/app/modules/accounts/repositories.py`
- `server/app/modules/accounts/services.py`
- `server/app/modules/budgets/models.py`
- `server/app/modules/budgets/schemas.py`
- `server/app/modules/budgets/router.py`
- `server/app/modules/reports/repositories.py`
- `server/app/modules/reports/services.py`
- `server/app/modules/users/models.py`
- `server/app/modules/users/schemas.py`
- `server/app/modules/loans/services.py`
- `server/tests/test_dashboard_reports.py`

## Current Settings Behavior

- The settings page only exposes the user's base currency preference.
- Saving settings sends `PATCH /api/v1/users/me` with `base_currency`.
- Successful saves update the auth store user and show `Settings updated.`
- Currency conflict responses show `Currency can only be changed once per month.`
- No setting currently exists for home/dashboard balance source selection.
- The user model and update schema do not currently contain a dashboard/home balance source preference field.

## Current Home Dashboard Behavior

- The home page loads report data through `useDashboardData()`.
- `useDashboardData()` calls `GET /api/v1/reports/dashboard` with `period` and transaction `type`.
- The home page displays:
  - `available_balance` from the dashboard report.
  - `income_amount` from the dashboard report.
  - `expense_amount` from the dashboard report.
  - chart buckets from the dashboard report.
  - recent transactions from `GET /api/v1/transactions?limit=6` plus categories from `GET /api/v1/categories`.
- The home page uses the dashboard report currency, defaulting to `USD` before a report is loaded.

## Current Balance Source

- The home available balance is currently a server-calculated aggregate from `ReportRepository.calculate_active_available_balance()`.
- The aggregate includes active, non-archived account opening balances plus transaction effects.
- Transaction effects add `income` and `transfer_credit`, subtract `expense` and `transfer_debit`, and ignore voided transactions.
- The aggregate excludes archived accounts but does not exclude disabled accounts.
- The aggregate does not read a selected account, default account, or budget plan.
- The aggregate does not use `Account.current_balance` and does not include `loan_balance_adjustment` added by Agent 03.

## Current Income/Expense Calculation

- Dashboard income and expense come from `ReportRepository.calculate_period_income_expense()`.
- Income totals include only non-voided transactions with `type == "income"` in the requested report period.
- Expense totals include only non-voided transactions with `type == "expense"` in the requested report period.
- Transfer rows are excluded from the income and expense summary cards.
- Dashboard chart buckets sum only the selected report transaction type, `income` or `expense`.

## Current Budget Data Availability

- Budget APIs exist under `/api/v1/budgets`.
- Frontend helpers expose `listBudgets(month)`, `createBudget()`, `updateBudget()`, and `deleteBudget()`.
- Budget responses include `limit_amount`, `currency`, and `progress.remaining_amount`.
- Budget listing supports an optional month filter and excludes archived budgets by default.
- Existing home dashboard UI does not load or display budget data.
- Existing monthly report logic can compute budget usage, but home balance source selection is not wired to it.

## Current Loan Inclusion Behavior

- Loan records are stored separately from transactions and are not part of the transaction list used by dashboard income and expense totals.
- Current dashboard income and expense totals do not include loan/debt records because they filter only transaction rows by `income` and `expense` types.
- Agent 03 loan creation updates `Account.loan_balance_adjustment`.
- The home available balance currently ignores that loan adjustment because it recomputes from `opening_balance` plus transactions only.
- Loan settlements do not adjust account balances per Agent 03 deferred work.

## Planned Files to Change

- `client/app/(dashboard)/settings/page.tsx`
- `client/app/(dashboard)/page.tsx`
- `client/lib/dashboard/useDashboardData.ts`
- `client/lib/finance/api.ts`
- `client/lib/finance/accounts.ts`
- `server/app/modules/users/models.py`
- `server/app/modules/users/schemas.py`
- `server/app/modules/users/services.py`
- `server/app/modules/reports/repositories.py`
- `server/app/modules/reports/services.py`
- `server/alembic/versions/*`
- `server/tests/test_dashboard_reports.py`
- `server/tests/test_users_profile.py`
- `client/generated/openapi.json`
- `client/generated/api-types.ts`
- `docs/agents/04_HOME_SETTINGS_BALANCE_DISPLAY.md`

## Risks

- Adding a persistent home balance source preference likely requires a user schema/model migration and generated API updates.
- Account balance display must use account currency and must not invent currency conversion.
- Budget source display should use existing budget remaining values only; no new budget planning logic should be added.
- The dashboard report's current aggregate balance may conflict with Agent 03 account balances because it ignores `loan_balance_adjustment`.
- Disabled account handling for home balance source needs an explicit rule in implementation because the current dashboard aggregate only filters archived accounts.
- Client build may need network access for the configured Google-hosted font fetch.
- Backend tests may need localhost binding for the disposable PostgreSQL fixture.

## Check Results

- `cd client && npm run build`: passed after approved rerun. The sandboxed run failed because Next.js could not fetch the configured Google-hosted Urbanist font.
- `cd client && npm run lint`: not run because no `lint` script exists.
- `cd client && npm run typecheck`: not run because no `typecheck` script exists.
- `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q`: passed after approved rerun with `171 passed, 1 warning`. The sandboxed run failed because the disposable PostgreSQL fixture could not bind `127.0.0.1`.

## Bugs Fixed

- None. No baseline code changes were required in phase 04.1.

## Phase 04.2 — Home Balance Source Setting

## Setting Name

- `Home Balance Source`

## Source Types

- `account`
- `budget`, shown only when current-month budget data exists or when a budget source is already saved on the user profile.
- `automatic` UI fallback, persisted as `null` source type and `null` source id.

## Persistence Behavior

- The setting is persisted on the current user profile through `PATCH /api/v1/users/me`.
- The backend stores `home_balance_source_type` and `home_balance_source_id` on `users`.
- The API response exposes both fields through `UserResponse`.
- The API update request accepts both fields through `UserUpdateRequest`.
- A source type and source id must be saved together.

## Missing Source Fallback

- Clearing the setting stores `null` type and `null` id so later home-display phases can use automatic fallback.
- If the UI is left without a source id for an account or budget source, save is blocked and the user can choose automatic fallback.
- Full account/budget existence fallback remains for phase 04.3 and phase 04.4 when source options and home display are connected.

## UI Behavior

- Settings now shows a `Home Balance Source` section below currency.
- Users can choose automatic fallback, account, or budget when budget source data is available.
- Account or budget selection captures a source id without loading account or budget option lists in this phase.
- Account creation, loan, transaction, and recurring behavior were not changed.

## Phase 04.2 Check Results

- `cd client && npm run build`: passed after an approved rerun allowed the configured Google-hosted Urbanist font fetch.
- `cd client && npm run lint`: not run because no `lint` script exists.
- `cd client && npm run typecheck`: not run because no `typecheck` script exists.
- `cd client && npm run api:check`: passed.
- `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q`: passed with `172 passed, 1 warning` after an approved rerun allowed the disposable PostgreSQL fixture to bind `127.0.0.1`.
- `cd server && PATH="$PWD/.venv/bin:$PATH" python -m compileall app tests`: passed.
- `git diff --check`: passed.

## Phase 04.2 Bugs Fixed

- None beyond the phase implementation.

## Phase 04.3 — Account and Budget Source Options

## Account Source Rule

- Settings loads accounts through the existing `listAccounts` API helper.
- Only active accounts are offered as new Home Balance Source choices.
- Account options store the account id with source type `account`.

## Disabled Account Handling

- Disabled and archived accounts are excluded with the shared Agent 02 active-account rule.
- If the saved account source is no longer active, the form switches to automatic fallback and warns that the previous source is unavailable.

## Budget Source Rule

- Settings loads existing, non-archived budget plans for the current month through `listBudgets`.
- Budget options are shown only when those plans already exist and store the budget id with source type `budget`.
- No budget setup or creation behavior was added.

## Empty State

- Automatic fallback remains selectable when there are no active accounts or existing budget plans.
- The source list states that no active accounts or budget plans are available.
- If either source request fails, the successfully loaded source type remains usable and the form reports that some sources could not be loaded.

## Labels

- Account options show account name and currency.
- Budget options show category name or `Monthly Budget`, plan month and year, and currency.

## Phase 04.3 Check Results

- `cd client && npm run build`: passed.
- `cd client && npm run lint`: not run because no `lint` script exists.
- `cd client && npm run typecheck`: not run because no `typecheck` script exists.
- `cd client && npm run api:check`: passed.
- `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q`: passed with `172 passed, 1 warning`.
- `git diff --check`: passed.

## Phase 04.3 Bugs Fixed

- Prevented a temporary account or budget API failure from being treated as proof that a previously selected source no longer exists.

## Phase 04.4 — Home Balance Connected to Selected Source

## Account Display Rule

- A valid selected account displays its `current_balance` on the Home available balance card.
- Disabled and archived selected accounts are treated as missing sources.
- The account name is shown below the balance.

## Budget Display Rule

- A valid selected current budget plan displays its existing `progress.remaining_amount`.
- The card label changes to `Budget Remaining` and shows the budget category or `Monthly Budget` with its period.
- No budget planning or creation logic was added.

## Currency Display Rule

- Account balances use the selected account currency.
- Budget remaining balances use the selected budget currency.
- No currency conversion is performed.

## Fallback Rule

- If the selected source is missing, disabled, archived, or not current, Home uses the active default account.
- If no active default account exists, Home uses the first active account.
- Automatic source selection follows the same default-account then first-active-account order.

## Empty State

- If no selected source or active fallback account can be resolved, Home displays `--` and `No balance source available`.
- Source loading failures are shown without replacing a successfully resolved balance, and a retry action is available when no balance can be resolved.

## Phase 04.4 Check Results

- `cd client && npm run build`: passed.
- `cd client && npm run lint`: not run because no `lint` script exists.
- `cd client && npm run typecheck`: not run because no `typecheck` script exists.
- `cd client && npm run api:check`: passed.
- `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q`: passed with `172 passed, 1 warning`.
- `git diff --check`: passed.

## Phase 04.4 Bugs Fixed

- Home available balance no longer ignores the saved source by always displaying the aggregate dashboard report balance.
