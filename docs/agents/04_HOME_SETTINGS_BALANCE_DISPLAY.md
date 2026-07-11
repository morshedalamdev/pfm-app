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
