# Milestone 04 — Budgets and Savings Goals

- Branch: `budgets-savings`
- Milestone objective: Implement budget periods, category spending progress, savings goals, contributions, and validation tests.

## Mandatory execution rule

Read `AGENTS.md` and `PFM_PROJECT_STATE.md` first. Execute **only one explicitly requested phase** from this file. Do not continue to the following phase automatically, even when tests pass. Update `PFM_PROJECT_STATE.md`, create the local phase commit, report exact results, and stop for user permission.

## Branch protocol

Create this branch only when beginning the milestone. Later phases must continue on the same milestone branch. Do not push until the verification phase passes and the user explicitly requests a push.

## Phase 04.1 — Budget schema and rules

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Define budget persistence and period semantics.

### Tasks

1. Create budget model with ownership, optional category scope, period type or explicit period dates, Decimal limit, timestamps, and archive behavior.
2. Define overlap rules and document whether overlapping category/global budgets are allowed.
3. Create migration and schema tests.
4. Update project state with business rules.

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
milestone(04) phase 04.1: add budget schema and period rules
```

### Stop condition

Budget schema and migration behavior are verified.

Stop and ask permission before the next phase.

---

## Phase 04.2 — Budget APIs and progress

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Implement budget management and calculated spending progress.

### Tasks

1. Implement budget create, list, retrieve, update, and archive endpoints.
2. Calculate spent amount and remaining amount from expense source records for the relevant period.
3. Return progress shape required by UI matrix without duplicating source-of-truth money values unnecessarily.
4. Add tests for category filters, period boundaries, ownership, overlap rules, archived records, and progress calculations.

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
milestone(04) phase 04.2: implement budget APIs and progress
```

### Stop condition

Budget CRUD and progress calculations pass.

Stop and ask permission before the next phase.

---

## Phase 04.3 — Savings goals and contributions

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Implement auditable savings-goal progress.

### Tasks

1. Create savings-goal and contribution models with Decimal amounts, ownership, target value, optional target date, status, timestamps, and auditable contributions.
2. Create migration and implement goal CRUD plus contribution create/list behavior.
3. Compute saved amount and progress from contribution source records.
4. Define behavior for contributions above target and archived/completed goals.
5. Add tests for calculations, invalid amounts, ownership, completion, and target-date validation.

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
milestone(04) phase 04.3: implement savings goals and contributions
```

### Stop condition

Savings goal schema, endpoints, and progress tests pass.

Stop and ask permission before the next phase.

---

## Phase 04.4 — Budget and savings hardening

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Review edge cases and align OpenAPI contracts with the frontend matrix.

### Tasks

1. Review Decimal handling, UTC period boundaries, archived records, authorization, and progress serialization.
2. Add missing edge-case tests.
3. Update UI/API matrix and project state endpoint registry.

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
milestone(04) phase 04.4: harden budgets and savings contracts
```

### Stop condition

Budget and savings edge-case tests pass.

Stop and ask permission before the next phase.

---

## Phase 04.V — Budget and savings verification

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Run full milestone verification.

### Tasks

1. Run full server quality suite and migration checks.
2. Confirm budget and savings endpoints satisfy UI/API matrix requirements.
3. Update project state and set next allowed phase to `05.1`.

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
milestone(04) verify: validate budgets and savings milestone
```

### Stop condition

Milestone 04 is verified. Stop and ask permission to push the branch and begin milestone 05.

Stop and ask permission before the next phase.
