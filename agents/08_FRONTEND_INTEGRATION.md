# Milestone 08 Agent — Frontend Integration

- Branch: `frontend-integration`
- Commit: `milestone(08): connect Next frontend to FastAPI data`

## Required workflow

Follow `AGENTS.md` exactly. Read `PFM_PROJECT_STATE.md` first. Work only on this milestone. Think, execute, run the required tests, fix failures until they pass, update `PFM_PROJECT_STATE.md`, commit the milestone, report exact results, and stop. Ask permission before starting the next milestone.

## Objective

Connect the existing Next.js frontend UI to the FastAPI backend while preserving the current visual design and responsive behavior.

## Tasks

1. Re-read the milestone 00 UI/API matrix and compare it with the implemented OpenAPI schema.
2. Generate TypeScript types or a TypeScript API client from the FastAPI OpenAPI schema. Do not manually duplicate backend response types unless a deliberate UI view-model layer requires it.
3. Create a dedicated frontend API layer and environment-configured API base URL.
4. Select and add a server-state query/cache approach appropriate for the existing client. Keep Zustand for UI-oriented state rather than treating it as the primary server-data cache.
5. Replace placeholder and fixture finance values screen-by-screen with backend data.
6. Wire authentication, session refresh behavior, protected routes, logout, accounts, categories, transactions, budgets, savings goals, dashboard summaries, reports, recurring rules, notifications, and receipts according to the verified UI scope.
7. Add loading, empty, validation, unauthorized, error, and retry states. Preserve the current UI style.
8. Use optimistic updates only where rollback behavior is safe and clear.
9. Use SSE to invalidate/refetch relevant cached data or surface notifications. Do not use SSE as a replacement for normal CRUD responses.
10. Ensure mobile and desktop layouts still work with realistic data lengths and empty states.
11. Add frontend tests or end-to-end tests for critical user journeys.

## Tests

```bash
cd client
npm install
npm run build
npm run lint --if-present
npm run test --if-present
```

Run the backend checks again:

```bash
cd ../server
ruff check .
ruff format --check .
mypy app
pytest
```

Run end-to-end smoke flows against local PostgreSQL:

1. register and log in;
2. create categories and accounts;
3. create income and expenses;
4. verify dashboard totals and charts update;
5. create a budget and savings goal;
6. verify recurring rule UI behavior;
7. upload a local receipt where supported;
8. verify notification behavior;
9. log out and verify route protection.

## Completion gate

Do not redesign screens. Finish only when fixture data is removed from server-backed screens and responsive behavior is verified. Stop and ask permission to proceed to milestone 09.
