# Agent 07 — Recurring Income Achievement Popup

## Phase 07.1 — Baseline and Dependency Audit

## Files Inspected

- `AGENT.md`
- `docs/audit/00_CURRENT_APP_AUDIT.md`
- `docs/audit/01_FEATURE_IMPLEMENTATION_CHECKLIST.md`
- `docs/audit/02_BASELINE_TEST_REPORT.md`
- `docs/agents/02_ACCOUNT_PAGE_AND_RULES.md`
- `docs/agents/02_ACCOUNT_TEST_REPORT.md`
- `docs/agents/05_TRANSACTION_CATEGORY_ACCOUNT_RULES.md`
- `docs/agents/05_TRANSACTION_TEST_REPORT.md`
- `docs/agents/06_RECURRING_EXPENSE_WARNING_POPUP.md`
- `docs/agents/06_RECURRING_EXPENSE_TEST_REPORT.md`
- `client/package.json`
- `client/app/(dashboard)/layout.tsx`
- `client/app/(dashboard)/transaction/[id]/page.tsx`
- `client/components/recurring/RecurringExpenseReminderProvider.tsx`
- `client/components/recurring/RecurringExpenseWarningPopup.tsx`
- `client/components/ui/alert-dialog.tsx`
- `client/components/ui/dialog.tsx`
- `client/lib/finance/accounts.ts`
- `client/lib/finance/api.ts`
- `server/alembic/versions/202606210601_add_recurring_outbox_schema.py`
- `server/alembic/versions/202607130602_add_recurring_expense_completion.py`
- `server/app/modules/accounts/models.py`
- `server/app/modules/accounts/schemas.py`
- `server/app/modules/recurring/models.py`
- `server/app/modules/recurring/repositories.py`
- `server/app/modules/recurring/router.py`
- `server/app/modules/recurring/schedule.py`
- `server/app/modules/recurring/schemas.py`
- `server/app/modules/recurring/services.py`
- `server/app/modules/transactions/repositories.py`
- `server/app/modules/transactions/services.py`
- `server/app/workers/recurring.py`
- `server/tests/test_recurring_due_dates.py`
- `server/tests/test_recurring_reminders.py`
- `server/tests/test_recurring_rules.py`
- `server/tests/test_recurring_schema.py`
- `server/tests/test_recurring_worker.py`
- `server/tests/test_transactions.py`

## Current Recurring Income Behavior

- The transaction form supports recurring income and expense creation with Daily, Weekly, Monthly, and Yearly frequencies. The selected account, category, amount, note, type, frequency, timezone, and selected date are persisted in a recurring rule.
- Enabling recurrence creates a rule instead of an immediate transaction. A newly created future recurring income rule therefore does not immediately change the transaction ledger or account balance.
- The selected form date is stored as `start_at` and initial `next_run_at`. The recurring model also stores `last_run_at`, `last_run_key`, and `run_count` for automated execution history.
- The background worker currently claims due active income rules only. It automatically creates a normal income transaction at the scheduled `next_run_at`, advances the schedule, updates latest-run metadata, and emits an idempotent outbox event.
- Because account balances are ledger-derived, the worker-created income transaction automatically increases the selected account balance. This is the behavior Agent 07 must replace in later phases; phase 07.1 does not change it.
- Recurring income is therefore not only a stored flag. It is a persisted schedule with a next due timestamp and automatic transaction processing.
- There is no recurring-income received/completion field or history. `last_paid_period` is the Agent 06 expense completion marker; income has only automated worker execution metadata.
- There is no recurring-income due-reminder endpoint, app-load detection, queue entry, Received action, Delete/Close popup behavior, or achievement UI.
- Recurring-rule create/update validates ownership and archive state but does not reject a directly submitted disabled account. The transaction form supplies active accounts only, and the normal transaction service used by a future Received action does reject disabled accounts.

## Existing Transaction Creation Flow

- Agent 05 selected-account behavior is present. New income and expense forms resolve the active default account, fall back to the first active account, allow an active-account override, exclude disabled accounts, and submit the selected `account_id`.
- `createTransaction()` posts a normal typed transaction with a generated idempotency key.
- `TransactionService.create_transaction()` validates the owned active account and matching active category, copies the selected account currency, stores the selected account/category/note/amount/date/type, and supports atomic idempotent creation.
- The Agent 06 Paid action already demonstrates how a recurring confirmation can call the normal transaction service with `commit=False`, apply an occurrence-level idempotency key, and commit the transaction with recurring completion state.
- The current recurring worker bypasses `TransactionService` and writes a `Transaction` directly through `TransactionRepository`; Agent 07 must not duplicate that worker path for Received.

## Existing Account Balance Flow

- `Account.current_balance` is derived from opening balance, loan adjustment, and non-voided income/expense transaction rows for that account.
- Income adds its amount and expense subtracts its amount. The aggregate matches both `account_id` and `user_id`, so only the selected account is affected.
- Transaction creation does not perform a second imperative balance mutation. Edits, account moves, voids, reloads, and idempotent replays remain safe through ledger recomputation.
- The normal transaction service sets transaction currency from the selected account. Agent 05 coverage confirms selected-account persistence, account currency, income balance increase, and transaction-only Home income totals.
- A recurring rule alone has no balance effect. The current automatic income worker changes the balance only by creating a real income transaction.

## Shared Helpers from Agent 06

- `validate_timezone()` and `normalize_aware_utc()` are generic and reusable.
- `recurring_period_key()` is generic and reusable for a rule-timezone `YYYY-MM` completion key.
- `calculate_monthly_due_at()` is generic and reusable, including January 31 to February month-end and March 31 to April 30 clamping.
- `is_monthly_due_window()` is generic and reusable for eligibility from the computed due timestamp through the end of the same rule-local month.
- `calculate_next_run_after()` and `calculate_next_run_on_or_after()` are generic schedule helpers but should remain separate from reminder completion semantics.
- `is_monthly_expense_due()` is expense-specific and must not be reused unchanged for income.
- `is_recurring_period_paid()` is coupled to the expense `last_paid_period` field despite its generic function name. Agent 07 should add received-specific completion semantics without changing expense outputs.
- `build_due_recurring_expense_queue()`, `DueRecurringExpense`, `list_active_monthly_expenses()`, and the due-expense response types are expense-specific. Their ordering and deduplication patterns are reusable, but their type filters and completion fields must remain isolated.

## Existing Reminder Queue

- The authenticated dashboard layout mounts `RecurringExpenseReminderProvider` and `RecurringExpenseWarningPopup` inside `AuthGuard`.
- On app-shell mount, the provider calls `GET /api/v1/recurring-rules/due-expenses`, deduplicates by `rule_id:period_key`, and orders by due timestamp then rule ID.
- The backend query and service include only active monthly expenses and exclude income, inactive, archived, ended, future, off-interval, and already-paid rules.
- The expense popup displays one queue item at a time and advances after Paid or Delete. Close is component-local, so a closed reminder is eligible again after a fresh app load.
- The current provider context and queue types are expense-specific. Later mixed-queue work should preserve the completed expense endpoint, filtering, actions, ordering, and amber warning presentation.

## Existing Success UI Components

- No dedicated achievement, success-popup, or green reminder component exists.
- The Radix `Dialog` wrapper provides the reusable modal, overlay, focus management, accessible title/description primitives, keyboard dismissal, and built-in close icon required by the future income popup.
- The Radix `AlertDialog` wrapper provides reusable destructive confirmation primitives for Delete.
- Existing buttons, Lucide icons, and Tailwind green text/status styles can support the achievement presentation without changing the expense popup. `CheckCircle2Icon` is already used for active account status, but no existing success dialog contract needs to be preserved.

## Planned Files to Change

- Phase 07.2 data and due logic:
  - `server/app/modules/recurring/models.py`
  - `server/app/modules/recurring/schemas.py`
  - `server/app/modules/recurring/schedule.py`
  - `server/alembic/versions/*`
  - recurring model, migration, and date-helper tests
  - generated API artifacts after schema changes
- Later Agent 07 phases, only after permission:
  - `server/app/modules/recurring/repositories.py`
  - `server/app/modules/recurring/router.py`
  - `server/app/modules/recurring/services.py`
  - `server/app/workers/recurring.py`
  - `client/lib/finance/api.ts`
  - `client/app/(dashboard)/layout.tsx`
  - focused recurring-income provider/popup components or a minimal safe shared reminder abstraction
  - recurring backend and E2E tests
- Expense-specific responses, due filtering, Paid/Delete/Close behavior, and amber popup styling must remain regression-stable.

## Blockers

- No code dependency is missing in the current branch lineage. Agent 05 and Agent 06 completed commits are ancestors of the Agent 07 branch and provide all required transaction, account, scheduling, and expense-reminder foundations.
- Local `main` does not yet contain the Agent 05 or Agent 06 branch tips. The required merged-to-main integration condition is therefore not met even though the dependencies are present in this branch. Phase 07.2 should proceed only on this audited Agent 06 lineage or after those branches are merged into `main`; rebasing onto current `main` would remove required dependencies.
- The existing automatic recurring-income worker behavior conflicts with the final Agent 07 goal, but changing it is intentionally deferred beyond phase 07.1.
- Direct recurring-rule API requests can still reference a disabled account. This known validation gap does not prevent the audited dependencies from being reused, and changing it in phase 07.1 would exceed the baseline-audit scope and affect shared expense rule creation.

## Phase 07.1 Check Results

- `cd client && npm run build`: passed after an approved rerun allowed the configured Google-hosted Urbanist font fetch.
- `cd server && .venv/bin/pytest -q`: passed after an approved rerun allowed the disposable PostgreSQL fixture to bind localhost, with `192 passed, 1 warning`.
- The warning is the existing Starlette/httpx test-client deprecation warning.
- Client `lint`, `typecheck`, and unit `test` scripts are not available.

## Phase 07.1 Bugs Fixed

- None. No baseline issue required repair during the audit.
