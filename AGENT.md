# PFM App Phase-Based Codex Agent

## Core Rule

You must work in phases.

Do **not** complete all tasks in one run.

In each run:

1. Read the project context first.
2. Complete only the current phase.
3. Run the required tests/checks.
4. If tests fail, fix the issue.
5. Run tests again.
6. Repeat until the required checks pass.
7. Update project state if required.
8. Stop.
9. Show only the test result and ask permission for the next phase.

Do **not** explain the implementation.

Do **not** give a long summary.

Do **not** continue to the next phase without permission.

---

## Files To Read Before Any Work

Before changing code, always inspect these files if they exist:

```text
AGENTS.md
PFM_PROJECT_STATE.md
README.md
docs/
frontend/package.json
backend/pyproject.toml
backend/requirements.txt
backend/alembic/
```

Also inspect any architecture, API, database, frontend, deployment, or testing documentation inside the repository.

Follow the workflow described in `AGENTS.md`, `PFM_PROJECT_STATE.md`, and the docs.

If those files define test commands, use those commands.

If test commands are not clearly documented, inspect the project scripts and run the most relevant checks for the changed area.

---

## Required Output Format After Each Phase

Your final response after each phase must be exactly this format:

```text
Test Result:
- Command:
- Status:
- Fixed Issues:

Permission needed:
Ready for Phase X?
```

Where `Phase X` is the next phase number.

Do not add any explanation outside this format.

---

## Full Backlog

The full backlog is listed here only for context.

Do not implement future phases early.

1. Settings currency should include Chinese RMB.
2. Sidebar board should have an `Account` section where users can add accounts like Cash, Card, Mobile Pay. If an account is used in any transaction or other linked place, it cannot be removed.
3. Mobile browser input focus should not zoom the UI.
4. Loan & Debt add-person flow should allow selecting contact name and phone number from phone contacts after user permission.
5. Add New Transaction Expense account list should show all user accounts plus budget and all saving accounts.
6. Add New Transaction Income tab should show only user-created accounts.
7. Add New Transaction Transfer tab should show only budget and all user-created accounts.

---

# Phase 1 — Add Chinese RMB Currency

## Task

In Settings, add Chinese RMB currency support.

## Requirements

- Add Chinese RMB / Chinese Yuan to Settings currency options.
- Currency code must be:

```text
CNY
```

- Currency symbol must be:

```text
¥
```

- Label can be:

```text
Chinese RMB
```

or

```text
Chinese Yuan
```

- The selected currency must save and load the same way existing currencies do.
- Update frontend constants, backend validation, schemas, types, settings persistence, or tests only if needed.
- Do not modify account logic.
- Do not modify transaction logic.
- Do not modify loan/debt logic.
- Do not modify contact picker logic.
- Do not modify unrelated UI.

## Testing

Run the required frontend/backend checks based on the project workflow.

If there is no clear test command, inspect scripts and run the safest relevant checks, such as:

```bash
npm run lint
npm run test
npm run build
pytest
```

Only run commands that are valid for this project.

## Final Response

```text
Test Result:
- Command:
- Status:
- Fixed Issues:

Permission needed:
Ready for Phase 2?
```

---

# Phase 2 — Add Account Section

## Task

Add an `Account` section in the sidebar board.

Users should be able to create accounts such as:

```text
Cash
Card
Mobile Pay
Bank
Wallet
Other
```

## Requirements

- Add a sidebar board section named:

```text
Account
```

- User can add accounts.
- Account should belong to the authenticated user.
- Account names should be user-created.
- Support common account types such as Cash, Card, Mobile Pay, Bank, Wallet, and Other.
- Account data should persist.
- Account list should load after login.
- Account creation should validate required fields.
- Do not allow duplicate account names for the same user if the existing app pattern supports uniqueness.
- If an account has been used in any transaction or any other linked place, it must not be removable.
- If an account is unused, user can remove it.
- The delete/remove action should show a clear UI error/message if the account cannot be removed because it is already used.
- Follow existing frontend/backend patterns.
- Add database migration if the backend uses database migrations.
- Add API endpoints only if needed.
- Add frontend service/hooks/components only if needed.
- Keep UI consistent with the existing app.

## Important Protection Rule

An account cannot be deleted if it is referenced by:

```text
transaction
income
expense
transfer
loan
debt
saving
budget
any related financial record
```

Use the actual project models/tables to determine the real references.

## Testing

Run all required checks that cover:

- Backend model/schema/API changes.
- Database migration validity.
- Frontend build/type checks.
- UI/component tests if available.

If tests fail, fix and rerun.

## Final Response

```text
Test Result:
- Command:
- Status:
- Fixed Issues:

Permission needed:
Ready for Phase 3?
```

---

# Phase 3 — Prevent Mobile Browser Input Zoom

## Task

Fix mobile browser zoom behavior when users tap input fields.

## Problem

On mobile browsers, when the user clicks/taps an input field, the page zooms in. The user then needs to manually scale down.

## Requirements

- Tapping input fields on mobile should not zoom the page.
- UI scale should stay stable.
- Apply the fix globally where appropriate.
- Do not break desktop layout.
- Do not make the app inaccessible.
- Prefer fixing input font size and viewport behavior using existing styling architecture.
- Avoid hacky JavaScript zoom resets unless no better option exists.
- Check inputs, selects, textareas, date fields, amount fields, search fields, and modal forms.
- Keep design visually consistent.

## Likely Fix Areas

Inspect:

```text
global CSS
layout component
root HTML metadata
mobile viewport config
input component styles
form components
Tailwind/base CSS if used
```

## Testing

Run frontend checks/build.

If there are mobile/UI tests, run them.

If no automated mobile test exists, ensure the final code change is safe and does not break build/type/lint checks.

## Final Response

```text
Test Result:
- Command:
- Status:
- Fixed Issues:

Permission needed:
Ready for Phase 4?
```

---

# Phase 4 — Select Contact in Loan & Debt Add Person

## Task

In Loan & Debt, when adding a person, allow the user to select name and phone number from phone contacts.

## Requirements

- In the add-person flow, add an option like:

```text
Select from contacts
```

- Ask user permission before accessing phone contacts.
- Use browser-supported contact picking when available.
- Auto-fill person name and phone number from the selected contact.
- Do not require contact permission until the user clicks/selects the contact option.
- Gracefully handle unsupported browsers.
- Gracefully handle denied permission.
- Gracefully handle contacts without phone numbers.
- Gracefully handle contacts without names.
- Do not break manual name/phone entry.
- Manual entry must still work.
- Add clear UI message if contact picking is unavailable.
- Do not send contact list to backend.
- Only selected contact values should fill the form.
- Keep privacy behavior safe.

## Technical Notes

Use the browser Contact Picker API only if supported.

Check for browser support before calling it.

Expected browser feature pattern:

```js
navigator.contacts;
navigator.contacts.select;
```

Use feature detection.

Do not assume it works on every mobile browser.

## Testing

Run frontend checks/build.

If unit tests exist for Loan & Debt forms, update or add tests.

If browser contact API is not available in test environment, mock feature detection safely.

If tests fail, fix and rerun.

## Final Response

```text
Test Result:
- Command:
- Status:
- Fixed Issues:

Permission needed:
Ready for Phase 5?
```

---

# Phase 5 — Expense Account Source List

## Task

In Add New Transaction, update the Expense tab account/source list.

## Requirement

In the Expense tab, the account/source dropdown should show:

```text
all user-created accounts
+
budget
+
all user-created saving accounts
```

## Details

- Use the actual existing data models in the project.
- If budget is represented as one object, include it correctly.
- If budgets are user-created records, include user budgets correctly.
- If saving accounts already exist, include all user-created saving accounts.
- If saving account model does not exist, inspect the existing savings feature and use the correct entity.
- Label options clearly so the user can distinguish account, budget, and saving account.
- Do not show accounts from other users.
- Do not show deleted/archived accounts unless the app already shows those in active lists.
- Preserve existing transaction creation behavior.
- Update backend validation if required.
- Update frontend types if required.
- Do not modify Income tab behavior in this phase.
- Do not modify Transfer tab behavior in this phase.

## Testing

Run checks covering:

- Transaction form.
- Account/source dropdown.
- Backend validation if changed.
- Frontend build/type checks.

If tests fail, fix and rerun.

## Final Response

```text
Test Result:
- Command:
- Status:
- Fixed Issues:

Permission needed:
Ready for Phase 6?
```

---

# Phase 6 — Income Account List

## Task

In Add New Transaction, update the Income tab account list.

## Requirement

In the Income tab, only show:

```text
all user-created accounts
```

## Details

- Do not show budget options in Income tab.
- Do not show saving accounts in Income tab unless saving accounts are also part of the normal user-created account model.
- Do not show system/internal accounts unless the existing app treats them as user accounts.
- Do not show accounts from other users.
- Preserve existing income transaction creation behavior.
- Update backend validation if required.
- Update frontend types if required.
- Do not modify Expense tab behavior in this phase.
- Do not modify Transfer tab behavior in this phase.

## Testing

Run checks covering:

- Income transaction form.
- Account dropdown.
- Frontend build/type checks.
- Backend validation if changed.

If tests fail, fix and rerun.

## Final Response

```text
Test Result:
- Command:
- Status:
- Fixed Issues:

Permission needed:
Ready for Phase 7?
```

---

# Phase 7 — Transfer Account List

## Task

In Add New Transaction, update the Transfer tab account list.

## Requirement

In the Transfer tab, only show:

```text
budget
+
all user-created accounts
```

## Details

- Do not show saving accounts unless the app treats them as normal user-created accounts.
- Include budget correctly based on the project’s existing budget model.
- Do not show accounts from other users.
- Do not show invalid transfer targets.
- Prevent selecting the same source and destination if the transfer flow has source/destination fields.
- Preserve existing transfer creation behavior.
- Update backend validation if required.
- Update frontend types if required.
- Do not modify Expense tab behavior in this phase.
- Do not modify Income tab behavior in this phase.

## Testing

Run checks covering:

- Transfer transaction form.
- Transfer dropdown logic.
- Same-source/destination validation if applicable.
- Frontend build/type checks.
- Backend validation if changed.

If tests fail, fix and rerun.

## Final Response

```text
Test Result:
- Command:
- Status:
- Fixed Issues:

Permission needed:
All phases completed. Do you want a final cleanup/refactor phase?
```

---

# General Implementation Rules

## Scope Control

For every phase:

- Implement only the current phase.
- Do not work ahead.
- Do not refactor unrelated code.
- Do not rename unrelated files.
- Do not change unrelated UI.
- Do not change deployment config unless required by the current phase.
- Do not modify environment files unless required.
- Do not remove existing features.
- Do not weaken validation.
- Do not bypass tests.
- Do not ignore failing tests.

## Testing Rules

After implementation:

1. Run the relevant test/check command.
2. If it fails, inspect the error.
3. Fix the cause.
4. Run the command again.
5. Continue until it passes.

Never stop on a failing test unless the failure is unrelated and pre-existing.

If a failure appears pre-existing, verify carefully and mention it only in the `Fixed Issues` field.

## Database Rules

If the phase requires database changes:

- Create proper migration.
- Do not manually edit production DB.
- Ensure migration is reversible if project pattern supports it.
- Ensure models, schemas, API, and frontend types stay consistent.
- Run backend validation/tests.

## Frontend Rules

- Keep UI consistent with the existing design system.
- Reuse existing components.
- Reuse existing hooks/services.
- Respect existing routing/sidebar patterns.
- Preserve responsive behavior.
- Do not introduce heavy packages unless absolutely required.

## Backend Rules

- Follow existing API patterns.
- Respect authentication/user ownership.
- Validate user access to records.
- Prevent cross-user data leakage.
- Return proper errors.
- Do not expose sensitive data.

## Git Rules

Only commit if `AGENTS.md`, `PFM_PROJECT_STATE.md`, or project docs require commits after each phase.

If committing is required:

- Make one local commit per phase.
- Use clear commit messages.

Example:

```bash
git add .
git commit -m "phase 1: add CNY currency support"
```

Do not push unless explicitly asked.

## State File Rules

If the project workflow requires updating `PFM_PROJECT_STATE.md`:

- Update only the relevant phase status.
- Record test command and result.
- Do not rewrite unrelated project history.
- Keep the update concise.

---

# Start Instruction

When this agent starts, ask which phase to run if the user did not specify a phase.

If the user says “start”, “run phase 1”, or similar, begin with:

```text
Phase 1 — Add Chinese RMB Currency
```

Then complete only Phase 1.
