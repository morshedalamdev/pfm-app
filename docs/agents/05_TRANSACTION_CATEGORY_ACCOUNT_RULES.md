# Agent 05 — Transaction Category and Account Rules

## Phase 05.1 — Baseline Audit

## Files Inspected

- `AGENT.md`
- `docs/audit/00_CURRENT_APP_AUDIT.md`
- `docs/audit/01_FEATURE_IMPLEMENTATION_CHECKLIST.md`
- `docs/audit/02_BASELINE_TEST_REPORT.md`
- `docs/agents/02_ACCOUNT_PAGE_AND_RULES.md`
- `docs/agents/02_ACCOUNT_TEST_REPORT.md`
- `docs/agents/04_HOME_SETTINGS_BALANCE_DISPLAY.md`
- `client/package.json`
- `client/app/(dashboard)/transaction/page.tsx`
- `client/app/(dashboard)/transaction/[id]/page.tsx`
- `client/components/inputs/TransactionInput.tsx`
- `client/components/items/TransactionItem.tsx`
- `client/lib/categoryIcons.ts`
- `client/lib/finance/accounts.ts`
- `client/lib/finance/api.ts`
- `client/lib/finance/format.ts`
- `client/lib/dashboard/useDashboardData.ts`
- `client/lib/dashboard/useHomeBalanceSource.ts`
- `client/app/(dashboard)/page.tsx`
- `client/generated/api-types.ts`
- `server/app/modules/finance_defaults.py`
- `server/app/modules/accounts/models.py`
- `server/app/modules/accounts/schemas.py`
- `server/app/modules/accounts/services.py`
- `server/app/modules/accounts/repositories.py`
- `server/app/modules/categories/models.py`
- `server/app/modules/categories/schemas.py`
- `server/app/modules/categories/services.py`
- `server/app/modules/categories/repositories.py`
- `server/app/modules/transactions/models.py`
- `server/app/modules/transactions/schemas.py`
- `server/app/modules/transactions/services.py`
- `server/app/modules/transactions/repositories.py`
- `server/app/modules/transactions/router.py`
- `server/app/modules/reports/repositories.py`
- `server/app/modules/reports/services.py`
- `server/app/modules/reports/schemas.py`
- `server/tests/test_accounts_categories.py`
- `server/tests/test_transactions.py`
- `server/tests/test_dashboard_reports.py`

No repository-owned production transaction mock-data module was found. Transaction test fixtures and backend default bootstrap records are the only fixture-like data sources in scope.

## Current Transaction Behavior

- The transaction list loads non-voided server records, supports search, date/duration filters, income/expense/transfer filters, grouped date headings, detail drawers, edit links, and soft delete through `voided_at`.
- The shared create/edit form supports Expense, Income, and Transfer tabs. Transfer is disabled during edit.
- Income and expense are persisted as transaction rows. Transfers create paired debit and credit rows plus a transfer link.
- Existing income/expense transaction support is:
  - income: supported by UI, API schema, model, service, reports, and tests.
  - expense: supported by UI, API schema, model, service, reports, and tests.
  - category: required for income/expense create, persisted as `category_id`, validated for ownership, active state, and matching kind.
  - amount: required, positive decimal string with four-decimal backend precision; UI accepts steps of `0.01`.
  - date: required as `transaction_at`; backend requires timezone information and normalizes to UTC.
  - note: optional UI field persisted as normalized `description` with a 500-character backend limit.
  - recurring flag: create-form-only local state. When enabled, the form creates a recurring rule instead of an immediate transaction. Transaction rows do not store a recurring flag, and list/detail labels are currently hard-coded as `No` or `Not set`.
  - selected account: supported and required as `account_id` in create payloads and records; update can move an income/expense transaction to another account.
  - currency display: transaction responses store currency, but list and detail components render a hard-coded dollar sign and do not consume the transaction or account currency.
- The frontend creates idempotency keys for transaction, transfer, and savings-transfer creates. Update and void operations act on an existing owned row.

## Current Category Source

- Categories are user-owned backend records, not frontend constants or production mock data.
- Categories have `income` or `expense` kind, icon key, default flag, and archive state. The backend rejects an archived category or a category whose kind does not match the transaction type.
- Empty category sets are bootstrapped by `DEFAULT_CATEGORIES` in `server/app/modules/finance_defaults.py`.
- Current default income categories are Salary, Business, Freelance, Investments, Refund, and Other. Refund is also provisioned idempotently for existing users.
- Current default expense categories are Groceries, Dining, Transport, Housing, Utilities, Entertainment, Health, Shopping, Bills & Fees, and Other.
- The transaction form loads income and expense categories separately from the API and displays their names in the select UI.
- `client/lib/categoryIcons.ts` maps known category names to Lucide icons and falls back to Other. Hangout, Vacation, and Party are not present in backend defaults or the icon map.

## Existing Account Integration

- Transactions already require and persist a user-owned `account_id`; the composite foreign key prevents cross-user account references.
- The backend copies the selected account currency to `Transaction.currency` on create and whenever the selected account changes on update.
- The form already exposes account selection controls for income, expense, and transfer. Expense additionally shows budget-labelled choices that are rejected at submit because an account-backed source is required.
- Create mode currently selects the first account returned by `listAccounts()`, not the Agent 02 default account.
- `listAccounts()` excludes archived accounts but does not exclude disabled accounts. The transaction form therefore currently displays and may preselect disabled accounts.
- `TransactionService.get_active_account()` rejects missing and archived accounts but does not reject `is_disabled`; direct create/update requests can currently use a disabled account.
- Agent 02 shared helpers are present in `client/lib/finance/accounts.ts`: `getActiveAccounts`, `getDefaultAccount`, `getDefaultAccountId`, `resolveAccountSelectValue`, `getAccountSelectOptions`, and account-currency formatters.
- The required Agent 02 default/active account dependency is available; no second account system is needed.

## Current Balance Effect Behavior

- Creating an income or expense writes one ledger transaction against only the selected `account_id`; it does not mutate a stored account balance column.
- Report balance logic derives transaction effects by adding income/transfer credits and subtracting expense/transfer debits, grouped implicitly by each row's selected account reference.
- Voided rows are excluded from report calculations, and transaction updates change the row used by later report queries. This provides reversal/adjustment through ledger recomputation rather than imperative balance mutation.
- `Account.current_balance` currently returns only `opening_balance + loan_balance_adjustment`; it does not include transaction rows. Consequently the account list and Agent 04 selected-account Home balance can omit income/expense effects even though aggregate report calculations include them.
- Create endpoints have idempotency protection, preventing a replayed request with the same key and payload from creating a second ledger row.

## Current Currency Display

- Each transaction stores the selected account currency in `Transaction.currency`, and the API response exposes that field.
- The transaction list and detail drawer ignore `Transaction.currency` and render amounts with a literal `$`.
- The transaction activity total calls `formatMoney()` without a currency, so it uses the formatter's USD fallback and also combines records without accounting for mixed currencies.
- Home recent transaction rows reuse the same hard-coded-dollar `TransactionItem` and do not retain account or transaction currency in `RecentDashboardTransaction`.
- Account helper formatters can resolve and format an arbitrary amount using an account's currency, but transaction UI does not currently use them.

## Home Total Interaction

- Home income and expense summary cards use `/api/v1/reports/dashboard` rather than client-side transaction totals.
- The backend summary explicitly selects only non-voided `income` and `expense` transaction rows in the requested period. Transfers are excluded.
- Loan records live in separate tables. Agent 04 regression coverage confirms given and taken loans do not contribute to Home expense or income totals.
- Account-linked income and expense transactions remain included because report selection is by user, transaction type, void state, and period; it does not exclude records based on `account_id`.
- Future recurring rules are not included until they materialize transaction rows.
- Home available balance source display is separate from the income/expense totals. A selected account currently uses `Account.current_balance`, which does not yet include transaction effects.

## Planned Files to Change

- Phase 05.2 category additions:
  - `server/app/modules/finance_defaults.py`
  - `client/lib/categoryIcons.ts` if icon conventions require explicit mappings
  - `server/tests/test_accounts_categories.py`
- Phase 05.3 through 05.4 account selection and validation:
  - `client/app/(dashboard)/transaction/[id]/page.tsx`
  - `client/lib/finance/accounts.ts` only if a shared helper needs extension
  - `server/app/modules/transactions/services.py`
  - `server/tests/test_transactions.py`
- Phase 05.5 transaction balance effects:
  - account/report repositories or services selected after confirming the single balance source of truth
  - focused account, transaction, and dashboard regression tests
- Phase 05.6 currency display:
  - `client/app/(dashboard)/transaction/page.tsx`
  - `client/components/items/TransactionItem.tsx`
  - `client/lib/dashboard/useDashboardData.ts`
  - `client/app/(dashboard)/page.tsx`
- Phase 05.7 Home-total preservation:
  - `server/tests/test_dashboard_reports.py`
  - production report files only if regression verification finds a failure
- Phase 05.8 verification:
  - `docs/agents/05_TRANSACTION_TEST_REPORT.md`
  - relevant regression tests only if coverage gaps remain
- `docs/agents/05_TRANSACTION_CATEGORY_ACCOUNT_RULES.md` will be updated in every phase.

## Blockers

- No implementation blocker exists for phase 05.2. Agent 02 active/default account helpers and Agent 04 Home total behavior are present.
- `docs/agents/04_HOME_SETTINGS_TEST_REPORT.md` is absent, so Agent 04's final report cannot be reviewed; its implementation document and passing Home loan-exclusion regression test are present.
- Later balance work must first choose one authoritative account-balance calculation because report balance includes transaction rows while `Account.current_balance` does not. This is a documented phase 05.5 design dependency, not a phase 05.2 blocker.

## Phase 05.1 Check Results

- `cd client && npm run build`: passed after an approved rerun allowed the configured Google-hosted Urbanist font fetch.
- `cd client && npm run api:check`: passed; generated API artifacts are up to date.
- `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests/test_transactions.py tests/test_accounts_categories.py tests/test_dashboard_reports.py`: passed with `29 passed, 1 warning` after an approved rerun allowed the disposable PostgreSQL fixture to bind localhost.
- `cd client && npm run lint`: not run because no script exists.
- `cd client && npm run typecheck`: not run because no script exists.
- `cd client && npm test`: not run because no script exists.

## Phase 05.1 Bugs Fixed

- None. No baseline code issue required repair during the audit.

## Phase 05.2 — Transaction Categories Added

## Added Categories

- Hangout
- Vacation
- Party

## Category Group

- All three categories are default expense categories.
- New users receive them through the existing expense-category bootstrap.
- Existing users receive missing records through the phase 05.2 data migration; a same-named expense category is preserved through conflict-safe insertion.

## UI Display

- The transaction form already loads expense categories from the backend, so the three categories appear in the existing Expense category selector without form behavior changes.
- Hangout uses the existing Lucide icon convention with `Coffee`.
- Vacation uses `Plane`.
- Party uses `PartyPopper`.
- No category color system exists, so no color behavior was added.

## Notes

- Income categories were not changed.
- Account, balance, loan, Home, transaction persistence, and recurring behavior were not changed.

## Phase 05.2 Check Results

- `cd client && npm run build`: passed after an approved rerun allowed the configured Google-hosted Urbanist font fetch.
- `cd client && npm run api:check`: passed; generated API artifacts are up to date.
- Focused backend category suite: passed with `9 passed, 1 warning`.
- Full backend suite: passed with `173 passed, 1 warning`.
- Ruff lint passed for the changed backend and test files.
- Ruff format check passed for the changed backend and test files after formatting the updated assertion.

## Phase 05.2 Bugs Fixed

- None beyond the requested category addition.

## Phase 05.3 — Default Account Auto-Selection

## Default Source

- Create mode uses Agent 02's shared `resolveAccountSelectValue()` helper against the accounts returned by the existing account API.
- Both the Expense and Income form states initialize from the resolved active default account.
- Edit mode continues to load the account already stored on the transaction.

## Fallback Rule

- If no active default exists, the shared helper selects the first active account in the existing API order.
- Transfer initialization was not changed in this phase.

## Disabled Account Handling

- The shared helper never returns a disabled or archived account for automatic selection.
- Existing dropdown contents were not changed; active-only manual dropdown behavior remains scoped to phase 05.4.

## Validation Behavior

- If there is no active account, Income and Expense remain unselected and the form displays a message directing the user to create or enable an account.
- Existing submit validation continues to require an account and category.
- Balance effects, transaction persistence behavior, and recurring behavior were not changed.

## Phase 05.3 Check Results

- `cd client && npm run build`: passed after an approved rerun allowed the configured Google-hosted Urbanist font fetch.
- `cd client && npm run api:check`: passed; generated API artifacts are up to date.
- `node --check client/e2e/pfm.e2e.spec.mjs`: passed before the optional browser-test attempt; no E2E file changes were retained.
- `cd client && npm run lint`: not run because no script exists.
- `cd client && npm run typecheck`: not run because no script exists.
- `cd client && npm test`: not run because no script exists.

## Phase 05.3 Bugs Fixed

- None beyond the requested default-account initialization.

## Phase 05.4 — Account Dropdown Override

## Dropdown Source

- The existing transaction form select/drawer style is retained for Expense, Income, and Transfer account choices.
- Account options are derived from the accounts API and filtered through Agent 02's shared active-account helper.
- The phase 05.3 active default account remains preselected for new Expense and Income transactions.
- Users can select another active account before submitting.

## Active Account Rule

- Disabled and archived accounts are excluded from all new transaction account option lists, including transfer source and account destinations.
- Transfer source defaults to the active default account and its initial destination uses another active account when available.
- Historical transaction records remain readable; an edit must reference an active account before it can be saved.

## Selected Account Persistence

- The selected Expense source label resolves to its active account record and submits that record's `id` as `account_id`.
- Income selection resolves the chosen active account name to its record and submits its `id` as `account_id`.
- Transfer source and destination overrides continue to submit their resolved active account IDs.
- No transaction schema or balance behavior changed because account IDs were already part of the transaction payload and persisted record.

## Validation Behavior

- Client submit validation rejects missing account selections and non-account Expense or Transfer choices using the existing messages.
- Backend transaction reference validation now rejects disabled accounts in addition to missing, cross-user, and archived accounts.
- The disabled-account rule applies to create, edit, transfer, and savings-transfer paths that share the transaction account validator.

## Reused Components

- Reused `TransactionInput` for the existing dropdown/drawer UI.
- Reused Agent 02's `getActiveAccounts()` and `resolveAccountSelectValue()` helpers.
- No second account store, account component, or account business-rule system was added.
- Balance effects and recurring behavior were not changed.

## Phase 05.4 Check Results

- `cd client && npm run build`: passed after an approved rerun allowed the configured Google-hosted Urbanist font fetch.
- `cd client && npm run api:check`: passed; generated API artifacts are up to date.
- `node --check client/e2e/pfm.e2e.spec.mjs`: passed.
- Focused backend transaction suite: passed with `16 passed, 1 warning`.
- Full backend suite: passed with `173 passed, 1 warning`.
- Ruff lint and format checks passed for the changed backend and transaction test files.
- `cd client && npm run lint`, `npm run typecheck`, and `npm test` were unavailable because those scripts do not exist.

## Phase 05.4 Bugs Fixed

- Disabled accounts no longer appear as selectable transaction accounts.
- Direct API transaction create/update, transfer, and savings-transfer requests can no longer use a disabled account.

## Phase 05.5 — Transaction Balance Effects

## Income Balance Rule

- Each account response derives its transaction balance adjustment from non-voided income and expense ledger rows linked to that account.
- An income row adds its amount to the selected account's `current_balance`.
- No imperative account balance mutation is performed during transaction creation.

## Expense Balance Rule

- An expense row subtracts its amount from the selected account's `current_balance`.
- Expense effects are read from the same persisted transaction ledger as income effects.

## Selected Account Rule

- The correlated balance calculation matches both `Transaction.account_id` and `Transaction.user_id` to the account being returned.
- A transaction therefore affects only its stored selected account; other accounts keep their own opening, loan-adjustment, and transaction values.

## Double-Counting Protection

- Account balance reads aggregate persisted transaction rows and do not write a second balance delta on render, reload, or account fetch.
- Existing transaction-create idempotency prevents a replay with the same key and payload from inserting another ledger row.
- Regression coverage confirms an idempotent replay contributes its amount once.

## Edit/Delete Notes

- Updating a transaction amount changes the ledger value used on the next account read.
- Moving a transaction to another active account removes its effect from the old account and applies it to the new selected account.
- Delete remains a void operation. Voided transactions are excluded, so their balance effect is reversed on the next account read.

## Edge Cases

- Negative current balances remain possible when valid expenses exceed the account's available value; no insufficient-funds rule was added.
- Transfer debit/credit rows are excluded from this phase's adjustment because phase 05.5 is limited to income and expense effects.
- Existing `loan_balance_adjustment` remains part of `current_balance` and was not modified.
- Recurring rules do not affect account balance until existing recurring processing creates a transaction row; recurring behavior was not modified.

## Phase 05.5 Check Results

- `cd client && npm run build`: passed after an approved rerun allowed the configured Google-hosted Urbanist font fetch.
- `cd client && npm run api:check`: passed; generated API artifacts are up to date.
- Focused transaction/account/loan/dashboard regression set: passed with `35 passed, 1 warning`.
- Full backend suite: passed with `174 passed, 1 warning`.
- Ruff lint and format checks passed for the changed backend and test files.
- `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app`: passed with no issues in 110 source files.
- `cd client && npm run lint`, `npm run typecheck`, and `npm test` were unavailable because those scripts do not exist.

## Phase 05.5 Bugs Fixed

- Account `current_balance` now includes income and expense transaction effects for that account.
- Transaction edits that change amount or selected account now adjust both affected account balances through ledger recomputation.
- Voiding a transaction now removes its effect from the selected account balance.

## Phase 05.6 — Account Currency Applied to Transaction Lists

## Currency Source

- Transaction list rows resolve the current currency from the account referenced by `transaction.account_id`.
- Home recent transaction rows load the same account data and retain the resolved account currency in their view model.
- No currency conversion is performed; each amount is formatted directly in its selected account currency.

## Legacy Transaction Fallback

- If the referenced account is unavailable from the active account list, display falls back to the transaction's stored `currency` value.
- The shared transaction card retains `USD` as the final safe fallback when no currency is supplied.

## List Display

- The shared transaction card now formats row amounts through `formatMoney(amount, currency)` instead of a hard-coded dollar sign.
- Income and transfer-credit rows retain the positive sign; expense and debit rows retain the negative sign.
- The transaction-page activity footer groups totals by resolved currency instead of combining mixed-currency amounts under USD.
- Home recent transaction cards use the same selected-account currency rule.

## Detail Display

- The transaction detail drawer uses the same resolved currency passed to its row card.
- Row and detail displays therefore stay consistent for USD, BDT, CNY, and every other supported account currency.
- Recurring labels and behavior were not changed.

## Phase 05.6 Check Results

- `cd client && npm run build`: passed after an approved rerun allowed the configured Google-hosted Urbanist font fetch.
- `cd client && npm run api:check`: passed; generated API artifacts are up to date.
- `git diff --check`: passed.
- `cd client && npm run lint`, `npm run typecheck`, and `npm test` were unavailable because those scripts do not exist.
- No backend tests were required because phase 05.6 changes frontend display formatting only.

## Phase 05.6 Bugs Fixed

- Transaction list and detail amounts no longer use a hard-coded dollar sign.
- Home recent transactions now display the selected account currency.
- Mixed-currency transaction activity is no longer presented as one USD total.

## Phase 05.7 — Home Totals Preserved

## Income Total Rule

- Home income continues to use the dashboard report `income_amount`.
- The report sums only non-voided transaction rows whose type is `income` and whose timestamp is inside the requested period.

## Expense Total Rule

- Home expense continues to use the dashboard report `expense_amount`.
- The report sums only non-voided transaction rows whose type is `expense` and whose timestamp is inside the requested period.
- Transfer debit/credit rows remain excluded from both totals.

## Loan Exclusion

- Given and taken loans remain separate loan records and are not selected by the dashboard transaction-total query.
- Regression coverage creates both loan directions with amounts larger than the real transactions and confirms they do not affect Home income, expense, or net flow.

## Account-Linked Transaction Handling

- Income and expense transactions on different selected accounts remain included in the user-level Home totals.
- The dashboard total query does not exclude a valid transaction because of its selected `account_id`.

## Recurring Placeholder Handling

- Future recurring income and expense rules do not contribute to Home totals before they materialize as transaction rows.
- Regression coverage creates future recurring rules with large placeholder amounts and confirms Home continues to report only real transactions.
- No recurring popup, scheduling, or worker behavior was changed.

## Phase 05.7 Check Results

- `cd client && npm run build`: passed after an approved rerun allowed the configured Google-hosted Urbanist font fetch.
- `cd client && npm run api:check`: passed; generated API artifacts are up to date.
- Focused Home dashboard regression suite: passed with `4 passed, 1 warning`.
- Full backend suite: passed with `174 passed, 1 warning`.
- Ruff lint and format checks passed for the changed dashboard regression test.
- `cd client && npm run lint`, `npm run typecheck`, and `npm test` were unavailable because those scripts do not exist.

## Phase 05.7 Bugs Fixed

- None. Existing production Home total selection already preserved transaction-only income/expense totals and loan exclusion; regression coverage was expanded.

## Phase 05.8 — Regression Verification

- Final backend lint, format, type, and test checks passed.
- Final frontend production build and generated API contract checks passed.
- The full-stack E2E workflow remains blocked before transaction coverage by the existing Agent 04 Settings/Home selected-source assertion documented in `05_TRANSACTION_TEST_REPORT.md`.
- No phase-scope regression required a code change.
- Agent 05 implementation is complete; recurring popup work remains deferred to Agents 06 and 07.
