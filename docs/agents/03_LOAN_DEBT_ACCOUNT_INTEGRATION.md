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
- `client/package.json`
- `client/lib/finance/api.ts`
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
- Account delete/archive is blocked when referenced by existing transaction or recurring-rule records.
- `AccountBoard` can create and delete accounts, but the current `/accounts` route is only a placeholder shell.
- No Agent 02 output docs were found at `docs/agents/02_ACCOUNT_PAGE_AND_RULES.md` or `docs/agents/02_ACCOUNT_TEST_REPORT.md`.
- No primary/default account field or user-selectable default account behavior was found in the account model, schemas, API response, frontend UI, or generated account types.

## Missing Dependencies

- Agent 02 documentation outputs are missing.
- Agent 02 standalone account page behavior is incomplete; `/accounts` is still a placeholder route.
- Agent 02 primary/default-account logic is missing. Existing default bootstrap creates the first `Cash` account for empty users, but it does not identify a user-selected primary/default account for loan forms.
- Loan/debt can consume active account listing in a later phase, but the requested default/primary auto-selection dependency is not available yet.

## Planned Files to Change

- Blocked until Agent 02 default/primary-account behavior exists:
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

- Agent 03 is blocked before phase 03.2 because Agent 02 output docs are missing and the account primary/default-account dependency required by the Agent 03 brief does not exist in code.

## Test Commands

- `cd client && npm run build`
- `cd client && npm run lint`: not available; `client/package.json` has no `lint` script.
- `cd client && npm run typecheck`: not available; `client/package.json` has no `typecheck` script.
- `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests/test_loans.py tests/test_accounts_categories.py`

## Check Results

- `cd client && npm run build`: sandboxed run failed because Next.js could not fetch the configured Google-hosted Urbanist font. Approved rerun could not start because escalated command approval was rejected by the app usage limit.
- `cd client && npm run lint`: not run because no `lint` script exists.
- `cd client && npm run typecheck`: not run because no `typecheck` script exists.
- `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests/test_loans.py tests/test_accounts_categories.py`: sandboxed run failed because the disposable PostgreSQL fixture could not bind `127.0.0.1`. Approved rerun could not start because escalated command approval was rejected by the app usage limit.
