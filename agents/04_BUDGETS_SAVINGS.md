# Milestone 04 Agent — Budgets and Savings Goals

- Branch: `budgets-savings`
- Commit: `milestone(04): implement budgets and savings goals`

## Required workflow

Follow `AGENTS.md` exactly. Read `PFM_PROJECT_STATE.md` first. Work only on this milestone. Think, execute, run the required tests, fix failures until they pass, update `PFM_PROJECT_STATE.md`, commit the milestone, report exact results, and stop. Ask permission before starting the next milestone.

## Objective

Implement budgets, savings goals, and progress calculations without duplicating unreliable derived state.

## Tasks

1. Add models and migrations for budgets, savings goals, and savings contributions or the verified equivalent selected during milestone 00.
2. Support monthly budget creation, update, archive/delete behavior, and retrieval by period.
3. Calculate budget usage from transaction data. Make over-budget state derivable and testable.
4. Support savings-goal creation, update, progress, contribution tracking, target dates, completion state, and archive behavior.
5. Link contributions to transactions when the product behavior supports it. Do not force a link when manual contributions are intentionally allowed.
6. Add ownership checks, decimal handling, validation, and pagination where appropriate.
7. Add tests for month boundaries, time zones, category-specific spending, over-budget state, goal progress precision, archived records, and cross-user isolation.

## Tests

```bash
cd server
ruff check .
ruff format --check .
mypy app
pytest
alembic downgrade -1
alembic upgrade head
```

## Completion gate

Do not build report endpoints beyond minimal calculations required by this module. Stop and ask permission to proceed to milestone 05.
