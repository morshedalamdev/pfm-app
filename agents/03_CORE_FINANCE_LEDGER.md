# Milestone 03 Agent — Core Finance Ledger

- Branch: `core-finance-ledger`
- Commit: `milestone(03): implement accounts categories and transactions`

## Required workflow

Follow `AGENTS.md` exactly. Read `PFM_PROJECT_STATE.md` first. Work only on this milestone. Think, execute, run the required tests, fix failures until they pass, update `PFM_PROJECT_STATE.md`, commit the milestone, report exact results, and stop. Ask permission before starting the next milestone.

## Objective

Implement the transactional core: accounts, categories, income, expenses, transfers, filtering, and reproducible balances.

## Tasks

1. Add models and migrations for:
   - accounts;
   - categories;
   - transactions;
   - any minimal supporting table required for robust transfer handling or idempotency.
2. Use PostgreSQL `NUMERIC` and Python `Decimal` for all monetary fields. Never persist money as float.
3. Support transaction types at minimum:
   - income;
   - expense;
   - transfer.
4. Keep transfer behavior atomic. A transfer must never partially update only one account.
5. Expose versioned CRUD and query endpoints for accounts, categories, and transactions.
6. Support transaction filtering by date range, account, category, type, and pagination. Define deterministic sorting.
7. Implement derived account balances from source transactions. Do not create silently diverging balance state.
8. Add ownership checks to every operation. One user must never access another user's financial records.
9. Add idempotency behavior for retry-prone transaction creation.
10. Add default categories in a safe, repeatable manner without duplicating records.
11. Add tests for decimal precision, ownership isolation, transfers, archived accounts/categories, filtering, pagination, invalid inputs, and idempotent retries.

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

Run API smoke tests that create two accounts, create income and expense records, execute a transfer, and verify balances.

## Completion gate

Do not implement budgets or charts. Finish only when the ledger behavior is correct and repeatable. Stop and ask permission to proceed to milestone 04.
