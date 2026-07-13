# Agent 05 Test Report

## Branch

`feature/transaction-category-account-rules`

## Commands Run

- `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check .`
- `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check .`
- `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app`
- `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q`
- `cd client && npm run api:check`
- `cd client && npm run build`
- `cd client && npm run e2e`

The client has no `lint`, `typecheck`, or unit `test` script.

## Passing Checks

- Ruff lint passed.
- Ruff format check passed for 163 files.
- Mypy passed with no issues in 110 source files.
- Full backend suite passed with `174 passed, 1 warning`.
- The warning is the existing Starlette/httpx test-client deprecation warning.
- Generated API contract check passed.
- Production frontend build passed and generated the transaction routes.
- Phase-specific backend coverage passes for category bootstrap, disabled-account rejection, selected-account persistence, income/expense balance effects, idempotency, edit/account-move adjustment, void reversal, Home totals, loan exclusion, and future recurring-rule exclusion.

## Failing Checks

- Full-stack E2E: `1 failed` before the transaction workflow began.
- The failure is an existing Settings/Home balance-source assertion: after saving `Loan Wallet` as the Home source, the E2E expected the `Loan Wallet` label on Home but it was not rendered.
- No Agent 05 transaction assertion failed, and phase 05.8 did not change Agent 04 Settings/Home source behavior.

## Bugs Fixed

- Added Hangout, Vacation, and Party as default expense transaction categories, including existing-user backfill and icons.
- New Expense and Income forms select the active default account, then the first active account as fallback.
- Transaction account dropdowns exclude disabled accounts and allow active-account overrides.
- Backend transaction operations reject disabled account references.
- Account current balances include non-voided income and expense effects for the selected account only.
- Transaction edit/account-move and void behavior now adjusts balances through ledger recomputation without double counting.
- Transaction list, detail, and Home recent amounts use selected-account currency with safe stored-currency fallback.
- Mixed-currency transaction activity is displayed as separate currency totals.
- Home income/expense totals remain transaction-only and exclude loans and future recurring placeholders.

## Manual Verification Checklist

- [x] Hangout appears in the default expense category source and icon map.
- [x] Vacation appears in the default expense category source and icon map.
- [x] Party appears in the default expense category source and icon map.
- [x] Expense and Income creation resolve the active default account.
- [x] Missing default falls back to the first active account.
- [x] User can override the selected account through the existing dropdown UI.
- [x] Disabled accounts are absent from new transaction account options.
- [x] Selected account IDs are persisted in transaction payloads and records.
- [x] Income increases only the selected account balance.
- [x] Expense decreases only the selected account balance.
- [x] Edit/account-move and void behavior recompute affected account balances.
- [x] Transaction rows and detail drawers use selected-account currency.
- [x] Missing account lookup falls back to stored transaction currency, then USD.
- [x] Home income includes only income transaction rows.
- [x] Home expense includes only expense transaction rows.
- [x] Given and taken loans are excluded from Home income/expense totals.
- [x] Future recurring rules are excluded until they materialize transaction rows.
- [x] No recurring popup behavior was implemented.

## Deferred Work

- Agent 04's Settings/Home selected-source E2E failure remains outside Agent 05 transaction scope.
- Transfer debit/credit effects remain excluded from the phase 05.5 account transaction adjustment because that phase was limited to income and expense.
- No currency conversion engine was added.
- Recurring expense warning and recurring income achievement popups remain assigned to Agents 06 and 07.

## Safe Starting Point for Agent 06

- Preserve the active/default account selection and selected-account ID payload behavior in the shared transaction form.
- Preserve selected-account currency display and ledger-derived income/expense balances.
- Add only the recurring expense warning/confirmation flow; do not change one-time transaction creation, account rules, category rules, Home totals, loans, or currency conversion.
