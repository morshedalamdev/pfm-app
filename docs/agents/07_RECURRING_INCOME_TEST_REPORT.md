# Agent 07 Test Report

## Branch

- `feature/recurring-income-achievement-popup`

## Commands Run

```bash
cd server && .venv/bin/pytest -q tests/test_recurring_due_dates.py tests/test_recurring_reminders.py tests/test_recurring_rules.py tests/test_recurring_schema.py tests/test_recurring_worker.py tests/test_transactions.py tests/test_dashboard_reports.py
cd server && .venv/bin/pytest -q
cd server && .venv/bin/ruff check .
cd server && .venv/bin/ruff format --check .
cd server && .venv/bin/mypy app
cd client && npm run api:check
cd client && npx tsc --noEmit
cd client && node --check e2e/pfm.e2e.spec.mjs
cd client && npm run build
cd client && npm run e2e
cd client && npm run e2e -- --grep "recurring expense actions and income achievement popup are safe"
cd client && npm run e2e -- --grep "recurring income Delete is permanent and Close is temporary"
cd client && npm run e2e -- --grep "received income stays hidden after reload without suppressing expense"
```

The three filtered commands used a temporary local argument-forwarding hook in the E2E runner. The hook was removed after verification and is not part of the phase changes.

## Passing Checks

- Focused recurring-income, transaction, and dashboard regression matrix: `72 passed, 1 warning`.
- Full backend suite: `211 passed, 1 warning`.
- Ruff lint passed.
- Ruff format check passed for 167 files.
- Mypy passed with no issues in 110 source files.
- Generated API contract check passed.
- TypeScript no-emit check passed.
- E2E JavaScript syntax check passed.
- Frontend production build passed.
- Mixed recurring expense/income queue, achievement UI, Received, balance, and Home-income scenario passed in isolation: `1 passed`.
- Income Delete, Close, reload, transaction, and balance-safety scenario passed in isolation: `1 passed`.
- Received persistence, repeated reload, transaction uniqueness, balance uniqueness, and expense-isolation scenario passed in isolation: `1 passed`.
- The backend warning is the existing Starlette/httpx test-client deprecation warning.
- Client `lint`, `typecheck`, and unit `test` scripts are not available; the TypeScript compiler was run directly.

## Failing Checks

- The complete Playwright command reports `1 passed, 3 failed` because tests after the first scenario time out on the registration page after account creation and before the login request is sent.
- The same three Agent 07 recurring-income scenarios pass when each runs against a fresh disposable harness, confirming no recurring-income assertion failure.
- The separate integrated finance journey is also affected by the same pre-existing sequential-harness registration timeout.

## Bugs Fixed

- Agent 07 removed automatic income materialization and added due-only recurring-income reminders.
- Received now creates one idempotent normal income transaction using the click timestamp and selected recurring-rule fields, with one ledger-derived balance and Home-income effect.
- Current-month completion, next-month recurrence, permanent Delete, temporary Close, deterministic mixed queues, and expense/income completion isolation are covered.
- No additional production defect was found or fixed during phase 07.8.

## Date-Based Test Cases

- Normal monthly due date: passed.
- January 31 to February month-end fallback: passed.
- March 31 to April month-end fallback: passed.
- Before due date and due time: excluded.
- On due date and due time: included.
- After due date through rule-local month end: included.
- Received current month: excluded through month end and after repeated reloads.
- Received prior month: eligible again exactly at the next scheduled due time.
- Unreceived prior-month reminder: expires at the month boundary and does not carry over.
- Rule-timezone period keys across UTC month boundaries: passed.
- Multi-month interval, ended, inactive, archived, future, non-monthly, and wrong transaction-type rules: excluded.

## Mixed Reminder Test Cases

- Income and expense reminders sort deterministically by due timestamp, rule ID, and type: passed.
- Duplicate occurrences remain deduplicated without one reminder type suppressing the other: passed.
- Only the shared queue head opens, and advancing an expense reveals the next income reminder: passed.
- Received income suppresses only its own occurrence and leaves a due expense visible after reload: passed.
- Paid expense state does not suppress a due income rule, and received income state does not suppress a due expense rule: passed.
- Expense amber styling, content, Paid/Delete/Close actions, and completion behavior remain unchanged: passed.

## Manual Verification Checklist

- [x] Creating a recurring income rule does not create a transaction or increase a balance.
- [x] The reminder appears at the due time and throughout the same rule-local month.
- [x] The reminder does not appear before the due time.
- [x] The popup uses green achievement styling and asks whether the named income was received.
- [x] The popup shows category, note, amount, account, currency, and due date.
- [x] Received creates exactly one normal income transaction using the click timestamp and recurring rule fields.
- [x] Received increases only the selected account once and updates Home income once.
- [x] Received suppresses the current month while keeping the recurring rule active.
- [x] Received completion stays hidden after reload and the next scheduled month becomes eligible.
- [x] Delete archives the rule without a transaction or balance change and prevents future reminders.
- [x] Close dismisses only the current view and the reminder returns on the next app load.
- [x] Multiple income and mixed income/expense reminders remain deterministic and isolated.
- [x] Recurring expense warning behavior and amber presentation remain unchanged.

## Deferred Work

- The pre-existing sequential Playwright registration timeout remains outside Agent 07 behavior; every Agent 07 browser scenario passes in isolation.
- The existing Starlette/httpx test-client deprecation warning remains.
- Client lint and unit-test commands remain unavailable.
- Agent 08 planning and generation has not started.

## Safe Starting Point for Agent 08

- Recurring income is reminder-driven and never auto-materialized by the worker.
- Received, Delete, Close, persistence, monthly reactivation, and mixed-queue behavior are implemented and regression-covered.
- Recurring expense behavior remains isolated and regression-stable.
- Agent 08 should begin only after explicit permission and treat the Agent 07 API, queue, completion, and popup contracts as completed dependencies.
