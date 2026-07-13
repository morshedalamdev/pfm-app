# Agent 07 — Recurring Income Achievement Popup

## Agent Identity

You are **Agent 07 — Recurring Income Achievement Popup** for the `pfm-app` project.

Your job is to implement recurring **income** reminders as achievement-style popups. Recurring income must not be automatically added to an account. Instead, when an income item becomes due, the application must repeatedly show a green achievement popup until the user confirms that the income was received or deletes the recurring rule.

Do not modify recurring expense behavior in this agent. Recurring expense behavior belongs to Agent 06 and must remain unchanged.

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
git checkout -b feature/recurring-income-achievement-popup
```

If the branch already exists:

```bash
git checkout feature/recurring-income-achievement-popup
git pull
```

---

## Required Previous Agents

Agent 07 should run only after these agents are completed and merged into `main`:

```text
Agent 00 — Current App Audit
Agent 01 — Sidebar and Navigation Update
Agent 02 — Account Page and Account Rules
Agent 03 — Loan and Debt Account Integration
Agent 04 — Settings and Home Page Balance Rules
Agent 05 — Transaction Category and Account Rules
Agent 06 — Recurring Expense Warning Popup
```

Agent 07 depends on Agent 05 because confirming recurring income must create a normal income transaction using the selected account and account currency.

Agent 07 should reuse shared recurring helpers from Agent 06 where appropriate, but it must not break or merge expense-specific behavior incorrectly.

Before making changes, read these files if they exist:

```text
docs/audit/00_CURRENT_APP_AUDIT.md
docs/audit/01_FEATURE_IMPLEMENTATION_CHECKLIST.md
docs/audit/02_BASELINE_TEST_REPORT.md
docs/agents/02_ACCOUNT_PAGE_AND_RULES.md
docs/agents/02_ACCOUNT_TEST_REPORT.md
docs/agents/05_TRANSACTION_CATEGORY_ACCOUNT_RULES.md
docs/agents/05_TRANSACTION_TEST_REPORT.md
docs/agents/06_RECURRING_EXPENSE_WARNING_POPUP.md
docs/agents/06_RECURRING_EXPENSE_TEST_REPORT.md
```

If transaction account selection, selected-account persistence, transaction balance effects, or recurring scheduling helpers are missing, stop and report that Agent 07 is blocked. Do not create duplicate transaction or recurrence systems.

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

Do **not** explain implementation details.  
Do **not** provide long reasoning.  
Do **not** start the next phase without permission.  
Do **not** include architecture explanation in the final output.

---

## Required Phase Workflow

Every phase must follow:

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

## Agent 07 Goal

Implement the requested recurring income behavior.

Example requirement:

```text
Category: Salary
Note: Job Salary
Recurring: Monthly
First income date: selected by user
```

Expected behavior:

- The recurring income must not automatically add money to the selected account.
- On the same due date in each following month, a green achievement popup appears.
- Popup message should ask whether the user received the income, for example:
  - `Have you received your "Job Salary"?`
- The popup continues appearing on every app load from the due date until the end of that month.
- The popup stops for that month only after the user clicks `Received`.
- The recurring rule stops permanently if the user clicks `Delete`.
- The popup can be temporarily dismissed using a close icon.
- Closing does not mark it received and does not delete it.
- If closed, it must appear again the next time the app is loaded during the same due window.
- Popup must use achievement/success styling and green colors.
- Clicking `Received` creates a normal income transaction using the date the user clicked `Received`.
- The created income transaction must use the recurring rule's account, category, note, amount, and account currency.
- The selected account balance must increase only when the user clicks `Received`.

---

## Agent 07 Scope

Agent 07 may change:

- Recurring income data types/schemas/models.
- Shared recurring helpers only when safely reusable.
- Recurring income state/store/API behavior.
- App-load recurring income detection.
- Recurring-income achievement popup UI.
- Received, Delete, and Close behavior.
- Income transaction creation triggered by Received.
- Account balance update through existing transaction behavior.
- Persistence for monthly completion state.
- Tests for recurring income behavior.
- Agent documentation.

Agent 07 must not implement:

- Recurring expense behavior changes.
- Warning popup styling for expenses.
- General transaction category/account behavior already handled by Agent 05.
- Loan/debt behavior.
- Account creation/edit/disable/default logic.
- Home/settings balance-source behavior.
- Automatic addition of recurring income.
- Currency conversion engine.

---

## Domain Rules

### Recurring Income Rule

A recurring income rule should store enough information to reproduce the income later:

```text
id
type = income
category
note
amount
accountId
frequency
firstDueDate
active
lastReceivedPeriod or completion history
createdAt
```

Use project naming conventions.

### Monthly Due Rule

For monthly recurrence:

```text
due day = day from firstDueDate
due period = each calendar month while rule is active
```

If the original day does not exist in a shorter month, use the last valid day of that month.

Examples:

```text
January 31 → February 28 or 29
March 31 → April 30
```

Reuse tested date helpers from Agent 06 if they are generic and safe.

### Due Window Rule

Popup should be eligible to display:

```text
from computed due date
through the final day of that same month
```

Before due date:

```text
do not show popup
```

After the user marks it received for that month:

```text
do not show again during that month
```

If not received or deleted:

```text
show again on every app load during the due window
```

### Received Rule

When user clicks `Received`:

```text
create a normal income transaction
transaction date = date/time user clicked Received
use recurring rule category
use recurring rule note
use recurring rule amount
use recurring rule selected account
increase only that account balance
mark recurring rule completed for current month
do not show popup again for current month
keep recurring rule active for future months
```

### Delete Rule

When user clicks `Delete`:

```text
deactivate or delete recurring rule according to existing persistence style
do not create an income transaction
do not change account balance
do not show future reminders for this rule
```

Prefer soft deactivation if historical recurring metadata must be preserved.

### Close Rule

When user clicks close icon:

```text
close popup for current browser session/view only
do not mark received
do not deactivate rule
do not update account balance
show again on next app load during due window
```

### Styling Rule

Recurring income popup must use:

```text
achievement/success visual mode
green success color
positive/achievement icon
clear Received and Delete actions
close icon
```

Use existing design-system components and colors.

---

# Phase 07.1 — Recurring Income Baseline and Dependency Audit

## Objective

Audit existing recurring income behavior and confirm Agent 05/06 dependencies exist.

## Tasks

1. Read Agent 05 and Agent 06 docs if available.
2. Inspect:
   - recurring transaction fields
   - income category handling
   - recurring frequency options
   - recurring date fields
   - shared recurring state/store/API
   - transaction creation service/helper
   - account balance update behavior
   - app shell/root layout where reminders are detected
   - reminder queue from Agent 06
   - existing success/achievement UI components
3. Confirm whether recurring income currently:
   - auto-creates transactions
   - auto-adds balances
   - only stores a flag
   - has next due date
   - has completion history
4. Confirm Agent 05 provides:
   - selected account on transaction
   - account currency
   - transaction creation helper
   - income balance effect
5. Confirm Agent 06 provides reusable:
   - due-date helper
   - due-window helper
   - period key
   - reminder queue or provider
6. Identify which Agent 06 helpers can be reused without changing expense behavior.
7. If dependencies are missing, stop and mark Agent 07 as blocked.
8. Create or update:

```text
docs/agents/07_RECURRING_INCOME_ACHIEVEMENT_POPUP.md
```

9. Add:

```md
# Agent 07 — Recurring Income Achievement Popup

## Phase 07.1 — Baseline and Dependency Audit

## Files Inspected

## Current Recurring Income Behavior

## Existing Transaction Creation Flow

## Existing Account Balance Flow

## Shared Helpers from Agent 06

## Existing Reminder Queue

## Existing Success UI Components

## Planned Files to Change

## Blockers
```

## Tests to Run

Run available commands only:

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

Do not invent missing scripts.

## Commit

```bash
git add .
git commit -m "agent 07 phase 07.1: audit recurring income behavior"
```

## Stop Condition

Stop after the commit and ask permission before phase 07.2.

---

# Phase 07.2 — Recurring Income Data Model and Due-Date Integration

## Objective

Add recurring-income state and reuse due-date helpers without showing the popup yet.

## Tasks

1. Extend recurring income type/schema/model with required fields.
2. Ensure recurring income stores:
   - category
   - note
   - amount
   - account ID
   - frequency
   - first due date
   - active status
   - monthly completion history or equivalent
3. Reuse generic recurring date helpers from Agent 06 where safe.
4. If Agent 06 helpers are expense-specific, refactor only the minimum needed into shared generic helpers.
5. Do not change expense outputs or behavior.
6. Add pure/testable helpers for:
   - checking whether recurring income is due
   - checking whether current period is already received
   - identifying income reminder type
7. Do not create transactions.
8. Do not render popup.
9. Update `docs/agents/07_RECURRING_INCOME_ACHIEVEMENT_POPUP.md` with:

```md
## Phase 07.2 — Data Model and Due-Date Integration

## Recurring Income Fields

## Reused Shared Helpers

## Refactored Helpers

## Monthly Due Calculation

## Completion Period Key

## Expense Regression Safety

## Test Cases
```

## Tests to Run

Required date test cases where supported:

```text
normal monthly date
January 31 to February
March 31 to April
before due date
on due date
after due date within same month
already received current month
inactive rule
expense helper behavior unchanged
```

## Commit

```bash
git add .
git commit -m "agent 07 phase 07.2: add recurring income due logic"
```

## Stop Condition

Stop after the commit and ask permission before phase 07.3.

---

# Phase 07.3 — App-Load Detection and Shared Reminder Queue

## Objective

Detect due recurring income whenever the web app loads.

## Tasks

1. Integrate recurring income detection into the existing reminder provider/queue.
2. Load only active recurring income rules.
3. Filter to rules:
   - due now
   - inside current due window
   - not already received for current month
4. Exclude:
   - recurring expense rules from income detection
   - deleted/inactive rules
   - future rules
   - already completed rules for current month
5. Ensure both income and expense reminders can coexist.
6. Define deterministic queue ordering.
7. Prevent duplicate popup entries for the same rule/period.
8. Do not auto-create transactions.
9. Do not auto-change account balances.
10. Update `docs/agents/07_RECURRING_INCOME_ACHIEVEMENT_POPUP.md` with:

```md
## Phase 07.3 — App-Load Detection and Shared Reminder Queue

## Detection Entry Point

## Income Eligibility Filters

## Expense/Income Coexistence

## Queue Ordering

## Duplicate Prevention

## Excluded Rules
```

## Tests to Run

Verify:

```text
income reminder detected
expense reminder still detected
income and expense reminders can coexist
duplicate income reminders are prevented
future income reminder is excluded
received income reminder is excluded
```

## Commit

```bash
git add .
git commit -m "agent 07 phase 07.3: detect due recurring income"
```

## Stop Condition

Stop after the commit and ask permission before phase 07.4.

---

# Phase 07.4 — Achievement Popup UI

## Objective

Build the recurring income achievement popup UI without implementing final actions yet.

## Tasks

1. Build popup using existing dialog/alert-dialog components.
2. Use green achievement/success visual style.
3. Show a positive confirmation message, such as:

```text
Have you received your "Job Salary"?
```

4. Show:
   - success/achievement icon
   - category
   - note
   - amount
   - selected account name
   - selected account currency
   - due date
5. Add visible controls:
   - `Received`
   - `Delete`
   - close icon
6. Reuse reminder queue so multiple income/expense reminders show one at a time.
7. Ensure mobile responsiveness.
8. Ensure keyboard and accessibility behavior follow existing dialog patterns.
9. Do not implement final Received/Delete behavior yet.
10. Do not modify expense popup styling.
11. Update `docs/agents/07_RECURRING_INCOME_ACHIEVEMENT_POPUP.md` with:

```md
## Phase 07.4 — Achievement Popup UI

## Confirmation Message

## Displayed Fields

## Green Achievement Styling

## Actions

## Queue Behavior

## Mobile Behavior

## Accessibility

## Expense Popup Safety
```

## Tests to Run

Run build/lint/typecheck and UI tests if available.

## Commit

```bash
git add .
git commit -m "agent 07 phase 07.4: add recurring income achievement popup"
```

## Stop Condition

Stop after the commit and ask permission before phase 07.5.

---

# Phase 07.5 — Received Action

## Objective

Create a normal income transaction when user clicks `Received`.

## Tasks

1. Connect `Received` to existing transaction creation behavior from Agent 05.
2. Created transaction must use:
   - type: income
   - recurring rule category
   - recurring rule note
   - recurring rule amount
   - recurring rule account ID
   - transaction date = actual date/time user clicked Received
3. Apply income balance effect only once to selected account.
4. Mark current recurring period as received/completed.
5. Keep recurring rule active for future periods.
6. Remove current reminder from queue.
7. If another reminder exists, show next one.
8. Prevent double-submit and duplicate transaction creation.
9. Ensure Home income total includes the created income transaction exactly once.
10. Update `docs/agents/07_RECURRING_INCOME_ACHIEVEMENT_POPUP.md` with:

```md
## Phase 07.5 — Received Action

## Created Transaction Fields

## Transaction Date Rule

## Account Balance Effect

## Home Income Total Effect

## Current-Period Completion

## Duplicate Protection

## Queue Advancement
```

## Tests to Run

Required tests where supported:

```text
Received creates exactly one income transaction
Received uses click date
Received uses recurring rule account
Received increases selected account once
Received updates Home income total once
Received hides popup for current month
Received keeps rule active for future month
double click does not duplicate transaction
expense behavior remains unchanged
```

## Commit

```bash
git add .
git commit -m "agent 07 phase 07.5: implement recurring income received action"
```

## Stop Condition

Stop after the commit and ask permission before phase 07.6.

---

# Phase 07.6 — Delete and Close Actions

## Objective

Implement permanent delete/deactivation and temporary dismissal behavior.

## Tasks

### Delete

1. Delete or deactivate recurring income rule using existing persistence style.
2. Prefer deactivation if historical metadata should remain.
3. Do not create an income transaction.
4. Do not change account balance.
5. Remove reminder from queue.
6. Prevent future reminders for this rule.

### Close

1. Close popup without changing recurring rule.
2. Do not mark current month received.
3. Do not create a transaction.
4. Do not change account balance.
5. Dismiss only current view/session.
6. Ensure reminder appears again on next app load during due window.

7. Do not modify recurring expense Delete/Close behavior.
8. Update `docs/agents/07_RECURRING_INCOME_ACHIEVEMENT_POPUP.md` with:

```md
## Phase 07.6 — Delete and Close Actions

## Delete Behavior

## Deactivation Strategy

## Close Behavior

## Next App-Load Behavior

## Balance Safety

## Transaction Safety

## Expense Regression Safety
```

## Tests to Run

Required tests where supported:

```text
Delete disables future income reminders
Delete does not create income transaction
Delete does not change balance
Close hides current income popup
Close does not mark received
Close does not deactivate rule
Close income reminder appears on next app load
expense Delete/Close behavior remains unchanged
```

## Commit

```bash
git add .
git commit -m "agent 07 phase 07.6: implement recurring income delete close actions"
```

## Stop Condition

Stop after the commit and ask permission before phase 07.7.

---

# Phase 07.7 — Persistence, Monthly Repeat, and Mixed Reminder Verification

## Objective

Verify recurring income state persists correctly and coexists with recurring expenses.

## Tasks

1. Confirm current-month received state persists.
2. Confirm received reminder does not reappear after reload in same month.
3. Confirm recurring income rule becomes eligible again next month.
4. Confirm deleted/deactivated rule never reappears.
5. Confirm closed-only reminder reappears after reload in same due window.
6. Confirm future recurring income does not appear early.
7. Confirm prior-month unpaid reminder is not shown outside its due month unless product already defines carryover.
8. Confirm mixed income and expense reminders process deterministically.
9. Confirm one reminder's completion does not affect another.
10. Confirm expense warning styling and behavior remain unchanged.
11. Update `docs/agents/07_RECURRING_INCOME_ACHIEVEMENT_POPUP.md` with:

```md
## Phase 07.7 — Persistence and Mixed Reminder Verification

## Received Persistence

## Next-Month Reactivation

## Deleted Rule Persistence

## Close and Reload Behavior

## Prior-Month Expiry

## Mixed Queue Ordering

## Reminder Isolation

## Expense Regression Safety
```

## Tests to Run

Use controlled dates/fake timers if supported.

## Commit

```bash
git add .
git commit -m "agent 07 phase 07.7: verify recurring income persistence"
```

## Stop Condition

Stop after the commit and ask permission before phase 07.8.

---

# Phase 07.8 — Recurring Income Regression Verification

## Objective

Run full verification for Agent 07 and document final behavior.

## Tasks

1. Run all available relevant tests/builds.
2. Verify:
   - recurring income does not auto-add balance
   - recurring income does not auto-create transaction
   - reminder appears on due date
   - reminder appears after due date through end of month
   - reminder does not appear before due date
   - achievement/success style is green
   - popup asks whether income was received
   - popup shows category, note, amount, account, currency, and due date
   - Received creates one normal income transaction
   - Received uses actual click date
   - Received increases selected account once
   - Received updates Home income total once
   - Received hides reminder for current month
   - Received keeps recurring rule active for future months
   - Delete disables future income reminders
   - Delete does not create transaction or change balance
   - Close dismisses only current view
   - Close reminder appears again on next app load
   - current-month completion stays hidden after reload
   - next-month reminder appears again
   - multiple and mixed reminders work correctly
   - recurring expense warning behavior remains unchanged
3. Create or update:

```text
docs/agents/07_RECURRING_INCOME_TEST_REPORT.md
```

4. Include:

```md
# Agent 07 Test Report

## Branch

## Commands Run

## Passing Checks

## Failing Checks

## Bugs Fixed

## Date-Based Test Cases

## Mixed Reminder Test Cases

## Manual Verification Checklist

## Deferred Work

## Safe Starting Point for Agent 08
```

5. Do not start Agent 08.

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
git commit -m "agent 07 phase 07.8: verify recurring income achievement popup"
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
Agent 07 is complete. Can I continue with Agent 08 planning/generation?
```

---

# Agent 07 Final Success Criteria

Agent 07 is complete only when:

- Branch `feature/recurring-income-achievement-popup` exists.
- Recurring income does not auto-create a transaction.
- Recurring income does not auto-add account balance.
- Monthly due date calculation works.
- Shorter-month fallback works.
- Popup appears from due date through end of month.
- Popup appears on every app load until Received or Delete.
- Popup uses green achievement/success styling.
- Popup asks whether the named income was received.
- Received creates one normal income transaction using click date.
- Received uses recurring rule account/category/note/amount.
- Received increases selected account once.
- Received updates Home income total once.
- Received marks current month completed.
- Received keeps recurring rule active for future months.
- Delete disables future income reminders without creating transaction.
- Close dismisses temporarily and reminder returns on next app load.
- Current-month completion persists across reload.
- Next-month recurrence works.
- Mixed income/expense reminders work deterministically.
- Recurring expense behavior remains unchanged.
- Tests/builds have been run.
- Agent 07 docs are updated.
- Agent 07 test report is created.
- Agent stops and asks permission before Agent 08.

---
