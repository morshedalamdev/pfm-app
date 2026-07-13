# Agent 06 Test Report

## Branch

- `feature/recurring-expense-warning-popup`

## Commands Run

```bash
cd server && .venv/bin/pytest -q tests/test_recurring_due_dates.py tests/test_recurring_reminders.py tests/test_recurring_rules.py tests/test_recurring_schema.py tests/test_recurring_worker.py tests/test_transactions.py
cd server && .venv/bin/pytest -q
cd server && .venv/bin/ruff check .
cd server && .venv/bin/ruff format --check .
cd server && .venv/bin/mypy app
cd client && npm run api:check
cd client && npx tsc --noEmit
cd client && node --check e2e/pfm.e2e.spec.mjs
cd client && npm run build
cd client && npm run e2e
```

## Passing Checks

- Agent 06 recurring-expense regression suite: `49 passed, 1 warning`.
- Full backend suite: `192 passed, 1 warning`.
- Ruff lint passed.
- Ruff format check passed for 166 files.
- Mypy passed with no issues in 110 source files.
- Generated API contract check passed.
- TypeScript no-emit check passed.
- E2E test syntax check passed.
- Frontend production build passed after allowing the configured Urbanist font download.
- Focused Playwright recurring-expense Delete/Close persistence and queue test passed.
- The warning is the existing Starlette/httpx test-client deprecation warning.

## Failing Checks

- The complete Playwright command reports `1 passed, 1 failed` because the separate monolithic finance journey remains on its authenticated loading screen when it opens the Accounts page after the focused test.
- The recurring-expense test completes successfully before that failure. The failure is outside Agent 06 behavior and has reproduced across prior phases at different unrelated baseline setup requests.
- Client `lint` and unit `test` scripts are not available.

## Bugs Fixed

- Prevented recurring expenses from being claimed by the automatic recurring worker.
- Added persistent monthly completion state and correct monthly due-window calculations.
- Added deterministic, deduplicated app-load reminder queues.
- Added the warning popup with responsive and accessible recurring-expense details.
- Added idempotent Paid behavior using the clicked timestamp and selected account.
- Added soft-delete and temporary Close behavior without unintended ledger changes.
- Fixed dialog queue advancement so one completed reminder cannot dismiss the next reminder.
- No additional Agent 06 defect was found or fixed during phase 06.8.

## Date-Based Test Cases

- Normal monthly due date: passed.
- January 31 to February month-end fallback: passed.
- March 31 to April month-end fallback: passed.
- Before due date: excluded.
- On due date: included.
- After due date through month end: included.
- Paid current month: excluded through month end.
- Paid prior month: eligible again at the next due time.
- Unpaid prior-month reminder: expires at month boundary and does not carry over.
- Rule-timezone period key across a UTC month boundary: passed.
- Multi-month interval, ended, paused, archived, future, income, and non-monthly rules: excluded from the expense queue.

## Manual Verification Checklist

- [x] Creating a recurring expense does not create a transaction or deduct a balance.
- [x] The reminder appears at the due time and throughout the same rule-local month.
- [x] The reminder does not appear before the due time.
- [x] The popup uses warning styling and shows category, note, amount, account, currency, and due date.
- [x] Paid creates exactly one normal expense using the click timestamp and recurring rule fields.
- [x] Paid decreases only the selected account once and keeps the rule active.
- [x] Paid suppresses the current month and the rule reactivates at the next month's due time.
- [x] Delete archives the rule without a transaction or balance change and prevents future reminders.
- [x] Close dismisses only the current view and the reminder returns on the next app load.
- [x] Multiple reminders are deterministic, deduplicated, and advance one at a time.
- [x] Recurring income behavior was not added to the expense popup or Paid endpoint.

## Deferred Work

- Recurring income behavior remains reserved for Agent 07.
- The unrelated monolithic Playwright loading timeout remains outside Agent 06 scope.
- The existing Starlette/httpx deprecation warning remains.
- Client lint and unit-test commands remain unavailable.

## Safe Starting Point for Agent 07

- Recurring expense rules are isolated from automatic worker claims and handled by the app-load warning queue.
- Existing recurring income worker behavior remains unchanged.
- Agent 07 can begin from the active recurring-income model and worker paths without changing the completed expense reminder contract.
