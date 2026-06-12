# Milestone 03 — Finance Core

- Branch: `finance-core`
- Milestone objective: Implement transactional accounts, categories, income, expenses, transfers, filters, pagination, and idempotent mutations with precise money handling.

## Mandatory execution rule

Read `AGENTS.md` and `PFM_PROJECT_STATE.md` first. Execute **only one explicitly requested phase** from this file. Do not continue to the following phase automatically, even when tests pass. Update `PFM_PROJECT_STATE.md`, create the local phase commit, report exact results, and stop for user permission.

## Branch protocol

Create this branch only when beginning the milestone. Later phases must continue on the same milestone branch. Do not push until the verification phase passes and the user explicitly requests a push.

## Phase 03.1 — Finance domain schema

**Recommended Codex setup:** GPT-5.5 / Extra High reasoning / Standard speed

### Objective

Define the financial source-of-truth schema and constraints.

### Tasks

1. Create account, category, transaction, transfer-linkage, and idempotency-record models using UUID identifiers.
2. Use PostgreSQL `NUMERIC` and Python `Decimal` for money, UTC timestamps, explicit transaction types, and user ownership constraints.
3. Design transfers so debit and credit records are linked and auditable.
4. Add indexes for user/date/account/category access patterns.
5. Create and verify Alembic migration.
6. Update data model documentation and project state.

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
```

### Local commit

```text
milestone(03) phase 03.1: add finance domain schema
```

### Stop condition

Finance schema migration and constraints are verified.

Stop and ask permission before the next phase.

---

## Phase 03.2 — Accounts and categories

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Implement owned account and category management.

### Tasks

1. Implement account create, list, retrieve, update, and safe archive behavior.
2. Implement category create, list, update, and safe archive behavior with income/expense classification as required by UI matrix.
3. Enforce user ownership on every query and mutation.
4. Add pagination where list size can grow.
5. Add tests for CRUD behavior, validation, cross-user access rejection, archive behavior, and OpenAPI schemas.

### Required tests

```bash
cd server
ruff check .
ruff format --check .
mypy app
pytest -q tests
```

### Local commit

```text
milestone(03) phase 03.2: implement accounts and categories
```

### Stop condition

Accounts and categories pass ownership and validation tests.

Stop and ask permission before the next phase.

---

## Phase 03.3 — Income and expenses

**Recommended Codex setup:** GPT-5.5 / Extra High reasoning / Standard speed

### Objective

Implement source transaction flows for income and expense records.

### Tasks

1. Implement create, list, retrieve, update, and delete-or-void strategy for income and expense transactions based on auditability requirements.
2. Validate positive amounts, owned account, valid category type, UTC transaction dates, and optional description fields.
3. Ensure balances remain reproducible from source transaction records.
4. Add precise Decimal tests including fractional values and rounding-sensitive scenarios.
5. Add ownership and invalid-state tests.

### Required tests

```bash
cd server
ruff check .
ruff format --check .
mypy app
pytest -q tests
```

### Local commit

```text
milestone(03) phase 03.3: implement income and expense transactions
```

### Stop condition

Income and expense mutation and precision tests pass.

Stop and ask permission before the next phase.

---

## Phase 03.4 — Transfers and atomicity

**Recommended Codex setup:** GPT-5.5 / Extra High reasoning / Standard speed

### Objective

Implement auditable transfers with atomic multi-record database behavior.

### Tasks

1. Implement transfer mutation between owned accounts, linked debit/credit records, and retrieval representation.
2. Wrap transfer writes in one database transaction.
3. Reject same-account transfers, invalid amounts, missing accounts, cross-user accounts, and partial writes.
4. Add rollback tests proving no half-transfer remains after failure.
5. Document transfer invariants in system design and project state.

### Required tests

```bash
cd server
ruff check .
ruff format --check .
mypy app
pytest -q tests
```

### Local commit

```text
milestone(03) phase 03.4: implement atomic account transfers
```

### Stop condition

Transfer invariants and rollback tests pass.

Stop and ask permission before the next phase.

---

## Phase 03.5 — Filters, pagination, and idempotency

**Recommended Codex setup:** GPT-5.5 / Extra High reasoning / Standard speed

### Objective

Make transaction APIs safe and useful for real frontend consumption.

### Tasks

1. Add cursor or clearly documented offset pagination based on project needs.
2. Add filtering by date range, account, category, type, and search fields required by UI matrix.
3. Add deterministic sorting.
4. Implement idempotency protection for retryable create transaction and transfer mutations.
5. Add tests for repeated idempotency keys, mismatched request reuse, filtering, pagination boundaries, and ordering.

### Required tests

```bash
cd server
ruff check .
ruff format --check .
mypy app
pytest -q tests
```

### Local commit

```text
milestone(03) phase 03.5: add transaction filtering pagination and idempotency
```

### Stop condition

Filter, pagination, sorting, and idempotency tests pass.

Stop and ask permission before the next phase.

---

## Phase 03.6 — Finance core tests and contract review

**Recommended Codex setup:** GPT-5.5 / Extra High reasoning / Standard speed

### Objective

Close finance-core coverage gaps and inspect the API contract.

### Tasks

1. Review every money mutation for Decimal usage, transaction boundaries, user ownership, auditability, and idempotency needs.
2. Add missing integration tests and contract tests.
3. Inspect OpenAPI schemas for decimal serialization and pagination shape.
4. Update UI/API matrix and project state endpoint registry.

### Required tests

```bash
cd server
ruff check .
ruff format --check .
mypy app
pytest -q tests
```

### Local commit

```text
milestone(03) phase 03.6: harden finance core contracts
```

### Stop condition

Finance-core coverage gaps are closed and contract review passes.

Stop and ask permission before the next phase.

---

## Phase 03.V — Finance core verification

**Recommended Codex setup:** GPT-5.5 / Extra High reasoning / Standard speed

### Objective

Run complete finance-core verification before pushing the branch.

### Tasks

1. Run full server checks and migration smoke tests.
2. Inspect account, category, transaction, and transfer endpoint registry.
3. Confirm no later budgets or analytics features were implemented prematurely.
4. Update project state and set next allowed phase to `04.1`.

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
```

### Local commit

```text
milestone(03) verify: validate finance core milestone
```

### Stop condition

Milestone 03 is verified. Stop and ask permission to push the branch and begin milestone 04.

Stop and ask permission before the next phase.
