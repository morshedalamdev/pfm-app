# Milestone 05 — Reports and Analytics

- Branch: `reports-analytics`
- Milestone objective: Implement dashboard summaries, trends, breakdowns, report contracts, query performance review, and correctness tests.

## Mandatory execution rule

Read `AGENTS.md` and `PFM_PROJECT_STATE.md` first. Execute **only one explicitly requested phase** from this file. Do not continue to the following phase automatically, even when tests pass. Update `PFM_PROJECT_STATE.md`, create the local phase commit, report exact results, and stop for user permission.

## Branch protocol

Create this branch only when beginning the milestone. Later phases must continue on the same milestone branch. Do not push until the verification phase passes and the user explicitly requests a push.

## Phase 05.1 — Report contracts

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Define report response schemas from actual dashboard and analytics UI requirements.

### Tasks

1. Review `docs/architecture/UI_API_MATRIX.md` and inspect dashboard/chart components again.
2. Define report query parameters, UTC date-range semantics, grouping interval rules, decimal serialization, empty-period behavior, and response schemas.
3. Document endpoints before implementation.
4. Update project state and UI/API matrix.

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
milestone(05) phase 05.1: define analytics api contracts
```

### Stop condition

Report contracts match verified frontend needs and avoid unnecessary endpoints.

Stop and ask permission before the next phase.

---

## Phase 05.2 — Dashboard summaries

**Recommended Codex setup:** GPT-5.5 / Extra High reasoning / Standard speed

### Objective

Implement dashboard summary queries from source records.

### Tasks

1. Implement summary endpoint for total balance, income, expense, savings or net flow values required by the UI.
2. Implement recent-transactions query where needed.
3. Use database aggregation and preserve Decimal correctness.
4. Handle empty accounts and empty periods deterministically.
5. Add correctness, ownership, date-boundary, and empty-state tests.

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
milestone(05) phase 05.2: implement dashboard summary analytics
```

### Stop condition

Dashboard summary queries and tests pass.

Stop and ask permission before the next phase.

---

## Phase 05.3 — Trends and breakdowns

**Recommended Codex setup:** GPT-5.5 / Extra High reasoning / Standard speed

### Objective

Implement chart-ready category and time-series analytics.

### Tasks

1. Implement expense-by-category breakdown.
2. Implement income-versus-expense or cash-flow trend endpoint with requested grouping intervals.
3. Implement savings trend or goal progress analytics required by the frontend.
4. Add period-boundary, timezone, Decimal, empty-series, and cross-user isolation tests.
5. Update endpoint registry.

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
milestone(05) phase 05.3: implement trends and category breakdowns
```

### Stop condition

Chart-oriented analytics return correct deterministic results.

Stop and ask permission before the next phase.

---

## Phase 05.4 — Query performance review

**Recommended Codex setup:** GPT-5.5 / Extra High reasoning / Standard speed

### Objective

Review analytics SQL efficiency and add justified indexes.

### Tasks

1. Inspect generated SQL or explicit queries for report endpoints.
2. Use PostgreSQL query plans on representative seeded data.
3. Add or refine indexes only when justified by access patterns and explain decisions in system design.
4. Avoid premature materialized views unless measured evidence requires them.
5. Record performance notes and commands in project state.

### Required tests

```bash
cd server
ruff check .
ruff format --check .
mypy app
pytest -q tests
# Run documented EXPLAIN or EXPLAIN ANALYZE commands against disposable representative data.
```

### Local commit

```text
milestone(05) phase 05.4: optimize analytics query plans
```

### Stop condition

Query plans are reviewed and justified indexes are documented.

Stop and ask permission before the next phase.

---

## Phase 05.5 — Analytics tests and contract review

**Recommended Codex setup:** GPT-5.5 / Extra High reasoning / Standard speed

### Objective

Close analytics correctness and contract gaps.

### Tasks

1. Add fixture sets covering multiple accounts, categories, periods, empty data, and user isolation.
2. Verify all chart response shapes against the UI/API matrix.
3. Inspect OpenAPI output for report schemas.
4. Update project state.

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
milestone(05) phase 05.5: harden analytics correctness tests
```

### Stop condition

Analytics coverage and OpenAPI contracts are verified.

Stop and ask permission before the next phase.

---

## Phase 05.V — Analytics verification

**Recommended Codex setup:** GPT-5.5 / Extra High reasoning / Standard speed

### Objective

Run complete analytics verification.

### Tasks

1. Run full server quality, test, and migration suites.
2. Verify report endpoints and query-plan notes are recorded.
3. Update project state and set next allowed phase to `06.1`.

### Required tests

```bash
cd server
ruff check .
ruff format --check .
mypy app
pytest -q
alembic upgrade head
```

### Local commit

```text
milestone(05) verify: validate reports analytics milestone
```

### Stop condition

Milestone 05 is verified. Stop and ask permission to push the branch and begin milestone 06.

Stop and ask permission before the next phase.
