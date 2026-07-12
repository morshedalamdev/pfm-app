# Agent 05 — Transaction Category and Account Rules

## Role

You are Agent 05 for `pfm-app`.

Your scope is only the Transaction area:

- Add categories: `Hangout`, `Vacation`, `Party`.
- Auto-select the primary/default account in transaction forms.
- Allow the user to change account from a dropdown.
- Exclude disabled accounts from new transaction selection.
- Store selected account on each transaction.
- Show transaction amounts using the selected account currency.
- Apply income/expense balance effects only to the selected account.
- Preserve Home totals so income/expense include transactions only and exclude loans.

Do not implement recurring popup behavior. That belongs to Agent 06 and Agent 07.

Repository:

```text
https://github.com/morshedalamdev/pfm-app
```

---

## Branch

Use this branch only:

```bash
git checkout main
git pull
git checkout -b feature/transaction-category-account-rules
```

If it already exists:

```bash
git checkout feature/transaction-category-account-rules
git pull
```

---

## Required Previous Agents

Run this only after these are merged into `main`:

```text
Agent 00 — Current App Audit
Agent 01 — Sidebar and Navigation Update
Agent 02 — Account Page and Account Rules
Agent 03 — Loan and Debt Account Integration
Agent 04 — Settings and Home Page Balance Rules
```

Read these docs if present:

```text
docs/audit/00_CURRENT_APP_AUDIT.md
docs/audit/01_FEATURE_IMPLEMENTATION_CHECKLIST.md
docs/audit/02_BASELINE_TEST_REPORT.md
docs/agents/02_ACCOUNT_PAGE_AND_RULES.md
docs/agents/02_ACCOUNT_TEST_REPORT.md
docs/agents/04_HOME_SETTINGS_BALANCE_DISPLAY.md
docs/agents/04_HOME_SETTINGS_TEST_REPORT.md
```

If account/default-account helpers from Agent 02 are missing, stop and report Agent 05 is blocked. Do not create a second account system.

---

## Output Rule

At the end of every phase, show only:

```text
Changed files:
- ...

Test result:
- ...

Bugs fixed:
- ...

Permission:
Can I continue to the next phase?
```

Do not explain the implementation. Do not start the next phase without permission.

---

## Required Workflow Per Phase

```text
Think internally
Execute only current phase
Run tests
Fix failures
Run tests again
Update docs
Commit
Stop
Ask permission
```

---

## Tests

Run available commands only. Do not invent missing scripts.

Primary frontend checks:

```bash
cd client && npm run build
```

If available:

```bash
cd client && npm run lint
cd client && npm run typecheck
cd client && npm test
```

If backend tests exist and are relevant:

```bash
cd server && pytest
```

or:

```bash
cd server && npm run test:ci
```

---

# Phase 05.1 — Transaction Baseline and Account Dependency Audit

## Objective

Audit existing transaction behavior before implementation.

## Tasks

1. Inspect transaction page, form, list, store/API, types/schemas, category constants, and mock data.
2. Inspect account helpers/selectors from Agent 02.
3. Inspect Home total helpers from Agent 04.
4. Confirm whether transactions currently support:
   - income
   - expense
   - category
   - amount
   - date
   - note
   - recurring flag
   - selected account
   - currency display
5. Create/update:

```text
docs/agents/05_TRANSACTION_CATEGORY_ACCOUNT_RULES.md
```

Add:

```md
# Agent 05 — Transaction Category and Account Rules

## Phase 05.1 — Baseline Audit

## Files Inspected

## Current Transaction Behavior

## Current Category Source

## Existing Account Integration

## Current Balance Effect Behavior

## Current Currency Display

## Home Total Interaction

## Planned Files to Change

## Blockers
```

## Commit

```bash
git add .
git commit -m "agent 05 phase 05.1: audit transaction account dependencies"
```

Stop and ask permission for phase 05.2.

---

# Phase 05.2 — Add Requested Transaction Categories

## Objective

Add transaction categories only.

## Tasks

1. Add categories exactly:
   - `Hangout`
   - `Vacation`
   - `Party`
2. Add them to the correct existing category group. Usually these should be expense categories unless the app has a general category model.
3. Use existing icon/color conventions if categories have icons/colors.
4. Ensure category selection UI shows them.
5. Do not change account, balance, loan, home, or recurring behavior.
6. Update `docs/agents/05_TRANSACTION_CATEGORY_ACCOUNT_RULES.md` with:

```md
## Phase 05.2 — Transaction Categories Added

## Added Categories

## Category Group

## UI Display

## Notes
```

## Commit

```bash
git add .
git commit -m "agent 05 phase 05.2: add transaction categories"
```

Stop and ask permission for phase 05.3.

---

# Phase 05.3 — Default Account Auto-Selection

## Objective

Auto-select the primary/default account in the transaction form.

## Tasks

1. Load default account from Agent 02 account helper/store/API.
2. Auto-select it when creating income or expense.
3. If no default exists, select first active account if available.
4. If no active account exists, show safe validation/empty state.
5. Disabled accounts must not be auto-selected.
6. Do not add manual account dropdown yet.
7. Do not implement balance effects yet.
8. Update `docs/agents/05_TRANSACTION_CATEGORY_ACCOUNT_RULES.md` with:

```md
## Phase 05.3 — Default Account Auto-Selection

## Default Source

## Fallback Rule

## Disabled Account Handling

## Validation Behavior
```

## Commit

```bash
git add .
git commit -m "agent 05 phase 05.3: auto-select default transaction account"
```

Stop and ask permission for phase 05.4.

---

# Phase 05.4 — Account Dropdown Override

## Objective

Allow user to change selected account in transaction form.

## Tasks

1. Add account dropdown using existing UI style.
2. Show only active accounts.
3. Preselect default account from phase 05.3.
4. Allow user to choose another active account.
5. Store selected account ID with transaction data/payload.
6. Validate selected account exists and is active.
7. Use shared account-select helper/component from Agent 02 if available.
8. Do not implement balance effects yet.
9. Update `docs/agents/05_TRANSACTION_CATEGORY_ACCOUNT_RULES.md` with:

```md
## Phase 05.4 — Account Dropdown Override

## Dropdown Source

## Active Account Rule

## Selected Account Persistence

## Validation Behavior

## Reused Components
```

## Commit

```bash
git add .
git commit -m "agent 05 phase 05.4: add transaction account dropdown"
```

Stop and ask permission for phase 05.5.

---

# Phase 05.5 — Transaction Balance Effects

## Objective

Apply income/expense transaction effects to selected account balance.

## Tasks

1. Income transaction increases selected account balance.
2. Expense transaction decreases selected account balance.
3. Balance effect must apply only to selected account.
4. Prevent duplicate balance changes on rerender, reload, or repeated submit.
5. If edit/delete transaction behavior exists, inspect whether balance reversal/adjustment is handled. If not, document deferred work.
6. Do not modify loan/debt balance logic.
7. Do not modify recurring popup behavior.
8. Update `docs/agents/05_TRANSACTION_CATEGORY_ACCOUNT_RULES.md` with:

```md
## Phase 05.5 — Transaction Balance Effects

## Income Balance Rule

## Expense Balance Rule

## Selected Account Rule

## Double-Counting Protection

## Edit/Delete Notes

## Edge Cases
```

## Commit

```bash
git add .
git commit -m "agent 05 phase 05.5: apply transaction balance effects"
```

Stop and ask permission for phase 05.6.

---

# Phase 05.6 — Transaction Currency Display

## Objective

Display transaction amounts using the selected account currency.

## Tasks

1. Resolve account currency for each transaction row/card.
2. Display income and expense amounts with selected account currency.
3. Apply same rule to transaction detail dialog/view if one exists.
4. Add fallback for legacy transactions without account reference using current app convention.
5. Do not add currency conversion.
6. Update `docs/agents/05_TRANSACTION_CATEGORY_ACCOUNT_RULES.md` with:

```md
## Phase 05.6 — Account Currency Applied to Transaction Lists

## Currency Source

## Legacy Transaction Fallback

## List Display

## Detail Display
```

## Commit

```bash
git add .
git commit -m "agent 05 phase 05.6: show transactions in account currency"
```

Stop and ask permission for phase 05.7.

---

# Phase 05.7 — Preserve Home Totals and Loan Exclusion

## Objective

Verify transaction changes do not break Home income/expense rules from Agent 04.

## Tasks

1. Ensure Home income total includes only income transactions.
2. Ensure Home expense total includes only expense transactions.
3. Ensure taken loans are excluded from income.
4. Ensure given loans are excluded from expense.
5. Ensure account-linked transactions are still included.
6. Do not auto-count future recurring items.
7. Do not implement recurring popup behavior.
8. Update `docs/agents/05_TRANSACTION_CATEGORY_ACCOUNT_RULES.md` with:

```md
## Phase 05.7 — Home Totals Preserved

## Income Total Rule

## Expense Total Rule

## Loan Exclusion

## Account-Linked Transaction Handling

## Recurring Placeholder Handling
```

## Commit

```bash
git add .
git commit -m "agent 05 phase 05.7: preserve home transaction totals"
```

Stop and ask permission for phase 05.8.

---

# Phase 05.8 — Regression Verification

## Objective

Run full verification and document final behavior.

## Tasks

1. Run all available relevant tests/builds.
2. Verify:
   - Hangout category appears.
   - Vacation category appears.
   - Party category appears.
   - Transaction form auto-selects default account.
   - User can change account from dropdown.
   - Disabled accounts do not appear for new transaction selection.
   - Transaction stores selected account reference.
   - Income increases selected account balance.
   - Expense decreases selected account balance.
   - Transaction list displays selected account currency.
   - Legacy transactions without account display safely.
   - Home income total includes only income transactions.
   - Home expense total includes only expense transactions.
   - Home totals exclude loan/debt.
   - Recurring popup behavior has not been implemented.
3. Create/update:

```text
docs/agents/05_TRANSACTION_TEST_REPORT.md
```

Include:

```md
# Agent 05 Test Report

## Branch

## Commands Run

## Passing Checks

## Failing Checks

## Bugs Fixed

## Manual Verification Checklist

## Deferred Work

## Safe Starting Point for Agent 06
```

## Commit

```bash
git add .
git commit -m "agent 05 phase 05.8: verify transaction account rules"
```

Final response must show only:

```text
Changed files:
- ...

Test result:
- ...

Bugs fixed:
- ...

Permission:
Agent 05 is complete. Can I continue with Agent 06 planning/generation?
```

---

# Agent 05 Final Success Criteria

Agent 05 is complete only when:

- Branch `feature/transaction-category-account-rules` exists.
- Categories exist: `Hangout`, `Vacation`, `Party`.
- Transaction form auto-selects default account.
- User can change selected account from dropdown.
- Disabled accounts are excluded from new transaction selection.
- Transaction records store selected account reference.
- Income transaction increases selected account balance.
- Expense transaction decreases selected account balance.
- Transaction list displays amount using selected account currency.
- Legacy transactions without account display safely.
- Home income total includes only income transactions.
- Home expense total includes only expense transactions.
- Home totals exclude loan/debt.
- Tests/builds have been run.
- Agent 05 docs are updated.
- Agent 05 test report is created.
- No recurring popup behavior is implemented.
- No loan/debt business logic is implemented.
- No account page/business-rule work is implemented.
- Agent stops and asks permission before Agent 06.

---
