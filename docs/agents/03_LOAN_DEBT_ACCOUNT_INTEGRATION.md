# Agent 03 - Loan and Debt Account Integration

## Phase 03.1 - Loan/Debt Baseline and Dependency Check

## Files Inspected

- `AGENT.md`
- `PFM_PROJECT_STATE.md`
- `docs/audit/00_CURRENT_APP_AUDIT.md`
- `docs/audit/01_FEATURE_IMPLEMENTATION_CHECKLIST.md`
- `docs/audit/02_BASELINE_TEST_REPORT.md`
- `docs/agents/01_SIDEBAR_NAVIGATION_UPDATE.md`
- `docs/agents/01_SIDEBAR_NAVIGATION_TEST_REPORT.md`
- `docs/agents/02_ACCOUNT_PAGE_AND_RULES.md`
- `docs/agents/02_ACCOUNT_TEST_REPORT.md`
- `client/package.json`
- `client/lib/finance/api.ts`
- `client/lib/finance/accounts.ts`
- `client/app/(dashboard)/loan/page.tsx`
- `client/app/(dashboard)/loan/[id]/page.tsx`
- `client/components/items/LoanItem.tsx`
- `client/components/AccountBoard.tsx`
- `client/app/(dashboard)/accounts/page.tsx`
- `server/app/modules/accounts/models.py`
- `server/app/modules/accounts/schemas.py`
- `server/app/modules/accounts/services.py`
- `server/app/modules/accounts/repositories.py`
- `server/app/modules/finance_defaults.py`
- `server/app/modules/loans/models.py`
- `server/app/modules/loans/schemas.py`
- `server/app/modules/loans/services.py`
- `server/app/modules/loans/repositories.py`

## Current Loan/Debt Behavior

- Loan/debt route: `client/app/(dashboard)/loan/page.tsx`.
- Loan/debt form route: `client/app/(dashboard)/loan/[id]/page.tsx`.
- Loan/debt list/card: `client/components/items/LoanItem.tsx`.
- Loan/debt summary boxes: `/loan` renders three `HeaderItem` cards: `Given`, `Taken`, and `Due`.
- Loan/debt frontend API calls and generated types are consumed through `client/lib/finance/api.ts`.
- Loan/debt backend types and persistence are in `server/app/modules/loans/models.py`, `schemas.py`, `services.py`, and `repositories.py`.
- Given loan support exists through `LoanRecord.direction === "given"`.
- Taken loan support exists through `LoanRecord.direction === "taken"`.
- Amount support exists through `principal_amount`.
- Person/contact support exists through `loan_people` plus the frontend people drawer and Contact Picker feature detection.
- Due amount support exists as `outstanding_amount`, calculated from principal minus settlements.
- Repay date is missing; only `issued_at` and settlement dates exist.
- Account selection is missing from loan records, loan form payloads, responses, and UI.
- Overdue state is missing because there is no repay date field to compare against today.

## Existing Account Integration

- Account APIs exist under `/api/v1/accounts` and are consumed by `listAccounts`, `createAccount`, and `deleteAccount`.
- Account records include `name`, `type`, `currency`, `opening_balance`, `is_archived`, and `archived_at`.
- Active account listing excludes archived accounts through `include_archived=false`.
- Empty users receive a backend-created default `Cash` account through `ensure_default_account`.
- Agent 02 added `is_default`, `is_disabled`, `disabled_at`, and `current_balance` account fields.
- Agent 02 added active/default account helpers, including `getActiveAccounts`, `getDefaultAccount`, `getDefaultAccountId`, `getAccountSelectOptions`, and `resolveAccountSelectValue`.
- Agent 02 added account-currency formatting helpers for later loan and transaction forms.
- The dedicated `/accounts` page supports account creation, details, disable, safe delete, and default-account selection.
- Account delete/archive is blocked when referenced by existing transaction or recurring-rule records; loan references remain deferred until loans store account IDs.
- Agent 02 documentation and verification outputs are present, with its required checks passing.

## Missing Dependencies

- No required Agent 02 account dependency is missing for phase 03.2.
- Agent 02 is complete on `feature/account-page-and-account-rules`, but is not merged into `main`; the Agent 03 branch was fast-forwarded to that completed dependency tip for this audit.
- Loan account linkage and loan-aware account delete eligibility remain Agent 03 work for later phases.

## Planned Files to Change

- Phase 03.2 and later are expected to change:
  - `server/app/modules/loans/models.py`
  - `server/app/modules/loans/schemas.py`
  - `server/app/modules/loans/services.py`
  - `server/app/modules/loans/repositories.py`
  - `server/alembic/versions/*`
  - `server/tests/test_loans.py`
  - `client/lib/finance/api.ts`
  - `client/generated/openapi.json`
  - `client/generated/api-types.ts`
  - `client/app/(dashboard)/loan/page.tsx`
  - `client/app/(dashboard)/loan/[id]/page.tsx`
  - `client/components/items/LoanItem.tsx`
  - `client/e2e/pfm.e2e.spec.mjs`

## Blockers

- No code dependency blocker was found. Phase 03.2 must not start without user permission.

## Test Commands

- `cd client && npm run build`
- `cd client && npm run lint`: not available; `client/package.json` has no `lint` script.
- `cd client && npm run typecheck`: not available; `client/package.json` has no `typecheck` script.
- `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q`

## Check Results

- `cd client && npm run build`: passed after an approved rerun. The sandboxed run failed because Next.js could not fetch the configured Google-hosted Urbanist font.
- `cd client && npm run lint`: not run because no `lint` script exists.
- `cd client && npm run typecheck`: not run because no `typecheck` script exists.
- `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q`: passed after an approved rerun with `169 passed, 1 warning`. The sandboxed run failed because the disposable PostgreSQL fixture could not bind `127.0.0.1`.

## Phase 03.2 - Account Selection Added to Loan Forms

## Changed Files

- `server/app/modules/loans/models.py`
- `server/app/modules/loans/schemas.py`
- `server/app/modules/loans/services.py`
- `server/app/modules/loans/router.py`
- `server/alembic/versions/202607110302_add_loan_account_selection.py`
- `server/tests/test_loans.py`
- `client/generated/openapi.json`
- `client/generated/api-types.ts`
- `client/app/(dashboard)/loan/[id]/page.tsx`
- `client/e2e/pfm.e2e.spec.mjs`
- `docs/agents/03_LOAN_DEBT_ACCOUNT_INTEGRATION.md`
- `PFM_PROJECT_STATE.md`

## Account Selection Behavior

- Given loans require a selected source account.
- Taken loans require a selected destination account.
- The shared create/edit form loads accounts through the existing Agent 02 API and renders them with existing form controls.
- Users can change the selected account from the account drawer.
- New loan records require `account_id`; API responses retain it.
- The database stores account ownership through a composite account/user foreign key.

## Default Account Behavior

- New forms auto-select the active default account through `resolveAccountSelectValue`.
- If no active default exists, the existing Agent 02 helper falls back to the first active account.
- Editing an account-linked loan initially selects its stored account.

## Disabled Account Handling

- Disabled and archived accounts are excluded from new loan selections.
- An existing disabled account remains visible and selected while editing its historical loan.
- The backend accepts an unchanged disabled account on a historical loan but rejects assigning a disabled or archived account to a new or different loan.
- Existing pre-migration loans remain readable with a nullable legacy `account_id`.

## Notes

- Account balance effects are deferred to phase 03.3.
- Repay dates, overdue styling, summary-card changes, and account-currency list display were not implemented.
- `cd client && npm run build`: passed.
- `cd client && npm run lint`: not run because no `lint` script exists.
- `cd client && npm run typecheck`: not run because no `typecheck` script exists.
- `cd client && npm run api:check`: passed.
- `cd client && npm run e2e`: passed with `1 passed` after updating loan API fixtures with required account IDs.
- `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check app tests`: passed.
- `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check app tests alembic/versions`: passed for 157 files.
- `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests/test_loans.py`: passed with `4 passed, 1 warning`.
- `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q`: passed with `170 passed, 1 warning`.
