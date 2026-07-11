# Agent 03 Test Report

## Branch

- `feature/loan-debt-account-integration`
- Verification phase: `03.8 Loan/Debt Regression Verification`

## Commands Run

- `cd client && npm run build`
- `cd client && npm run api:check`
- `cd client && npm run e2e`
- `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check app tests`
- `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check app tests alembic/versions`
- `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app`
- `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests/test_loans.py tests/test_accounts_categories.py`
- `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q`
- `git diff --check`

The client has no `lint`, `typecheck`, or `test` script, so those commands were not run. The sandboxed production build could not fetch the configured Google-hosted Urbanist font; the approved rerun passed.

## Passing Checks

- Frontend production build passed for all 18 routes.
- Generated frontend API contract is current.
- Full-stack Chromium E2E passed with `1 passed`.
- Ruff lint passed and 159 files passed the format check.
- Strict mypy passed for 110 source files.
- Focused loan/account tests passed with `14 passed, 1 warning`.
- Full backend tests passed with `171 passed, 1 warning`.
- `git diff --check` passed.

## Failing Checks

- None.
- The single backend warning is the existing Starlette `TestClient` deprecation warning for the installed `httpx` integration.

## Bugs Fixed

- No product bugs were found or fixed during phase 03.8.
- No loan/debt implementation behavior changed during verification.

## Manual Verification Checklist

- [x] Given loans require and retain a selected account: backend create validation and form payload inspection.
- [x] Taken loans require and retain a selected account: backend create validation and form payload inspection.
- [x] The active default account auto-selects for a new loan: `resolveAccountSelectValue` form-path inspection.
- [x] Users can change the selected account: account-option change-handler inspection.
- [x] Given loans deduct once from the selected account: focused backend balance assertions.
- [x] Taken loans add once to the selected account: focused backend balance assertions.
- [x] Repay dates are required, validated, persisted, and displayed: backend tests and form/list inspection.
- [x] Unpaid past-due loans render the destructive red state: E2E assertion.
- [x] The loan page renders exactly two summary cards: E2E assertion.
- [x] Given Loan Due sums unpaid given balances: backend settlement/summary lifecycle assertions.
- [x] Taken Loan Due sums unpaid taken balances: backend settlement/summary lifecycle assertions.
- [x] Loan list amounts use the linked account currency: E2E BDT account assertion with a mismatched stored loan currency.
- [x] Disabled accounts are excluded from new loan choices: active-account filtering inspection and backend rejection test.
- [x] Historical loans retain disabled account references and remain displayable: backend historical-update test and edit/list account-loading inspection.

## Deferred Work

- Loan settlements do not adjust account balances.
- Archiving or deleting a loan does not reverse its original account balance effect.
- Summary cards remain filtered to the user's base currency; cross-currency conversion and aggregation are not implemented.
- Legacy loans without an account reference use their stored currency and do not affect account balances.

## Safe Starting Point for Agent 04

- Agent 03 phases 03.1 through 03.8 are complete on `feature/loan-debt-account-integration`.
- Account selection, balance effects, repay dates, overdue styling, two-card due summaries, account-currency list display, generated API contracts, migrations, and regression checks are passing.
- Agent 04 may begin planning/generation only after explicit user permission and must preserve the deferred-work boundaries above unless its own scope explicitly changes them.
