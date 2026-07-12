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

## Phase 03.3 - Loan Balance Effects

## Given Loan Balance Rule

- Creating a given loan subtracts its principal amount from the selected account's loan balance adjustment.
- The account `current_balance` now includes opening balance plus the persisted loan adjustment.
- No insufficient-funds validation was added because the existing finance flows do not enforce that rule; a given loan can produce a negative current balance.

## Taken Loan Balance Rule

- Creating a taken loan adds its principal amount to the selected account's loan balance adjustment.
- The adjustment is account-specific and does not affect unrelated accounts.

## Atomicity / Double-Counting Protection

- The account adjustment and loan record are committed in the same database transaction.
- Re-reading or reloading a loan does not reapply its balance effect.
- Existing edits that change account, direction, or principal reverse the previous effect and apply the replacement effect once.
- Note-only and other non-balance edits do not change account balances.
- Migration `202607110303` backfills adjustments for existing account-linked loans.

## Repayment/Delete Notes

- Loan settlements do not adjust account balances in this phase.
- Archiving/deleting a loan does not reverse its original account effect in this phase.
- Repayment and deletion reversal behavior remains deferred for later loan work.

## Edge Cases

- Existing legacy loans without an account reference do not affect an account balance.
- Historical loans retain their account effect if the linked account is later disabled.
- Failed loan creation does not commit an account adjustment.
- `cd client && npm run build`: passed.
- `cd client && npm run lint`: not run because no `lint` script exists.
- `cd client && npm run typecheck`: not run because no `typecheck` script exists.
- `cd client && npm run api:check`: passed.
- `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check app tests`: passed.
- `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check app tests alembic/versions`: passed for 158 files.
- `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests/test_loans.py tests/test_accounts_categories.py`: passed with `14 passed, 1 warning`.
- `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q`: passed after updating the intended account schema assertion with `171 passed, 1 warning`.

## Phase 03.4 - Repay Date Added

## Field Name

- The backend and generated API use `repay_date` as a date-only value.
- New loan requests require `repay_date`.
- The database and response keep the field nullable so pre-migration loans remain readable.

## Form Behavior

- Given loans show an `Expected Return Date` field.
- Taken loans show a `Repayment Due Date` field.
- New forms default the repay date to today and allow selection through the existing calendar control.
- Edit forms load and persist the loan's existing repay date.

## Display Behavior

- Loan list cards display `Expected back` for given loans and `Repay by` for taken loans.
- The existing loan details drawer displays the same direction-specific repay-date label.
- Legacy records without a repay date display `not set`.
- No overdue detection or red styling was added in this phase.

## Validation Behavior

- Missing repay dates are rejected for new loans.
- Repay dates before the loan issue date are rejected by the form and backend.
- Partial updates validate the resulting issue-date/repay-date pair.
- `cd client && npm run build`: passed.
- `cd client && npm run lint`: not run because no `lint` script exists.
- `cd client && npm run typecheck`: not run because no `typecheck` script exists.
- `cd client && npm run api:check`: passed.
- `cd client && npm run e2e`: approved rerun could not start because the app usage limit blocked escalation.
- `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check app tests`: passed.
- `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check app tests alembic/versions`: passed for 159 files.
- `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q tests/test_loans.py`: passed with `5 passed, 1 warning`.
- `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q`: passed with `171 passed, 1 warning`.

## Phase 03.5 - Overdue Loan Red State

## Overdue Rule

- A loan is overdue when `repay_date` is before the user's local current date and `outstanding_amount` is greater than zero.
- The same predicate applies to given and taken loans.
- A repay date equal to today is not overdue.

## UI Styling

- Overdue loan cards use the existing destructive border, background tint, amount text, and repay-date text classes.
- The loan details drawer shows a destructive `Overdue` status banner.
- Non-overdue loans retain the existing card styling.

## Paid/Settled Behavior

- Fully settled loans have zero outstanding amount and are not marked overdue.
- Partial settlements remain overdue while a positive amount is still outstanding and the repay date is past.

## Edge Cases

- Legacy loans without a repay date are not marked overdue.
- Archived loans remain excluded by the existing loan-list behavior.
- No backend schema, API, balance, summary, or repay-date behavior changed in this phase.
- `cd client && npm run build`: passed.
- `cd client && npm run lint`: not run because no `lint` script exists.
- `cd client && npm run typecheck`: not run because no `typecheck` script exists.
- `cd client && npm run api:check`: passed.
- `cd client && npm run e2e`: passed with `1 passed` after correcting the overdue fixture so its loan issue date precedes its repay date.
- `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check app tests`: passed.
- `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check app tests alembic/versions`: passed for 159 files.
- `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q`: passed with `171 passed, 1 warning`.

## Phase 03.6 - Loan Summary Cards Updated

## Removed Card

- The loan page no longer shows the third net `Due` summary card.
- The summary row now contains exactly two cards.

## Given Loan Due Calculation

- `Given Loan Due` displays the existing `total_loan_given` summary value.
- The backend calculates it as the sum of each given loan's principal minus its settlements, clamped at zero, so paid amounts are excluded.

## Taken Loan Due Calculation

- `Taken Loan Due` displays the existing `total_loan_taken` summary value.
- The backend calculates it as the sum of each taken loan's principal minus its settlements, clamped at zero, so paid amounts are excluded.

## Currency Display Rule

- Both cards use the user's current base currency for the summary request and money formatting.
- The existing summary endpoint filters records to that currency. Cross-currency conversion and aggregation remain deferred.

## Responsive Layout

- The two summary cards share an equal-width two-column row at supported viewport sizes.
- The summary region has an accessible label used by focused browser regression coverage.
- No backend schema, API, balance, settlement, overdue, or repay-date behavior changed in this phase.
- `cd client && npm run build`: passed after allowing the configured Google Font fetch.
- `cd client && npm run lint`: not run because no `lint` script exists.
- `cd client && npm run typecheck`: not run because no `typecheck` script exists.
- `cd client && npm run api:check`: passed.
- `cd client && npm run e2e`: passed with `1 passed`.
- `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check app tests`: passed.
- `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check app tests alembic/versions`: passed for 159 files.
- `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q`: passed with `171 passed, 1 warning`.

## Phase 03.7 - Account Currency Applied to Loan Lists

## Currency Source

- The loan list loads the user's accounts, including disabled and archived accounts needed by historical records.
- Each linked loan resolves its display currency from the account identified by `account_id`.
- Stored loan currency no longer overrides the linked account currency on the list surface.

## Legacy Loan Fallback

- A legacy loan without `account_id` continues to use its stored loan currency.
- A loan whose historical account cannot be resolved also falls back to its stored loan currency.

## List Display

- Given and taken loan cards format outstanding and principal amounts using the selected account currency.
- No loan form, summary-card, backend contract, balance, settlement, overdue, or repay-date behavior changed in this phase.

## Detail Display

- The detail drawer opened from a loan list card uses the same resolved account currency for outstanding, principal, settled, and settlement-history amounts.
- `cd client && npm run build`: passed after allowing the configured Google Font fetch.
- `cd client && npm run lint`: not run because no `lint` script exists.
- `cd client && npm run typecheck`: not run because no `typecheck` script exists.
- `cd client && npm run api:check`: passed.
- `cd client && npm run e2e`: passed with `1 passed` after moving loan verification to the end of the integrated journey and making existing wallet selectors exact for the added `Loan Wallet` fixture.
- `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check app tests`: passed.
- `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check app tests alembic/versions`: passed for 159 files.
- `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q`: passed with `171 passed, 1 warning`.
