# Milestone 11 — Product Repairs

- Branch: `product-repairs`
- Milestone objective: Implement the approved budget setup, savings, savings-transfer, loan/debt, and settings behavior changes without redesigning the existing frontend or expanding unrelated scope.

## Mandatory execution rule

Read `AGENTS.md` and `PFM_PROJECT_STATE.md` first. Execute **only one explicitly requested phase** from this file. Do not continue to the following phase automatically, even when tests pass. Update `PFM_PROJECT_STATE.md`, create the local phase commit, report exact results, and stop for user permission.

## Branch protocol

Create this branch only when beginning the milestone. Later phases must continue on the same milestone branch. Do not push until the verification phase passes and the user explicitly requests a push.

## Phase 11.1 — Budget setup UX repair

### Objective

Repair the budget setup page so existing monthly budget details are visible by default while editing happens only in the custom tab.

### Tasks

1. Keep the existing budget setup route and visual style.
2. Change the top amount label from `Monthly Income` to `Monthly Budget`.
3. Preload the monthly budget amount from the existing current-month global budget when present.
4. Rename the default tab to a meaningful read-only details label.
5. Make the default tab read-only and show existing current-month budget details only.
6. Keep the custom tab as the only editable budget setup form.
7. Preserve existing category-budget create, update, and delete behavior from phase 10.E.
8. Do not change backend budget endpoints or database schema in this phase.

### Required tests

```bash
cd client
npx tsc --noEmit
npm run build
npm run lint --if-present
npm run test --if-present
npm run api:check
git diff --check
```

### Local commit

```text
milestone(11) phase 11.1: repair budget setup tabs and monthly budget display
```

### Stop condition

Budget setup default tab is read-only, the custom tab remains editable, existing monthly budget amounts display correctly, required checks are recorded, and the next allowed phase is 11.2.

Stop and ask permission before the next phase.

---

## Phase 11.2 — Savings goal month targeting

### Objective

Replace target-date entry with target-month selection and make monthly saving a calculated read-only value.

### Tasks

1. Keep the existing savings goal route and visual style.
2. Make Monthly Saving read-only.
3. Replace Targeted Date with Targeted Months selection such as 3 months and 5 months.
4. Automatically calculate monthly saving from target amount and selected months.
5. Persist compatible savings-goal values through the existing API unless implementation proves a backend contract change is necessary.
6. Do not add transaction-to-savings transfer behavior in this phase.

### Required tests

```bash
cd client
npx tsc --noEmit
npm run build
npm run lint --if-present
npm run test --if-present
npm run api:check
git diff --check
```

### Local commit

```text
milestone(11) phase 11.2: calculate savings target from selected months
```

### Stop condition

Savings goal creation and editing use selected target months with a read-only calculated monthly saving value.

Stop and ask permission before the next phase.

---

## Phase 11.3 — Savings transfer mutation

### Objective

Allow users to transfer money from an account into an existing savings goal from the transaction form while preserving account balance and savings contribution source records.

### Tasks

1. Design the minimal backend mutation for account-to-savings transfer.
2. Use a database transaction for the account debit source record and savings contribution.
3. Use idempotency protection for the retryable mutation.
4. Add authenticated backend tests for ownership, validation, atomicity, and idempotent replay.
5. Generate the OpenAPI TypeScript contract.
6. Add the transaction form `To` option for active savings goals.
7. Do not implement loan/debt behavior in this phase.

### Required tests

```bash
cd server
ruff check .
ruff format --check .
mypy app
pytest -q
cd ../client
npm run api:generate
npx tsc --noEmit
npm run build
npm run lint --if-present
npm run test --if-present
npm run api:check
git diff --check
```

### Local commit

```text
milestone(11) phase 11.3: add account to savings transfer flow
```

### Stop condition

Savings transfers are atomic, idempotent, reflected in account balance, and available from the transaction form.

Stop and ask permission before the next phase.

---

## Phase 11.4 — Loan and debt backend

### Objective

Implement loan/debt persistence and API behavior for people, given/taken records, summaries, and partial settlement.

### Tasks

1. Add person persistence with user ownership and unique phone number per user while allowing duplicate names.
2. Add loan/debt records for money given and money taken.
3. Add partial settlement source records.
4. Add summary totals for total loan given, total loan taken, and due loan.
5. Implement authenticated CRUD/list/detail/settlement endpoints.
6. Add migrations, OpenAPI contracts, and backend tests.
7. Do not integrate the frontend loan pages in this phase.

### Required tests

```bash
cd server
ruff check .
ruff format --check .
mypy app
pytest -q
alembic upgrade head
alembic downgrade -1
alembic upgrade head
cd ../client
npm run api:generate
npm run api:check
git diff --check
```

### Local commit

```text
milestone(11) phase 11.4: implement loan debt backend
```

### Stop condition

Loan/debt backend APIs, migration behavior, and generated contracts are verified.

Stop and ask permission before the next phase.

---

## Phase 11.5 — Loan and debt frontend

### Objective

Make the loan/debt pages functional using the implemented API while restoring the useful old list/detail UI patterns from commit `d6799f8b0f25de367dfc30dc8528187dfb43db11`.

### Tasks

1. Restore functional list, filter, summary, item, detail/create/edit, and settlement UI patterns without reintroducing runtime fixtures.
2. Allow add/edit person from the loan/debt page.
3. Allow person selection for both given and taken records.
4. Show total loan given, total loan taken, and due loan summaries.
5. Add a settlement flow that supports partial settlement over time.
6. Add loading, empty, error, retry, and mutation states.
7. Do not change loan/debt backend contracts in this phase unless a frontend-blocking defect is proven.

### Required tests

```bash
cd client
npx tsc --noEmit
npm run build
npm run lint --if-present
npm run test --if-present
npm run api:check
npm run e2e
git diff --check
```

### Local commit

```text
milestone(11) phase 11.5: connect loan debt frontend
```

### Stop condition

Loan/debt pages are functional with server data and settlement behavior.

Stop and ask permission before the next phase.

---

## Phase 11.6 — Settings monthly currency guard

### Objective

Keep the selected currency visible and enforce that a user can change currency only once per month.

### Tasks

1. Confirm the settings UI displays the current selected currency.
2. Add backend persistence needed to enforce one currency change per calendar month.
3. Return a clear conflict error when the user has already changed currency in the current month.
4. Update frontend messaging for blocked currency changes.
5. Generate updated OpenAPI TypeScript contracts when the backend contract changes.
6. Do not add currency conversion in this phase.

### Required tests

```bash
cd server
ruff check .
ruff format --check .
mypy app
pytest -q
alembic upgrade head
alembic downgrade -1
alembic upgrade head
cd ../client
npm run api:generate
npx tsc --noEmit
npm run build
npm run lint --if-present
npm run test --if-present
npm run api:check
npm run e2e
git diff --check
```

### Local commit

```text
milestone(11) phase 11.6: enforce monthly currency change limit
```

### Stop condition

Settings currency changes are limited to once per month and the current currency remains visible.

Stop and ask permission before the next phase.

---

## Phase 11.V — Product repair verification

### Objective

Run a complete milestone verification for the product repair work.

### Tasks

1. Run backend quality, migration, frontend, API contract, E2E, and Compose validation checks.
2. Confirm `PFM_PROJECT_STATE.md` accurately records milestone 11 status, migrations, endpoints, tests, blockers, and deferred decisions.
3. Verify no runtime fixtures or hardcoded finance values were reintroduced in the touched surfaces.
4. Report whether the product repair milestone is ready to push.

### Required tests

```bash
cd server
ruff check .
ruff format --check .
mypy app
pytest -q
alembic upgrade head
cd ../client
npx tsc --noEmit
npm run build
npm run lint --if-present
npm run test --if-present
npm run api:check
npm run e2e
cd ..
docker compose config
git diff --check
```

### Local commit

```text
milestone(11) verify: validate product repairs milestone
```

### Stop condition

Milestone 11 is verified. Stop and request permission before pushing the branch.
