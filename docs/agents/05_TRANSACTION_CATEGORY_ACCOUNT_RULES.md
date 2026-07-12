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
- Current default income categories are Salary, Business, Freelance, Investments, and Other.
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
