# Agent 03 — Loan and Debt Account Integration

## Agent Identity

You are **Agent 03 — Loan and Debt Account Integration** for the `pfm-app` project.

Your job is to update only the Loan & Debt area so loans are connected to accounts, balances are affected correctly, repay dates are supported, overdue loans are visually clear, and the loan summary cards match the requested behavior.

You must not implement sidebar changes, account page creation, account business rules, transaction category updates, recurring transaction popups, or home/settings balance-source behavior in this agent.

---

## Repository

```text
Repository: https://github.com/morshedalamdev/pfm-app
Live frontend: https://pfm.morshedalam.dev
```

---

## Required Git Branch

Every agent must have its own GitHub branch.

Before starting this agent, create and work only on this branch:

```bash
git checkout main
git pull
git checkout -b feature/loan-debt-account-integration
```

If the branch already exists:

```bash
git checkout feature/loan-debt-account-integration
git pull
```

---

## Required Previous Agents

Agent 03 should run only after these agents are completed and merged into `main`:

```text
Agent 00 — Current App Audit
Agent 01 — Sidebar and Navigation Update
Agent 02 — Account Page and Account Rules
```

Agent 03 depends on Agent 02 because loans must select from existing accounts and must use the account currency/default-account behavior created there.

Before making changes, read these files if they exist:

```text
docs/audit/00_CURRENT_APP_AUDIT.md
docs/audit/01_FEATURE_IMPLEMENTATION_CHECKLIST.md
docs/audit/02_BASELINE_TEST_REPORT.md
docs/agents/01_SIDEBAR_NAVIGATION_UPDATE.md
docs/agents/01_SIDEBAR_NAVIGATION_TEST_REPORT.md
docs/agents/02_ACCOUNT_PAGE_AND_RULES.md
docs/agents/02_ACCOUNT_TEST_REPORT.md
```

If Agent 02 outputs are missing and account selection/default-account logic does not exist, stop and report that Agent 03 is blocked. Do not invent a parallel account system inside Agent 03.

---

## User Requirements for All Agents

Every phase must follow this workflow:

```text
Think internally → Execute task → Run tests → Fix failed tests → Run tests again → Commit → Stop
```

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

Do **not** explain the implementation.  
Do **not** provide long reasoning.  
Do **not** start the next phase without permission.  
Do **not** include architecture explanation in the final output.  
Only show changed files, test result, bugs fixed, and permission question.

---

## Agent 03 Goal

Update Loan & Debt behavior based on the requested product rules.

Requested Loan & Debt changes:

- User can select which account they want to give loan from.
- User can select which account they want to take loan into.
- Given loan must deduct money from the selected account.
- Taken loan must add money to the selected account.
- Loan given and loan taken must have a `repay date` input field.
- Repay date means:
  - for given loan: the date user expects to get the money back
  - for taken loan: the date user needs to repay the money by
- In the loan page, overdue loans must show in red.
- Loan page currently has three summary boxes; remove one.
- Loan page should have only two summary boxes:
  - total due from given loans
  - total due from taken loans
- Loan listing should display amounts in the selected account currency.
- The default/primary account from Agent 02 should auto-select in loan forms, but user can change it from a dropdown.

---

## Agent 03 Scope

Agent 03 may change:

- Loan/debt page components.
- Loan/debt forms.
- Loan/debt state/store/API logic.
- Loan/debt models/types/schemas.
- Account balance update integration where directly required for loan/debt behavior.
- Currency display for loan/debt list and summary.
- Tests related to loan/debt account integration.
- Documentation for Agent 03.

Agent 03 must not implement:

- Account page UI.
- Account details dialog.
- Account creation/edit/disable/delete rules, except consuming existing account behavior.
- Sidebar/navigation changes.
- Transaction category changes.
- Recurring income/expense popup behavior.
- Home/settings dashboard balance-source behavior.
- Broad backend architecture migration.

---

## Domain Rules

### Given Loan

A given loan means the user gives money to another person.

Required behavior:

```text
selected account balance decreases
loan appears as given loan due
amount uses selected account currency
repay date is required or validated according to existing form conventions
```

Example:

```text
Cash account balance: 1000
User gives loan: 200
Cash account balance after save: 800
Given loan due total increases by 200
```

### Taken Loan

A taken loan means the user receives borrowed money from another person.

Required behavior:

```text
selected account balance increases
loan appears as taken loan due
amount uses selected account currency
repay date is required or validated according to existing form conventions
```

Example:

```text
Bank account balance: 1000
User takes loan: 300
Bank account balance after save: 1300
Taken loan due total increases by 300
```

### Overdue Rule

A loan is overdue when:

```text
repay date < today
and loan still has unpaid due amount
```

Overdue loans must show visually in red. Use existing design system colors/classes where possible.

### Summary Card Rule

Loan page should show exactly two summary boxes/cards:

```text
Given Loan Due
Taken Loan Due
```

Remove any third box/card from the loan summary area.

---

# Phase 03.1 — Loan/Debt Baseline and Dependency Check

## Objective

Audit the current Loan & Debt implementation and confirm Agent 02 account dependencies exist.

## Tasks

1. Read Agent 00 and Agent 02 docs if available.
2. Inspect current loan/debt page and components.
3. Locate:
   - loan/debt route
   - loan/debt form
   - loan/debt list/table/card
   - loan/debt summary boxes
   - loan/debt data types
   - loan/debt state/store/API calls
   - account selector/default account logic from Agent 02
4. Confirm whether loan/debt currently supports:
   - given loan
   - taken loan
   - amount
   - person/contact
   - due amount
   - repay date
   - account selection
   - overdue state
5. If account/default-account logic from Agent 02 is missing, stop and mark Agent 03 as blocked.
6. Create or update:

```text
docs/agents/03_LOAN_DEBT_ACCOUNT_INTEGRATION.md
```

7. Add this section:

```md
# Agent 03 — Loan and Debt Account Integration

## Phase 03.1 — Loan/Debt Baseline and Dependency Check

## Files Inspected

## Current Loan/Debt Behavior

## Existing Account Integration

## Missing Dependencies

## Planned Files to Change

## Blockers
```

## Tests to Run

Run available frontend checks:

```bash
cd client && npm run build
```

If available:

```bash
cd client && npm run lint
cd client && npm run typecheck
```

If backend tests exist and are relevant:

```bash
cd server && pytest
```

or:

```bash
cd server && npm run test:ci
```

Do not invent missing scripts. If a script does not exist, record it in the agent doc.

## Commit

```bash
git add .
git commit -m "agent 03 phase 03.1: audit loan debt account dependencies"
```

## Stop Condition

Stop after the commit and ask permission before phase 03.2.

Final response format:

```text
Changed files:
- ...

Test result:
- ...

Bugs fixed:
- ...

Permission:
Can I continue to phase 03.2?
```

---

# Phase 03.2 — Add Account Selection to Loan Forms

## Objective

Allow users to select the account used for given and taken loans.

## Tasks

1. Add account selection to the given-loan form.
2. Add account selection to the taken-loan form.
3. Auto-select the primary/default account created by Agent 02.
4. Allow user to change the selected account from a dropdown.
5. Exclude disabled accounts from new loan selection if Agent 02 already provides disabled-account behavior.
6. Preserve existing historical loans that use disabled accounts.
7. Make sure selected account ID is stored with the loan record/state/API payload.
8. Use existing form controls/styles.
9. Update:

```text
docs/agents/03_LOAN_DEBT_ACCOUNT_INTEGRATION.md
```

10. Add/update this section:

```md
## Phase 03.2 — Account Selection Added to Loan Forms

## Changed Files

## Account Selection Behavior

## Default Account Behavior

## Disabled Account Handling

## Notes
```

## Tests to Run

```bash
cd client && npm run build
```

If available:

```bash
cd client && npm run lint
cd client && npm run typecheck
```

If backend tests exist and are relevant:

```bash
cd server && pytest
```

## Bug Fix Rule

If tests fail:

1. Fix the failing issue.
2. Run the failed command again.
3. Do not expand scope.

## Commit

```bash
git add .
git commit -m "agent 03 phase 03.2: add account selection to loan forms"
```

## Stop Condition

Stop after the commit and ask permission before phase 03.3.

Final response format:

```text
Changed files:
- ...

Test result:
- ...

Bugs fixed:
- ...

Permission:
Can I continue to phase 03.3?
```

---

# Phase 03.3 — Implement Loan Balance Effects

## Objective

Update selected account balances when given or taken loans are created.

## Tasks

1. Implement balance deduction for given loans.
2. Implement balance addition for taken loans.
3. Ensure the balance update and loan creation happen together in the same state/API transaction where possible.
4. Avoid duplicate balance effects on re-render or page reload.
5. If edit behavior exists, do not implement broad loan editing unless already supported. Only avoid double-counting.
6. If delete/repayment behavior already exists, inspect whether balances need to reverse or adjust. If repayment behavior is outside current scope, document it for later.
7. Add validation for insufficient funds only if the app already enforces this rule. If the project has no such rule, document the decision and do not add a new product rule.
8. Update:

```text
docs/agents/03_LOAN_DEBT_ACCOUNT_INTEGRATION.md
```

9. Add/update this section:

```md
## Phase 03.3 — Loan Balance Effects

## Given Loan Balance Rule

## Taken Loan Balance Rule

## Atomicity / Double-Counting Protection

## Repayment/Delete Notes

## Edge Cases
```

## Tests to Run

```bash
cd client && npm run build
```

If available:

```bash
cd client && npm run lint
cd client && npm run typecheck
```

If backend tests exist:

```bash
cd server && pytest
```

If project has unit tests for stores/domain logic, run them.

## Commit

```bash
git add .
git commit -m "agent 03 phase 03.3: apply loan balance effects"
```

## Stop Condition

Stop after the commit and ask permission before phase 03.4.

Final response format:

```text
Changed files:
- ...

Test result:
- ...

Bugs fixed:
- ...

Permission:
Can I continue to phase 03.4?
```

---

# Phase 03.4 — Add Repay Date Field

## Objective

Add repay date support to both given and taken loans.

## Tasks

1. Add `repayDate` or project-convention equivalent to loan type/schema/model.
2. Add repay-date input field to given-loan form.
3. Add repay-date input field to taken-loan form.
4. Persist repay date in state/API payload.
5. Display repay date in the loan list/detail UI.
6. Label the field clearly:
   - Given loan: expected return date
   - Taken loan: repayment due date
7. Follow existing date-input conventions.
8. Validate date according to existing form validation style.
9. Update:

```text
docs/agents/03_LOAN_DEBT_ACCOUNT_INTEGRATION.md
```

10. Add/update this section:

```md
## Phase 03.4 — Repay Date Added

## Field Name

## Form Behavior

## Display Behavior

## Validation Behavior
```

## Tests to Run

```bash
cd client && npm run build
```

If available:

```bash
cd client && npm run lint
cd client && npm run typecheck
```

If backend tests exist:

```bash
cd server && pytest
```

## Commit

```bash
git add .
git commit -m "agent 03 phase 03.4: add loan repay date"
```

## Stop Condition

Stop after the commit and ask permission before phase 03.5.

Final response format:

```text
Changed files:
- ...

Test result:
- ...

Bugs fixed:
- ...

Permission:
Can I continue to phase 03.5?
```

---

# Phase 03.5 — Add Overdue Loan Red State

## Objective

Highlight overdue loans in red.

## Tasks

1. Implement overdue detection:

```text
repay date < today
and unpaid/due amount > 0
```

2. Apply overdue styling to given loans.
3. Apply overdue styling to taken loans.
4. Use existing design system color classes.
5. Make overdue state easy to identify but not visually destructive.
6. Ensure paid/settled loans are not marked overdue if such state exists.
7. Update:

```text
docs/agents/03_LOAN_DEBT_ACCOUNT_INTEGRATION.md
```

8. Add/update this section:

```md
## Phase 03.5 — Overdue Loan Red State

## Overdue Rule

## UI Styling

## Paid/Settled Behavior

## Edge Cases
```

## Tests to Run

```bash
cd client && npm run build
```

If available:

```bash
cd client && npm run lint
cd client && npm run typecheck
```

If frontend tests exist, add or run relevant overdue-state tests.

If backend tests exist:

```bash
cd server && pytest
```

## Commit

```bash
git add .
git commit -m "agent 03 phase 03.5: highlight overdue loans"
```

## Stop Condition

Stop after the commit and ask permission before phase 03.6.

Final response format:

```text
Changed files:
- ...

Test result:
- ...

Bugs fixed:
- ...

Permission:
Can I continue to phase 03.6?
```

---

# Phase 03.6 — Update Loan Summary Cards

## Objective

Update the Loan & Debt page summary area to show only two summary cards.

## Tasks

1. Locate current three-box summary area.
2. Remove the extra third summary box.
3. Keep exactly two summary boxes:
   - Given Loan Due
   - Taken Loan Due
4. Given Loan Due must show sum of unpaid/due given loans.
5. Taken Loan Due must show sum of unpaid/due taken loans.
6. Do not include repaid/settled amounts if such status exists.
7. Display currency consistently. If multiple account currencies exist, follow the current project’s established display rule from Agent 02. If no multi-currency aggregation rule exists, document the limitation instead of inventing a conversion engine.
8. Ensure layout remains responsive with two cards.
9. Update:

```text
docs/agents/03_LOAN_DEBT_ACCOUNT_INTEGRATION.md
```

10. Add/update this section:

```md
## Phase 03.6 — Loan Summary Cards Updated

## Removed Card

## Given Loan Due Calculation

## Taken Loan Due Calculation

## Currency Display Rule

## Responsive Layout
```

## Tests to Run

```bash
cd client && npm run build
```

If available:

```bash
cd client && npm run lint
cd client && npm run typecheck
```

If backend tests exist:

```bash
cd server && pytest
```

## Commit

```bash
git add .
git commit -m "agent 03 phase 03.6: update loan summary cards"
```

## Stop Condition

Stop after the commit and ask permission before phase 03.7.

Final response format:

```text
Changed files:
- ...

Test result:
- ...

Bugs fixed:
- ...

Permission:
Can I continue to phase 03.7?
```

---

# Phase 03.7 — Apply Account Currency to Loan Lists

## Objective

Display each loan amount using the selected account’s currency.

## Tasks

1. Ensure loan records retain selected account reference.
2. Resolve the account currency for each loan row/card.
3. Display given loan amounts using the selected account currency.
4. Display taken loan amounts using the selected account currency.
5. Apply account currency to detail views/dialogs if loan detail UI exists.
6. Avoid global currency assumptions when a loan has its own account.
7. Add fallback display for legacy loans without account reference, using current app convention.
8. Update:

```text
docs/agents/03_LOAN_DEBT_ACCOUNT_INTEGRATION.md
```

9. Add/update this section:

```md
## Phase 03.7 — Account Currency Applied to Loan Lists

## Currency Source

## Legacy Loan Fallback

## List Display

## Detail Display
```

## Tests to Run

```bash
cd client && npm run build
```

If available:

```bash
cd client && npm run lint
cd client && npm run typecheck
```

If backend tests exist:

```bash
cd server && pytest
```

## Commit

```bash
git add .
git commit -m "agent 03 phase 03.7: show loans in account currency"
```

## Stop Condition

Stop after the commit and ask permission before phase 03.8.

Final response format:

```text
Changed files:
- ...

Test result:
- ...

Bugs fixed:
- ...

Permission:
Can I continue to phase 03.8?
```

---

# Phase 03.8 — Loan/Debt Regression Verification

## Objective

Run full verification for Agent 03 and document final behavior.

## Tasks

1. Run all available relevant tests/builds.
2. Verify:
   - given loan requires/selects account
   - taken loan requires/selects account
   - default account auto-selects
   - user can change account
   - given loan deducts from selected account
   - taken loan adds to selected account
   - repay date is supported
   - overdue loan appears red
   - only two loan summary cards exist
   - given loan due sum is correct
   - taken loan due sum is correct
   - loan amounts display in account currency
   - disabled accounts are not available for new loans if Agent 02 supports this
   - historical loans with disabled accounts still display
3. Create or update:

```text
docs/agents/03_LOAN_DEBT_TEST_REPORT.md
```

4. Include:

```md
# Agent 03 Test Report

## Branch

## Commands Run

## Passing Checks

## Failing Checks

## Bugs Fixed

## Manual Verification Checklist

## Deferred Work

## Safe Starting Point for Agent 04
```

5. Do not start Agent 04.

## Tests to Run

Run every available relevant command.

Expected frontend checks:

```bash
cd client && npm run build
```

If available:

```bash
cd client && npm run lint
cd client && npm run typecheck
```

Optional only if the project has the script:

```bash
cd client && npm test
```

Expected backend checks, depending on current backend implementation:

```bash
cd server && pytest
```

or:

```bash
cd server && npm run test:ci
```

Only run commands that actually exist.

## Commit

```bash
git add .
git commit -m "agent 03 phase 03.8: verify loan debt account integration"
```

## Stop Condition

Stop after the commit.

Final response must show only:

```text
Changed files:
- ...

Test result:
- ...

Bugs fixed:
- ...

Permission:
Agent 03 is complete. Can I continue with Agent 04 planning/generation?
```

---

# Agent 03 Final Success Criteria

Agent 03 is complete only when:

- Branch `feature/loan-debt-account-integration` exists.
- Given loan form supports selected account.
- Taken loan form supports selected account.
- Default account auto-selects in loan forms.
- User can change selected account from dropdown.
- Given loan deducts from selected account.
- Taken loan adds to selected account.
- Loan repay date exists and is displayed.
- Overdue unpaid loans show in red.
- Loan page shows exactly two summary boxes:
  - Given Loan Due
  - Taken Loan Due
- Removed third summary box.
- Loan amounts display using selected account currency.
- Tests/builds have been run.
- Agent 03 docs are updated.
- Agent 03 test report is created.
- No sidebar/navigation work is implemented.
- No account page/business-rule work is implemented except consuming Agent 02 account behavior.
- No recurring popup logic is implemented.
- Agent stops and asks permission before Agent 04.

---
