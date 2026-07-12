# Agent 04 — Settings and Home Page Balance Rules

## Agent Identity

You are **Agent 04 — Settings and Home Page Balance Rules** for the `pfm-app` project.

Your job is to update the Settings and Home/Dashboard behavior so the user can control which balance source appears on the home page, and so home income/expense totals include only real transactions, not loans.

Do not implement sidebar changes, account-page rules, loan/debt business logic, transaction-category updates, recurring popups, or backend architecture migration in this agent.

---

## Repository

```text
Repository: https://github.com/morshedalamdev/pfm-app
Live frontend: https://pfm.morshedalam.dev
```

---

## Required Git Branch

```bash
git checkout main
git pull
git checkout -b feature/home-settings-balance-display
```

If the branch already exists:

```bash
git checkout feature/home-settings-balance-display
git pull
```

---

## Required Previous Agents

Agent 04 should run after these agents are completed and merged into `main`:

```text
Agent 00 — Current App Audit
Agent 01 — Sidebar and Navigation Update
Agent 02 — Account Page and Account Rules
Agent 03 — Loan and Debt Account Integration
```

Read these files if they exist:

```text
docs/audit/00_CURRENT_APP_AUDIT.md
docs/audit/01_FEATURE_IMPLEMENTATION_CHECKLIST.md
docs/audit/02_BASELINE_TEST_REPORT.md
docs/agents/02_ACCOUNT_PAGE_AND_RULES.md
docs/agents/02_ACCOUNT_TEST_REPORT.md
docs/agents/03_LOAN_DEBT_ACCOUNT_INTEGRATION.md
docs/agents/03_LOAN_DEBT_TEST_REPORT.md
```

If account/default-account behavior from Agent 02 is missing, stop and report that Agent 04 is blocked. Do not create a second account system.

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

Do **not** explain the implementation. Do **not** provide long reasoning. Do **not** start the next phase without permission.

---

## Required Phase Workflow

```text
Think internally
Execute only the current phase
Run tests
Fix failed tests
Run tests again
Update docs
Commit
Stop
Ask permission for next phase
```

---

## Agent 04 Goal

Implement:

- User can set from Settings which account available balance should show on the Home page.
- The same Settings list should also include budget if user already set a budget plan.
- Home page income total should include only income transactions.
- Home page expense total should include only expense transactions.
- Home income/expense totals must not include loan/debt.

---

## Agent 04 Scope

Agent 04 may change:

- Settings page/components.
- Home/dashboard page/components.
- Dashboard summary selectors/helpers.
- Account balance display source selection.
- Budget source selection if budget data already exists.
- Home income/expense calculation logic.
- State/store/API helpers required for home/settings behavior.
- Tests related to home/settings calculations.
- Agent documentation.

Agent 04 must not implement:

- Account creation/edit/disable/delete/default logic.
- Loan creation/account-balance effects.
- Transaction category additions.
- Transaction account selection.
- Recurring expense/income popup behavior.
- New budget-planning business logic beyond reading existing budget plan data.
- Currency conversion engine.

---

## Domain Rules

### Home Balance Source Rule

From Settings, user can choose the source shown as the main available balance on the Home page.

Allowed sources:

```text
active accounts
budget plans, only if budget plan data already exists
```

### Account Balance Display Rule

If selected source is an account:

```text
Home page shows that account's current/available balance
Home page uses that account's currency
```

### Budget Balance Display Rule

If selected source is a budget plan:

```text
Home page shows budget remaining/available value based on existing budget data
Home page uses budget currency if available, otherwise existing app convention
Do not invent currency conversion
```

### Income/Expense Total Rule

```text
Income total = income transactions only
Expense total = expense transactions only
Exclude taken loans from income
Exclude given loans from expense
```

If loans and transactions share the same data list, add or use a discriminator/helper to filter loans out of home income/expense totals.

---

# Phase 04.1 — Settings and Home Baseline Audit

## Objective

Audit current Settings and Home/Dashboard behavior before changing logic.

## Tasks

1. Read Agent 00, Agent 02, and Agent 03 docs if available.
2. Inspect current Settings page/components.
3. Inspect current Home/Dashboard page/components.
4. Locate current home summary cards/calculations:
   - available balance
   - income total
   - expense total
   - savings/budget values if any
5. Locate current data sources:
   - account store/state/API
   - budget store/state/API
   - transaction store/state/API
   - loan/debt store/state/API
6. Confirm whether home currently includes loan/debt in income/expense totals.
7. Confirm whether settings currently has dashboard/home display preferences.
8. Create or update:

```text
docs/agents/04_HOME_SETTINGS_BALANCE_DISPLAY.md
```

9. Add this section:

```md
# Agent 04 — Settings and Home Page Balance Rules

## Phase 04.1 — Settings and Home Baseline Audit

## Files Inspected

## Current Settings Behavior

## Current Home Dashboard Behavior

## Current Balance Source

## Current Income/Expense Calculation

## Current Budget Data Availability

## Current Loan Inclusion Behavior

## Planned Files to Change

## Risks
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

or:

```bash
cd server && npm run test:ci
```

Do not invent missing scripts.

## Commit

```bash
git add .
git commit -m "agent 04 phase 04.1: audit settings and home dashboard"
```

## Stop Condition

Stop after the commit and ask permission before phase 04.2.

---

# Phase 04.2 — Add Home Balance Source Setting

## Objective

Add a Settings option that allows the user to choose what balance source appears on the Home page.

## Tasks

1. Add or update Settings UI for `Home Balance Source`.
2. Available source types should include:
   - account
   - budget, only if budget plan data exists
3. Use existing UI controls and styling.
4. Persist the selected source using the current project state persistence pattern.
5. Store enough information to identify:
   - source type
   - source id
6. Add safe fallback if selected source no longer exists.
7. Do not implement budget creation.
8. Update `docs/agents/04_HOME_SETTINGS_BALANCE_DISPLAY.md` with:

```md
## Phase 04.2 — Home Balance Source Setting

## Setting Name

## Source Types

## Persistence Behavior

## Missing Source Fallback

## UI Behavior
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
git commit -m "agent 04 phase 04.2: add home balance source setting"
```

## Stop Condition

Stop after the commit and ask permission before phase 04.3.

---

# Phase 04.3 — Include Accounts and Budget Plans in Settings Source List

## Objective

Populate the Home Balance Source setting with active accounts and existing budget plans.

## Tasks

1. Load active accounts from Agent 02 account state/API.
2. Exclude disabled accounts from new selection.
3. If a disabled account was previously selected, apply fallback behavior.
4. Load budget plans only if budget data already exists.
5. Do not create new budget setup logic.
6. Display source labels clearly:
   - account name and currency
   - budget name/period if available
7. If no sources exist, show a clear empty state.
8. Update `docs/agents/04_HOME_SETTINGS_BALANCE_DISPLAY.md` with:

```md
## Phase 04.3 — Account and Budget Source Options

## Account Source Rule

## Disabled Account Handling

## Budget Source Rule

## Empty State

## Labels
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
git commit -m "agent 04 phase 04.3: populate home balance source options"
```

## Stop Condition

Stop after the commit and ask permission before phase 04.4.

---

# Phase 04.4 — Connect Home Available Balance to Selected Source

## Objective

Update the Home page available balance card to show the selected account or budget source.

## Tasks

1. Read selected home balance source from settings state.
2. If selected source is account:
   - show selected account available/current balance
   - format with selected account currency
3. If selected source is budget:
   - show selected budget remaining/available value from existing budget data
   - format with budget currency or existing app convention
4. Add fallback behavior:
   - if selected source missing, choose default account if available
   - if no default account, choose first active account if available
   - if no account/budget, show safe empty state
5. Update Home page label/subtitle if needed so user understands which balance is shown.
6. Do not modify income/expense totals in this phase.
7. Update `docs/agents/04_HOME_SETTINGS_BALANCE_DISPLAY.md` with:

```md
## Phase 04.4 — Home Balance Connected to Selected Source

## Account Display Rule

## Budget Display Rule

## Currency Display Rule

## Fallback Rule

## Empty State
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
git commit -m "agent 04 phase 04.4: connect home balance source"
```

## Stop Condition

Stop after the commit and ask permission before phase 04.5.

---

# Phase 04.5 — Fix Home Income and Expense Totals to Exclude Loans

## Objective

Ensure Home page income/expense totals only include transaction income/expense, not loan/debt amounts.

## Tasks

1. Locate current income total calculation.
2. Locate current expense total calculation.
3. Add or update helpers/selectors so:
   - income total includes income transactions only
   - expense total includes expense transactions only
   - taken loans are excluded from income total
   - given loans are excluded from expense total
4. If loans and transactions share a data structure:
   - add/use a type discriminator
   - filter loan/debt records out of income/expense calculations
5. Do not change loan/debt page calculations.
6. Do not change transaction creation behavior.
7. Update `docs/agents/04_HOME_SETTINGS_BALANCE_DISPLAY.md` with:

```md
## Phase 04.5 — Home Income/Expense Totals Exclude Loans

## Income Calculation Rule

## Expense Calculation Rule

## Loan Exclusion Rule

## Shared Data Structure Handling

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

If project has relevant unit tests, add/run them.

If backend tests exist:

```bash
cd server && pytest
```

## Commit

```bash
git add .
git commit -m "agent 04 phase 04.5: exclude loans from home totals"
```

## Stop Condition

Stop after the commit and ask permission before phase 04.6.

---

# Phase 04.6 — Home and Settings Regression Verification

## Objective

Run full verification for Agent 04 and document final behavior.

## Tasks

1. Run all available relevant tests/builds.
2. Verify:
   - Settings page has Home Balance Source option.
   - Active accounts appear in the source list.
   - Disabled accounts do not appear for new selection.
   - Existing budget plans appear if budget data exists.
   - Empty state is safe if no accounts/budgets exist.
   - Home page shows selected account balance.
   - Home page uses selected account currency.
   - Home page can show selected budget value if budget plan exists.
   - Missing selected source falls back safely.
   - Home income total excludes loans.
   - Home expense total excludes loans.
   - Loan/debt page calculations are not broken.
3. Create or update:

```text
docs/agents/04_HOME_SETTINGS_TEST_REPORT.md
```

4. Include:

```md
# Agent 04 Test Report

## Branch

## Commands Run

## Passing Checks

## Failing Checks

## Bugs Fixed

## Manual Verification Checklist

## Deferred Work

## Safe Starting Point for Agent 05
```

5. Do not start Agent 05.

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
git commit -m "agent 04 phase 04.6: verify home settings balance rules"
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
Agent 04 is complete. Can I continue with Agent 05 planning/generation?
```

---

# Agent 04 Final Success Criteria

Agent 04 is complete only when:

- Branch `feature/home-settings-balance-display` exists.
- Settings page has a Home Balance Source option.
- Active accounts can be selected as home balance source.
- Disabled accounts are excluded from new source selection.
- Existing budget plans appear as source options if budget data exists.
- Home page displays selected account available/current balance.
- Home page displays selected source using the correct currency convention.
- Home page has safe fallback if selected source is missing.
- Home income total includes only income transactions.
- Home expense total includes only expense transactions.
- Home income total excludes taken loans.
- Home expense total excludes given loans.
- Tests/builds have been run.
- Agent 04 docs are updated.
- Agent 04 test report is created.
- No account page/business-rule work is implemented.
- No loan/debt business logic is implemented.
- No transaction category/account behavior is implemented.
- No recurring popup logic is implemented.
- Agent stops and asks permission before Agent 05.

---
