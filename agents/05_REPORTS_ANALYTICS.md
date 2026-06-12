# Milestone 05 Agent — Reports and Analytics

- Branch: `reports-analytics`
- Commit: `milestone(05): add dashboard reports and analytics queries`

## Required workflow

Follow `AGENTS.md` exactly. Read `PFM_PROJECT_STATE.md` first. Work only on this milestone. Think, execute, run the required tests, fix failures until they pass, update `PFM_PROJECT_STATE.md`, commit the milestone, report exact results, and stop. Ask permission before starting the next milestone.

## Objective

Implement the read/query layer required by the dashboard and analytical UI. Keep analytics correct, indexed, and explainable.

## Tasks

1. Use the milestone 00 UI/API matrix to implement the exact dashboard and report queries required by the frontend.
2. Add endpoints for:
   - dashboard summary;
   - available balance and account totals;
   - income versus expense totals;
   - recent transactions;
   - spending by category;
   - trend series for the UI-supported periods;
   - budget progress summaries;
   - savings-goal summaries.
3. Apply date-range handling consistently, with explicit time-zone rules.
4. Add appropriate indexes based on actual query patterns.
5. Avoid premature materialized views. Use SQL aggregation first. Add a documented optimization note only when measurements indicate a need.
6. Add query-level tests using deterministic fixtures and decimal assertions.
7. Inspect query plans for the main report queries and record observations in the state file.
8. Produce or update the FastAPI OpenAPI schema artifact used by later frontend SDK generation.

## Tests

```bash
cd server
ruff check .
ruff format --check .
mypy app
pytest
alembic upgrade head
```

Add report API smoke tests against seeded deterministic data.

## Completion gate

Do not wire the frontend yet. Stop and ask permission to proceed to milestone 06.
