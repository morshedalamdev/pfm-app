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

## Phase 02.2 - Account Data Types and Store

## Account Fields

- Backend accounts now support `is_disabled`, `disabled_at`, and `is_default`.
- Account responses now include `current_balance`; for this data-prep phase it mirrors `opening_balance`.
- Existing `opening_balance` remains the initial budget/balance field.
- Generated OpenAPI and TypeScript API types were regenerated for the new account fields and helper endpoints.

## Account Helpers

- Backend service helpers now support active-account lookup, default-account lookup, set-default, disable, delete eligibility, and safe default fallback.
- Frontend account helpers were added in `client/lib/finance/accounts.ts`.
- Frontend helpers include:
  - `getActiveAccounts`
  - `getDefaultAccount`
  - `setDefaultAccountInList`
  - `disableAccountInList`
  - `canDeleteAccountFromEligibility`
  - `deleteAccountWhenSafe`

## Currency Utility

- `formatAccountMoney(account, field)` formats account amounts using each account's own currency.
- No currency conversion engine was added.

## Default Account Rule

- New accounts become default only when the user has no active default account.
- Bootstrap `Cash` accounts are created as default.
- Setting a default account clears any previous default account.
- Disabled or archived accounts cannot be set as default.
- Disabling or archiving the default account assigns another active account if one exists.

## Delete Safety Rule

- `GET /api/v1/accounts/{account_id}/delete-eligibility` reports whether an account can be deleted safely.
- Existing delete/archive still blocks transaction and recurring-rule usage.
- Loan usage is not connected yet because loan records do not have account IDs.

## Notes for Loan/Transaction Agents

- Agent 03 must connect loan account IDs to delete-eligibility checks after adding loan account selection.
- Agent 05 should consume active/default account helpers for transaction account selection.
- Loan and transaction UI integration was not implemented in this phase.

## Phase 02.2 Check Results

- `cd client && npm run build`: passed after approved rerun. The sandboxed run failed because Next.js could not fetch the configured Google-hosted Urbanist font.
- `cd client && npm run lint`: not run because no `lint` script exists.
- `cd client && npm run typecheck`: not run because no `typecheck` script exists.
- `cd client && npm run api:check`: passed.
- `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check app tests`: passed.
- `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check app tests alembic/versions/202607100202_add_account_state_fields.py`: passed.
- `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q`: passed after approved rerun with `169 passed, 1 warning`. The sandboxed run failed because the disposable PostgreSQL fixture could not bind `127.0.0.1`.

## Phase 02.3 - Dedicated Accounts Page and List

## Route Path

- Dedicated account list route: `/accounts`.
- Route file: `client/app/(dashboard)/accounts/page.tsx`.

## List UI Behavior

- The Agent 01 placeholder shell was replaced with a client-side account list page.
- The page loads accounts with `listAccounts()`.
- Loading, empty, error, and retry states are present.
- Account rows are selectable to prepare for later detail-dialog work.
- No create form, edit action, delete action, disable action, or set-default action was added in this phase.

## Displayed Fields

- Account name.
- Account type.
- Account currency.
- Current balance formatted in the account currency.
- Initial balance formatted in the account currency.
- Active or disabled status.
- Default status when applicable.
- Total and active account counts.

## Responsive Behavior

- The page follows the existing mobile dashboard shell and `Header` pattern.
- Account rows use compact, full-width list cards with stable icon, balance, and status areas.
- Text truncates where needed to avoid overflow on narrow screens.

## Deferred Dialog Work

- Clicking a row only selects it in-place.
- Full account details dialog work remains deferred to phase 02.5.

## Phase 02.3 Check Results

- `cd client && npm run build`: passed after approved rerun. The sandboxed run failed because Next.js could not fetch the configured Google-hosted Urbanist font.
- `cd client && npm run lint`: not run because no `lint` script exists.
- `cd client && npm run typecheck`: not run because no `typecheck` script exists.
- `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check app tests`: passed.
- `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check app tests alembic/versions/202607100202_add_account_state_fields.py`: passed.
- `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests/test_accounts_categories.py`: passed after approved rerun with `9 passed, 1 warning`.
- `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q`: passed after approved rerun with `169 passed, 1 warning`. The sandboxed run failed because the disposable PostgreSQL fixture could not bind `127.0.0.1`.

## Phase 02.3 Bugs Fixed

- Fixed the phase 02.2 default-account switch helper so clearing the previous default flushes before assigning the next default, preventing a transient unique-index violation.

## Phase 02.4 - Create Account Form

## Form Fields

- Account name.
- Account currency.
- Initial budget / balance.
- Account type is submitted as `cash` to satisfy the existing backend schema; no account type field was added to the user-facing form in this phase.

## Validation

- Account name is required.
- Account currency is required.
- Initial budget / balance is required, numeric, and non-negative.
- API errors are shown inline on the form.

## Create Behavior

- The `/accounts` page now creates accounts with `createAccount()`.
- New accounts are inserted into the existing account list after a successful create response.
- The newly created account is selected in the list.
- Current balance starts from the backend response, which mirrors the initial opening balance in this phase.

## First Default Account Behavior

- Existing phase 02.2 backend default-account rules handle first-default assignment.
- No default-account UI action was added in this phase.

## No-Edit Rule

- No account edit form or edit action was added.
- Existing list rows remain selection-only until the details dialog phase.

## Phase 02.4 Check Results

- `cd client && npm run build`: passed after approved rerun. The sandboxed run failed because Next.js could not fetch the configured Google-hosted Urbanist font.
- `cd client && npm run lint`: not run because no `lint` script exists.
- `cd client && npm run typecheck`: not run because no `typecheck` script exists.
- `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q`: passed after approved rerun with `169 passed, 1 warning`. The sandboxed run failed because the disposable PostgreSQL fixture could not bind `127.0.0.1`.
