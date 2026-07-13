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

## Phase 07.2 — Data Model and Due-Date Integration

## Recurring Income Fields

- Existing shared recurring fields remain the income template: `id`, `account_id`, `category_id`, `transaction_type`, `amount`, `currency`, `description`, `frequency`, `interval_count`, `timezone`, `start_at`, `end_at`, `next_run_at`, `status`, and timestamps.
- `transaction_type = income` identifies an income rule, `description` stores its note, `start_at` is its first due date, and `status = active` is its active-state source.
- Added nullable `last_received_period` as the persistent monthly completion marker for recurring income. It stores a validated `YYYY-MM` rule-local period key.
- Existing rules migrate with `last_received_period = null` and remain eligible for later income reminder evaluation.
- The shared recurring-rule response and generated frontend API type now expose `last_received_period`.
- No Received action writes the field yet, and no transaction, queue entry, provider, or popup was added in this phase.

## Reused Shared Helpers

- `recurring_period_key()` remains the shared timezone-aware `YYYY-MM` key generator.
- `calculate_monthly_due_at()` remains the shared monthly due timestamp calculator with shorter-month clamping.
- `is_monthly_due_window()` remains the shared due-window check from the computed due timestamp through the end of the same rule-local month.
- Timezone validation and aware-UTC normalization remain unchanged and shared.

## Refactored Helpers

- Added `is_monthly_recurring_due()` for the generic active-monthly, interval, and due-window checks that were previously embedded in the expense helper.
- `is_monthly_expense_due()` now delegates only those generic schedule checks while retaining its expense type gate and `last_paid_period` completion semantics.
- Added `is_recurring_income_reminder_type()` to identify income rules without accepting expense rules.
- Added `is_recurring_period_received()` to compare an income completion period without reusing expense-paid terminology.
- Added `is_monthly_income_due()` to compose the income type gate, generic monthly schedule checks, and received-period exclusion.

## Monthly Due Calculation

- Monthly income uses the original `start_at` local day and wall-clock time as its anchor.
- A normal monthly anchor retains its day and time in later months.
- January 31 clamps to February 28 or 29, and March 31 clamps to April 30 through the existing shared helper.
- The due predicate returns false before the due timestamp and true from the due timestamp through the remainder of that rule-local month.
- `interval_count` is honored, so months outside the configured cadence are not due.

## Completion Period Key

- `last_received_period` and the current key both use `YYYY-MM` in the recurring rule's timezone.
- A matching received period suppresses the recurring income for that month only.
- A prior received period does not suppress a later scheduled month once its due timestamp is reached.
- The database constraint accepts only valid month-shaped keys from `01` through `12`.

## Expense Regression Safety

- Existing `last_paid_period` storage, constraint, response value, and Paid behavior are unchanged.
- Existing due-expense repository filtering, response types, endpoint, queue, provider, actions, and amber popup were not modified.
- The expense helper retains its expense-only type gate, active monthly/interval rules, due-window behavior, and current-period paid exclusion.
- Recurring worker behavior is unchanged in this data-only phase.

## Test Cases

- Normal monthly due date: passed.
- January 31 to February month-end: passed.
- March 31 to April month-end: passed.
- Before income due date: excluded.
- On income due date: included.
- After income due date through month end: included.
- Already received current month: excluded.
- Inactive income rule: excluded.
- Income reminder type excludes expenses: passed.
- Expense due-helper behavior unchanged: passed.
- Income completion migration upgrade/downgrade/upgrade: passed.

## Phase 07.2 Check Results

- Pure recurring date suite: `18 passed`.
- Focused recurring, migration, worker, and transaction regression suite: `58 passed, 1 warning`.
- Full backend suite: `201 passed, 1 warning`.
- Ruff lint passed.
- Ruff format check passed for 167 files.
- Mypy passed with no issues in 110 source files.
- Generated API contract check passed.
- TypeScript no-emit check passed.
- Frontend production build passed.
- The warning is the existing Starlette/httpx test-client deprecation warning.
- Client `lint`, `typecheck`, and unit `test` scripts remain unavailable.

## Phase 07.2 Bugs Fixed

- Added the missing persistent monthly received marker for recurring income.
- Added explicit income type, due-window, inactive, and already-received protection while preserving expense due behavior.

## Phase 07.3 — App-Load Detection and Shared Reminder Queue

## Detection Entry Point

- Added `GET /api/v1/recurring-rules/due-incomes` as a read-only, authenticated detection endpoint.
- The dashboard-level recurring reminder provider calls the income and expense detection endpoints once on app load.
- Income detection does not create transactions, publish outbox events, update rule run metadata, or change account balances.
- The recurring worker no longer claims income rules for automatic materialization; income completion remains an explicit future confirmation action.

## Income Eligibility Filters

- Detection considers only owned, active, unarchived, monthly income rules.
- The shared monthly income due helper enforces the start date, local due time, interval cadence, current due window, and `last_received_period` exclusion.
- Rules at or beyond `end_at` are excluded from the reminder queue.

## Expense/Income Coexistence

- Replaced the expense-only app provider with one shared discriminated reminder queue containing `expense` and `income` items.
- Expense and income requests settle independently, so one endpoint failure does not discard reminders returned by the other.
- The existing expense popup filters the shared queue to expense items only; its Paid/Delete actions, labels, ordering count, and amber presentation are unchanged.
- Phase 07.3 does not render an income popup or add Received/Delete income actions.

## Queue Ordering

- Backend income reminders sort deterministically by due timestamp and recurring rule ID.
- The shared client queue sorts by due timestamp, rule ID, and reminder type for a stable combined order.

## Duplicate Prevention

- Backend income detection emits at most one reminder per `rule ID + local period` key.
- The shared client queue deduplicates by `reminder type + reminder key`, preventing duplicate app-load entries without allowing an expense item to suppress an income item.

## Excluded Rules

- Expense, inactive, archived, non-monthly, future, off-interval, ended, and already-received income rules are excluded from income detection.
- App-load detection never advances `next_run_at`, sets worker locks, creates a transaction, or changes a balance.

## Phase 07.3 Check Results

- Pure recurring due-date and queue suite: `25 passed`.
- Focused recurring, schema, worker, and transaction regression suite: `62 passed, 1 warning`.
- Full backend suite: `205 passed, 1 warning`.
- Ruff lint passed.
- Ruff format check passed for 116 focused files.
- Mypy passed with no issues in 110 source files.
- Generated API contract check passed.
- TypeScript no-emit check passed.
- Frontend production build passed.
- The warning is the existing Starlette/httpx test-client deprecation warning.
- Client `lint`, `typecheck`, and unit `test` scripts remain unavailable.

## Phase 07.3 Bugs Fixed

- Removed automatic worker claiming of recurring income, preventing app-load-era income rules from creating transactions or increasing balances before explicit user confirmation.
- Added independent shared-queue loading so a failed income or expense reminder request no longer suppresses the other reminder type.

## Phase 07.4 — Achievement Popup UI

## Confirmation Message

- The income dialog asks `Have you received your “{note}”?`, using the recurring note as the named income and a safe recurring-income fallback when the note is empty.
- Supporting copy tells the user to confirm only after the income reaches the selected account.

## Displayed Fields

- The popup displays the income category, note, formatted amount, selected account name, selected account currency, and rule-timezone due date.
- Account and income-category lookups reuse the existing read-only account/category APIs and retain safe fallback labels if either lookup is unavailable.

## Green Achievement Styling

- Added an emerald success treatment with an achievement badge, trophy artwork, green border, gradient header, success shadow, green detail accents, and a positive amount emphasis.
- The income presentation is isolated in `RecurringIncomeAchievementPopup`; no amber expense classes were changed.

## Actions

- Visible `Received`, `Delete`, and close controls are present.
- `Received` and `Delete` are intentionally disabled and have no API, transaction, balance, completion, or queue-removal behavior in phase 07.4.
- Final action and dismissal behavior remains deferred to phases 07.5 and 07.6.

## Queue Behavior

- Both popup components now honor the first item in the shared deterministic queue, so income and expense dialogs cannot open simultaneously.
- Existing expense Paid/Delete queue advancement can reveal the next income reminder without changing the expense actions.
- An income reminder does not remove or mutate itself in this UI-only phase.

## Mobile Behavior

- The dialog width is capped to the viewport, the height is capped to `100dvh` minus safe outer spacing, and overflowing content scrolls inside the dialog.
- Detail cards collapse to one column on mobile and expand to two columns at the existing small breakpoint.
- Footer actions retain the design-system mobile stack and desktop row behavior.

## Accessibility

- The popup uses the existing Radix dialog title, description, overlay, focus, and close-control primitives.
- Decorative achievement and detail icons are hidden from assistive technology, while Received and Delete have explicit accessible labels.
- The visible close control retains the design-system `Close` accessible name; its final dismissal behavior is deferred.

## Expense Popup Safety

- No expense popup color, spacing, typography, text, icon, dialog, confirmation, Paid, Delete, or Close styling was changed.
- The only expense component change makes it render when the shared queue head is an expense, preventing simultaneous mixed-type dialogs while preserving expense-only behavior.

## Phase 07.4 Check Results

- TypeScript no-emit check passed.
- Generated API contract check passed.
- E2E JavaScript syntax check passed.
- Frontend production build passed.
- Focused recurring expense/income popup browser scenario passed: `1 passed`.
- The browser scenario verified mobile viewport fit, green styling, confirmation text, category, note, amount, account, currency, due date, visible controls, mixed queue advancement, unchanged expense actions, zero income transactions, unchanged balance, and unset income completion state.
- The pre-existing integrated finance browser journey still times out on a later request when run in the same local harness; it also reproduced independently and is outside phase 07.4 popup scope.
- Client `lint`, `typecheck`, and unit `test` scripts remain unavailable.

## Phase 07.4 Bugs Fixed

- Prevented income and expense dialogs from opening simultaneously by making both popup components honor the shared queue head.
- Added the missing recurring-income achievement presentation while keeping Received/Delete inert and preserving the expense popup presentation.

## Phase 07.5 — Received Action

## Created Transaction Fields

- Received creates one normal `income` transaction through the shared transaction service.
- The transaction copies the recurring rule's selected account, income category, amount, and note, while currency is resolved from the selected active account.
- The recurring rule remains active after successful confirmation.

## Transaction Date Rule

- The client captures one `new Date().toISOString()` value when Received is clicked and sends it as `received_at`.
- The server validates the value as an aware UTC timestamp and stores it as the transaction date instead of using the scheduled due date.

## Account Balance Effect

- The normal ledger-derived balance calculation increases only the selected account by the received amount.
- No imperative balance mutation was added, so the transaction affects the balance once and leaves every other account unchanged.
- A shared finance-data notification refetches the Home balance source after confirmation so the derived result is visible immediately.

## Home Income Total Effect

- Home income remains transaction-derived; the recurring rule itself contributes nothing to report totals.
- The one created income transaction increases Home income once, and the dashboard report/recent-transaction data refetch after success.

## Current-Period Completion

- Successful confirmation stores the current rule-local `YYYY-MM` key in `last_received_period` in the same database commit as the transaction.
- The due-income endpoint then excludes the completed rule for the current month without pausing or archiving it.

## Duplicate Protection

- The server takes a row lock and uses the occurrence key `recurring-income-received:{rule_id}:{period_key}` with the normal idempotent transaction service.
- An exact replay returns the original transaction; a conflicting replay is rejected without a second transaction, balance increase, or Home income increase.
- The client disables Received while it is pending and also uses an in-flight ref guard to suppress rapid duplicate clicks.

## Queue Advancement

- After the server confirms success, the completed reminder key is removed from the shared queue and the next reminder becomes eligible to render.
- A failed request keeps the reminder visible and shows an error so the user can retry.
- Delete remains disabled and Close behavior remains unchanged for phase 07.6.

## Phase 07.5 Check Results

- Focused recurring, transaction, and dashboard backend regression suite: `53 passed, 1 warning`.
- Full backend suite: `206 passed, 1 warning`.
- Ruff lint passed.
- Ruff format check passed for 144 files.
- Mypy passed with no issues in 110 source files.
- Generated API contract check passed.
- TypeScript no-emit check passed.
- E2E JavaScript syntax check passed.
- Frontend production build passed after the approved network-enabled rerun fetched the configured Urbanist font.
- Focused recurring expense/income popup browser scenario passed: `1 passed`.
- The warning is the existing Starlette/httpx test-client deprecation warning.
- Client `lint`, `typecheck`, and unit `test` scripts remain unavailable.

## Phase 07.5 Bugs Fixed

- Added the missing atomic Received path for one income transaction and current-month completion.
- Prevented duplicate income, balance, and Home-total effects across exact replays, conflicting replays, and rapid client clicks.
- Added immediate Home report, recent transaction, and selected balance-source refresh after successful confirmation.

## Phase 07.6 — Delete and Close Actions

## Delete Behavior

- Delete opens a destructive confirmation dialog that states future reminders will stop without creating a transaction or changing the account balance.
- Successful confirmation removes the income reminder from the shared queue so the next queued reminder can render.
- Delete and Received disable one another while either action is pending, and a ref guard prevents repeated Delete submissions.
- A failed Delete keeps the reminder and confirmation visible with a retryable error message.

## Deactivation Strategy

- Income Delete reuses the existing recurring-rule delete endpoint and persistence style.
- The rule is soft-archived with `status = archived` and an `archived_at` timestamp, preserving historical recurring metadata.
- Active-rule reminder queries exclude the archived rule, permanently stopping its future income reminders.

## Close Behavior

- The dialog close icon records only the current reminder key in component-local state and hides the popup for the current mounted view.
- Close does not remove the reminder from the shared queue, set `last_received_period`, archive the rule, or call a mutation endpoint.

## Next App-Load Behavior

- A fresh app load remounts the popup with no dismissed reminder key.
- An active, due, unreceived rule closed in the previous view is detected again and shown during the same due window.
- A deleted income rule remains archived and is not returned on later app loads.

## Balance Safety

- Delete and Close perform no account mutation and create no ledger entry, leaving the selected account balance unchanged.
- Backend and browser coverage verify the original balance before and after both actions.

## Transaction Safety

- Delete and Close do not call the Received endpoint or normal transaction creation service.
- Backend and browser coverage verify that the transaction list and Home income total remain unchanged after Delete and Close.

## Expense Regression Safety

- The recurring expense component, Delete confirmation, Close state, queue removal, persistence calls, and amber styling were not modified.
- Existing expense backend coverage and the focused expense browser scenario remain passing.

## Phase 07.6 Check Results

- Focused recurring, transaction, and dashboard backend regression suite: `54 passed, 1 warning`.
- Full backend suite: `207 passed, 1 warning`.
- Ruff lint passed.
- Ruff format check passed for 144 files.
- Mypy passed with no issues in 110 source files.
- Generated API contract check passed.
- TypeScript no-emit check passed.
- E2E JavaScript syntax check passed.
- Frontend production build passed.
- Focused income Delete/Close browser scenario passed: `1 passed`.
- Focused expense/Received browser scenario passed: `1 passed`.
- When both browser scenarios ran sequentially in one local harness, the expense scenario passed and the next scenario hit the pre-existing late-request timeout during login; each scenario passes in isolation.
- The backend warning is the existing Starlette/httpx test-client deprecation warning.
- Client `lint`, `typecheck`, and unit `test` scripts remain unavailable.

## Phase 07.6 Bugs Fixed

- Added permanent recurring-income deactivation and queue advancement without a transaction, balance, completion, or Home-income change.
- Added temporary income-popup dismissal that preserves the active rule and returns after a fresh app load.
- Added destructive confirmation, pending-state exclusion, duplicate-submit protection, and retryable Delete errors.

## Phase 07.7 — Persistence and Mixed Reminder Verification

## Received Persistence

- A successful Received action persists the current rule-local `last_received_period` and keeps the recurring income rule active.
- Repeated app reloads in the same month continue to exclude the received income reminder.
- Reloading does not create another transaction or apply another account balance increase.

## Next-Month Reactivation

- Controlled-date queue tests keep a March-received income hidden through March month-end and before its April due time.
- The same active rule returns with an April reminder key exactly at the configured April due time.
- Monthly reactivation is based on the original due day and time rather than the date Received was clicked.

## Deleted Rule Persistence

- Soft-archived income rules remain excluded in the deletion month and in controlled later-year checks.
- App reload and active-rule queries do not restore a deleted income reminder.

## Close and Reload Behavior

- Close hides only the currently mounted income dialog and does not alter active or completion state.
- A fresh app load detects and shows the same closed-only reminder again during its due window.

## Prior-Month Expiry

- An unreceived March income remains eligible through March month-end.
- It is not carried into early April before the new April due time.
- At the April due time, the rule produces only the April reminder key.

## Mixed Queue Ordering

- Income and expense backend queues retain deterministic due-time then rule-ID ordering and type isolation.
- The shared client queue continues to present the earlier expense reminders before the later income reminder and advances one item at a time.
- Focused browser coverage confirms only one popup renders at once and the expense-to-income transition follows queue order.

## Reminder Isolation

- Completing an income reminder suppresses only that income occurrence; a due expense remains visible after reload.
- Paid expense state suppresses only its expense rule, and received income state suppresses only its income rule.
- Completing, deleting, or closing one reminder does not mutate another rule's completion state.

## Expense Regression Safety

- The expense due helper retains same-month suppression, next-month reactivation, and prior-month expiry behavior.
- The expense component and styles were not modified.
- Browser verification confirms the mixed-queue expense popup remains amber with its existing actions and content.

## Phase 07.7 Check Results

- Controlled recurring due-date and queue suite: `29 passed`.
- Focused recurring, transaction, and dashboard backend suite: `58 passed, 1 warning`.
- Full backend suite: `211 passed, 1 warning`.
- Ruff lint passed.
- Ruff format check passed for 144 files.
- Mypy passed with no issues in 110 source files.
- Generated API contract check passed.
- TypeScript no-emit check passed.
- E2E JavaScript syntax check passed.
- Frontend production build passed.
- Received persistence/reload and expense-isolation browser scenario: `1 passed`.
- Delete/Close persistence browser scenario: `1 passed`.
- Mixed expense/income queue and expense-regression browser scenario: `1 passed`.
- The backend warning is the existing Starlette/httpx test-client deprecation warning.
- Client `lint`, `typecheck`, and unit `test` scripts remain unavailable.

## Phase 07.7 Bugs Fixed

- Corrected the persistence browser assertion to compare equivalent timestamp instants instead of requiring identical ISO fractional-second formatting.
- No production persistence, monthly-repeat, mixed-queue, or expense-regression defect was found.
