# Agent 02 - Account Page and Account Rules

## Phase 02.1 - Account Baseline and Data Model Audit

## Files Inspected

- `AGENT.md`
- `docs/audit/00_CURRENT_APP_AUDIT.md`
- `docs/audit/01_FEATURE_IMPLEMENTATION_CHECKLIST.md`
- `docs/audit/02_BASELINE_TEST_REPORT.md`
- `docs/agents/01_SIDEBAR_NAVIGATION_UPDATE.md`
- `docs/agents/01_SIDEBAR_NAVIGATION_TEST_REPORT.md`
- `client/package.json`
- `client/app/(dashboard)/accounts/page.tsx`
- `client/components/AccountBoard.tsx`
- `client/lib/finance/api.ts`
- `client/lib/finance/format.ts`
- `client/app/(dashboard)/transaction/page.tsx`
- `client/app/(dashboard)/transaction/[id]/page.tsx`
- `client/app/(dashboard)/loan/page.tsx`
- `client/app/(dashboard)/loan/[id]/page.tsx`
- `server/app/modules/accounts/models.py`
- `server/app/modules/accounts/schemas.py`
- `server/app/modules/accounts/services.py`
- `server/app/modules/accounts/repositories.py`
- `server/app/modules/accounts/router.py`
- `server/app/modules/finance_defaults.py`
- `server/app/modules/transactions/models.py`
- `server/app/modules/loans/models.py`
- `server/tests/test_accounts_categories.py`

## Current Account Behavior

- Account backend APIs exist under `/api/v1/accounts`.
- Empty users receive a default `Cash` account when accounts are listed.
- Accounts can currently be created with `name`, `type`, `currency`, and `opening_balance`.
- Account listing excludes archived accounts by default and can include them with `include_archived=true`.
- Account removal is implemented as archive/delete through `DELETE /api/v1/accounts/{account_id}`.
- Archive/delete is blocked when the account is referenced by transactions or recurring rules.
- Duplicate active account names are rejected per user.
- Backend account update exists through `PATCH /api/v1/accounts/{account_id}`.
- No default/primary account field exists for accounts.
- No separate disabled state exists beyond `is_archived` and `archived_at`.

## Existing Account Fields

- `id`
- `user_id`
- `name`
- `type`
- `currency`
- `opening_balance`
- `is_archived`
- `archived_at`
- `created_at`
- `updated_at`

Missing fields for later phases:

- current balance field separate from report-calculated balance
- disabled/active field separate from archive semantics
- default/primary account field

## Existing Account UI

- `/accounts` exists as a placeholder page created by Agent 01.
- `client/components/AccountBoard.tsx` still contains the old account UI but is no longer rendered from the sidebar.
- `AccountBoard` can list accounts, create accounts, and delete/archive accounts.
- `AccountBoard` create form currently collects account name and account type only.
- `AccountBoard` uses the signed-in user's `base_currency` and `opening_balance: "0"` for new accounts.
- `AccountBoard` displays account name, type label, and opening balance formatted in account currency.
- No frontend edit action was found.
- No account details dialog was found.
- No disable or set-default action was found.

## Existing Account State/API

- Frontend account API helpers are in `client/lib/finance/api.ts`.
- `listAccounts()` calls `GET /api/v1/accounts` with `include_archived=false` and `limit=100`.
- `createAccount()` calls `POST /api/v1/accounts`.
- `deleteAccount()` calls `DELETE /api/v1/accounts/{id}`.
- No frontend helper exists for `GET /api/v1/accounts/{id}` or `PATCH /api/v1/accounts/{id}`.
- No account Zustand store was found; account state is local component state in `AccountBoard` and transaction pages.
- Money display uses `formatMoney(value, currency)` in `client/lib/finance/format.ts`.
- No production account mock data was found.

## Transaction/Loan Usage Detection

- Transactions store `account_id` and enforce account ownership through a composite foreign key.
- `AccountRepository.is_referenced()` checks transaction usage by `Transaction.account_id`.
- `AccountRepository.is_referenced()` also checks recurring rule usage by `RecurringRule.account_id`.
- Loan records and loan settlements do not currently store `account_id`.
- Current account delete/archive protection does not detect loan usage because loans are not account-linked yet.
- Agent 03 must connect loan account usage detection after loan records receive account IDs.
- Agent 05 should preserve transaction usage detection when transaction account behavior changes.

## Planned Files to Change

- Phase 02.2:
  - `server/app/modules/accounts/models.py`
  - `server/app/modules/accounts/schemas.py`
  - `server/app/modules/accounts/services.py`
  - `server/app/modules/accounts/repositories.py`
  - `server/app/modules/accounts/router.py`
  - `server/alembic/versions/*`
  - `server/tests/test_accounts_categories.py`
  - `client/lib/finance/api.ts`
  - `client/lib/finance/format.ts`
  - `client/generated/openapi.json`
  - `client/generated/api-types.ts`
  - `docs/agents/02_ACCOUNT_PAGE_AND_RULES.md`
- Later Agent 02 phases:
  - `client/app/(dashboard)/accounts/page.tsx`
  - `client/components/AccountBoard.tsx`
  - account-related UI tests or E2E coverage if added

## Risks

- Backend `PATCH /accounts/{id}` currently allows mutable account fields, while the requested rule says created accounts cannot be edited.
- Existing archive semantics may not match the requested disabled-account behavior because archived accounts are hidden from normal account lists.
- Default bootstrap creates a `Cash` account but does not mark it as primary/default.
- Reports calculate available balance from `opening_balance` plus transactions, not from a stored current balance.
- Loan records do not yet reference accounts, so used-loan delete blocking cannot be complete until Agent 03 adds account links.
- Client build may need network access for Google-hosted font fetching in the sandbox.
- Backend tests may need localhost binding for the disposable PostgreSQL fixture in the sandbox.

## Test Commands

- `cd client && npm run build`
- `cd client && npm run lint`: not available; `client/package.json` has no `lint` script.
- `cd client && npm run typecheck`: not available; `client/package.json` has no `typecheck` script.
- `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests/test_accounts_categories.py`

## Check Results

- `cd client && npm run build`: passed after approved rerun. The sandboxed run failed because Next.js could not fetch the configured Google-hosted Urbanist font.
- `cd client && npm run lint`: not run because no `lint` script exists.
- `cd client && npm run typecheck`: not run because no `typecheck` script exists.
- `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests/test_accounts_categories.py`: passed after approved rerun with `7 passed, 1 warning`. The sandboxed run failed because the disposable PostgreSQL fixture could not bind `127.0.0.1`.
