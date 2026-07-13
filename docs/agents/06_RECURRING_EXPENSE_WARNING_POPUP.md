# Agent 06 — Recurring Expense Warning Popup

## Phase 06.1 — Baseline and Dependency Audit

## Files Inspected

- `AGENT.md`
- `docs/audit/00_CURRENT_APP_AUDIT.md`
- `docs/audit/01_FEATURE_IMPLEMENTATION_CHECKLIST.md`
- `docs/audit/02_BASELINE_TEST_REPORT.md`
- `docs/agents/02_ACCOUNT_PAGE_AND_RULES.md`
- `docs/agents/02_ACCOUNT_TEST_REPORT.md`
- `docs/agents/05_TRANSACTION_CATEGORY_ACCOUNT_RULES.md`
- `docs/agents/05_TRANSACTION_TEST_REPORT.md`
- `client/package.json`
- `client/app/layout.tsx`
- `client/app/(dashboard)/layout.tsx`
- `client/app/(dashboard)/transaction/[id]/page.tsx`
- `client/components/items/TransactionItem.tsx`
- `client/components/ui/alert-dialog.tsx`
- `client/components/ui/dialog.tsx`
- `client/lib/finance/accounts.ts`
- `client/lib/finance/api.ts`
- `server/app/modules/accounts/models.py`
- `server/app/modules/accounts/repositories.py`
- `server/app/modules/recurring/models.py`
- `server/app/modules/recurring/repositories.py`
- `server/app/modules/recurring/router.py`
- `server/app/modules/recurring/schedule.py`
- `server/app/modules/recurring/schemas.py`
- `server/app/modules/recurring/services.py`
- `server/app/modules/transactions/models.py`
- `server/app/modules/transactions/repositories.py`
- `server/app/modules/transactions/router.py`
- `server/app/modules/transactions/schemas.py`
- `server/app/modules/transactions/services.py`
- `server/app/workers/recurring.py`
- `server/tests/test_accounts_categories.py`
- `server/tests/test_recurring_rules.py`
- `server/tests/test_recurring_schema.py`
- `server/tests/test_recurring_worker.py`
- `server/tests/test_transactions.py`
- `compose.yml`
- `render.yaml`

## Current Recurring Behavior

- The transaction create form has a local recurring toggle and `Daily`, `Weekly`, `Monthly`, and `Yearly` frequency options.
- When recurring is enabled for an income or expense, the form creates a recurring rule instead of creating an immediate transaction. The selected form date becomes `start_at` and therefore the initial `next_run_at`.
- A separately runnable recurring worker claims every due active rule, including expense rules, and automatically inserts a normal transaction at the scheduled due timestamp.
- The worker advances `next_run_at`, records `last_run_at`, `last_run_key`, and `run_count`, and emits a durable outbox event. Its deterministic run key prevents duplicate creation for the same rule occurrence.
- Because account balances are ledger-derived, an automatically created expense transaction automatically decreases the selected account balance. Merely creating a future recurring rule does not change the balance.
- The worker is part of the local Compose topology. The current free Render configuration does not deploy it, but documentation supports adding it as a paid background worker.
- No app-load reminder detection, recurring-expense warning popup, Paid action, temporary dismissal, due-window state, or monthly paid-completion history exists.

## Current Recurring Fields

- Persisted rule fields: `id`, `user_id`, `account_id`, `category_id`, `transaction_type`, `amount`, `currency`, `description`, `frequency`, `interval_count`, `timezone`, `start_at`, `end_at`, `next_run_at`, `last_run_at`, `last_run_key`, `run_count`, `status`, `paused_at`, `archived_at`, worker lock fields, and timestamps.
- Supported transaction types are `income` and `expense`.
- Supported frequencies are `daily`, `weekly`, `monthly`, and `yearly`.
- Supported statuses are `active`, `paused`, and `archived`.
- Monthly and yearly scheduling already clamp an anchor day to the final valid day of a shorter month while preserving the configured local wall-clock time.
- There is a next due timestamp through `next_run_at`.
- There is execution history for only the latest automated occurrence plus a cumulative run count. There is no per-month completion history or `lastPaidPeriod` equivalent.
- Transaction rows do not store a recurring flag or recurring-rule ID. Recurrence remains represented by the rule and worker metadata.

## Existing Transaction Creation Flow

- The frontend `createTransaction()` helper posts a normal transaction with an idempotency key.
- `TransactionService.create_transaction()` validates the selected active account and matching active category, copies the selected account currency, creates the transaction row, and persists the idempotent response.
- Agent 05 is present: the transaction form auto-selects the active default account with fallback, allows an active-account override, excludes disabled accounts, and persists the selected `account_id`.
- The existing recurring worker does not call `TransactionService.create_transaction()`. It constructs a `Transaction` directly and writes it through `TransactionRepository`, using its own occurrence-level outbox idempotency key.

## Existing Account Balance Flow

- `Account.current_balance` is derived from opening balance, loan adjustment, and non-voided income/expense transaction rows.
- Income adds to the account referenced by the transaction; expense subtracts from only that account.
- Edits, account moves, and voids are reflected by recomputing the ledger aggregate, so there is no second imperative balance mutation.
- Agent 05's selected-account currency and expense balance effect are present and covered by backend tests.

## Existing App-Load Entry Point

- `client/app/layout.tsx` is the global server root layout.
- `client/app/(dashboard)/layout.tsx` wraps authenticated dashboard routes with `AuthGuard` and renders the shared `Footer`.
- The authenticated dashboard layout is the available shared entry point for a future client-side recurring reminder provider or queue after authentication is established.
- No recurring rule fetch or app-load recurring check currently runs in either layout.

## Existing Dialog Components

- `client/components/ui/dialog.tsx` provides a Radix dialog with overlay, focus handling, accessible title/description primitives, and a built-in close icon.
- `client/components/ui/alert-dialog.tsx` provides Radix alert-dialog primitives and action/cancel controls, but it does not include a built-in close icon.
- Existing account details use `Dialog`; account, transaction, loan, and savings deletion confirmations use `AlertDialog`.
- No warning-specific recurring popup component or reminder queue exists.

## Planned Files to Change

- `server/app/modules/recurring/models.py`
- `server/app/modules/recurring/schemas.py`
- `server/app/modules/recurring/repositories.py`
- `server/app/modules/recurring/services.py`
- `server/app/modules/recurring/schedule.py`
- `server/app/workers/recurring.py`
- `server/alembic/versions/*`
- `server/tests/test_recurring_rules.py`
- `server/tests/test_recurring_worker.py`
- `client/lib/finance/api.ts`
- `client/app/(dashboard)/layout.tsx`
- a focused client recurring-expense reminder provider/component
- existing dialog primitives only if the focused popup cannot compose their current APIs
- `client/e2e/pfm.e2e.spec.mjs`
- `docs/agents/06_RECURRING_EXPENSE_WARNING_POPUP.md`

## Blockers

- None. Agent 05 provides selected-account persistence, account currency, normal transaction creation, idempotency, and the selected-account expense balance effect required by Agent 06.
- Before reminder behavior is enabled, later Agent 06 phases must prevent the existing worker from auto-creating expense transactions; otherwise an expense could be deducted before the user clicks `Paid`.
- The recurring service currently rejects archived accounts but does not reject disabled accounts on direct API create/update. The current frontend supplies only active accounts, but later recurring-expense API work must preserve Agent 05's disabled-account rule.
- Recurring income worker behavior must remain outside Agent 06's implementation scope.

## Phase 06.1 Check Results

- `cd client && npm run build`: passed after an approved rerun allowed the configured Google-hosted Urbanist font fetch.
- `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q`: passed after an approved rerun allowed the disposable PostgreSQL fixture to bind localhost, with `174 passed, 1 warning`.
- The warning is the existing Starlette/httpx test-client deprecation warning.
- Client `lint`, `typecheck`, and unit `test` scripts are not available.

## Phase 06.1 Bugs Fixed

- None. No baseline code issue required repair during the audit.

## Phase 06.2 — Data Model and Due-Date Helpers

## Recurring Expense Fields

- Existing `account_id`, `category_id`, `amount`, `currency`, `description`, and `frequency` fields remain the recurring expense transaction template.
- Existing `start_at` is the first due date and remains timezone-aware.
- Existing `status` is the active-state source; only `active` rules are eligible for the monthly expense due helper.
- Added nullable `last_paid_period` as the monthly completion equivalent. It stores a validated `YYYY-MM` period key and is exposed by the recurring-rule response type.
- Existing rules migrate with `last_paid_period = null`.
- No transaction row, popup state, or client reminder queue was added.

## Monthly Due Calculation

- `calculate_monthly_due_at()` computes a due timestamp for a requested calendar year and month from the original `start_at` day and local wall-clock time.
- The calculation uses the rule timezone and returns an aware UTC timestamp.
- `is_monthly_expense_due()` accepts only active monthly expense rules, requires the current time to be inside the current monthly due window, and excludes the paid current period.

## Shorter-Month Rule

- If the first due day does not exist in the requested month, the helper uses that month's final valid day.
- January 31 resolves to February 28 in 2026.
- March 31 resolves to April 30.

## Due Window Rule

- `is_monthly_due_window()` returns false before the first due timestamp.
- It returns true from the computed due timestamp through the remainder of that rule-local calendar month.
- A later month is evaluated against its own computed due date, so an unpaid prior month is not carried into a new month before the new due date.
- Paused or archived rules are not eligible through the composed monthly expense due helper.

## Completion Period Key

- `recurring_period_key()` produces `YYYY-MM` in the recurring rule's timezone.
- `is_recurring_period_paid()` compares the current key with `last_paid_period`.
- The database constraint accepts only valid month-shaped keys from `01` through `12`.

## Test Cases

- Normal monthly date: passed.
- January 31 to February end: passed.
- March 31 to April end: passed.
- Before first due date: passed.
- On due date: passed.
- After due date within the same month: passed.
- Already paid current month: passed.
- Inactive rule: passed.
- Rule-timezone period key across a UTC month boundary: passed.
- Completion-field migration upgrade/downgrade/upgrade: passed.

## Phase 06.2 Check Results

- Focused recurring and migration suite: `23 passed, 1 warning`.
- Full backend suite: `183 passed, 1 warning`.
- Ruff lint passed.
- Ruff format check passed for 163 files.
- Mypy passed with no issues in 110 source files.
- Generated API contract check passed.
- Frontend production build passed.
- The warning is the existing Starlette/httpx test-client deprecation warning.
- Client `lint`, `typecheck`, and unit `test` scripts are not available.

## Phase 06.2 Bugs Fixed

- Added the missing persistent monthly completion marker for recurring expenses.
- Added explicit protection against pre-due, already-paid, and inactive monthly expense eligibility in the pure due helper.

## Phase 06.3 — App-Load Detection and Reminder Queue

## Detection Entry Point

- The authenticated dashboard layout now mounts `RecurringExpenseReminderProvider` inside `AuthGuard`.
- The provider performs one due-reminder load when the authenticated app shell mounts and exposes queue, loading, error, and reload state for later popup phases.
- `GET /api/v1/recurring-rules/due-expenses` is the read-only source for the app-load queue.
- No dialog or popup is rendered in this phase.

## Eligibility Filters

- The reminder query loads only owned rules with active status, no archive timestamp, expense transaction type, and monthly frequency.
- Due evaluation requires the current rule-local period to be on or after the first due period and the current time to be on or after that month's computed due timestamp.
- `interval_count` is honored, so multi-month rules appear only in their scheduled months.
- Rules whose configured end time has passed are excluded.
- Rules whose current period matches `last_paid_period` are excluded.

## Duplicate Prevention

- Each reminder has a stable key composed from rule ID and rule-local `YYYY-MM` period.
- The backend queue retains at most one reminder for each stable key.
- The client provider defensively normalizes the response by the same stable key before storing queue state.

## Multiple Reminder Ordering

- The backend orders eligible reminders by computed due timestamp and then rule ID.
- The client preserves the same deterministic due-time and rule-ID order after deduplication.
- The provider exposes the complete ordered queue for the one-at-a-time UI planned in phase 06.4.

## Excluded Rules

- Recurring income rules.
- Daily, weekly, and yearly rules.
- Paused, archived, and ended rules.
- Future rules and rules before the current due timestamp.
- Already completed rules for the current rule-local month.
- Months skipped by an interval greater than one.
- The background recurring worker now claims income rules only, so expense reminders do not create transactions or change account balances before a future Paid action. Existing recurring income worker behavior is preserved.

## Phase 06.3 Check Results

- Pure date/filter/order queue suite: `10 passed`.
- Focused recurring API and worker-safety suite: `11 passed, 1 warning`.
- Full backend suite: `186 passed, 1 warning`.
- Ruff lint passed.
- Ruff format check passed for 164 files.
- Mypy passed with no issues in 110 source files.
- TypeScript no-emit check passed.
- Generated API contract check passed.
- Frontend production build passed.
- The warning is the existing Starlette/httpx test-client deprecation warning.
- Client `lint` and unit `test` scripts are not available.

## Phase 06.3 Bugs Fixed

- Due recurring expenses are no longer claimed by the automatic transaction worker, preventing pre-Paid transaction creation and balance deduction.
- Reminder candidates now exclude duplicate, inactive, income, future, paid, ended, and off-interval rules before reaching the client queue.
