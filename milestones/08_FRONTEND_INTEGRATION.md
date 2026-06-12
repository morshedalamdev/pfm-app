# Milestone 08 — Frontend Integration

- Branch: `frontend-integration`
- Milestone objective: Generate the frontend API contract, add the client data layer, replace fixtures with responsive server data, preserve the existing UI, and test end-to-end behavior.

## Mandatory execution rule

Read `AGENTS.md` and `PFM_PROJECT_STATE.md` first. Execute **only one explicitly requested phase** from this file. Do not continue to the following phase automatically, even when tests pass. Update `PFM_PROJECT_STATE.md`, create the local phase commit, report exact results, and stop for user permission.

## Branch protocol

Create this branch only when beginning the milestone. Later phases must continue on the same milestone branch. Do not push until the verification phase passes and the user explicitly requests a push.

## Phase 08.1 — Generated API contract

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Generate typed TypeScript API contracts from FastAPI OpenAPI.

### Tasks

1. Run the backend and obtain stable OpenAPI schema.
2. Choose and configure an OpenAPI TypeScript type or client generator that fits the existing frontend tooling.
3. Add generation script and commit generated output according to a documented policy.
4. Create a contract-drift check suitable for CI.
5. Do not hand-maintain duplicate API types where generated types suffice.
6. Update project state with generation commands.

### Required tests

```bash
cd server
ruff check .
ruff format --check .
mypy app
pytest -q
cd ../client
npm run build
npm run lint --if-present
npm run test --if-present
# Run the newly added API generation and drift-check commands.
```

### Local commit

```text
milestone(08) phase 08.1: generate typed frontend api contract
```

### Stop condition

Generated contract and drift-check commands work.

Stop and ask permission before the next phase.

---

## Phase 08.2 — Frontend API and auth layer

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Create a dedicated client data layer and connect authentication.

### Tasks

1. Inspect existing Axios helpers, Zustand stores, route structure, and deployment topology.
2. Implement typed API base configuration, request handling, consistent error mapping, auth state, login, registration, logout, refresh behavior, and protected-route behavior.
3. Use the backend cookie/token transport decision recorded in milestone 02.
4. Add loading, invalid-credential, expired-session, and network-error behavior without redesigning UI.
5. Add frontend tests where existing setup allows.

### Required tests

```bash
cd client
npm run build
npm run lint --if-present
npm run test --if-present
```

### Local commit

```text
milestone(08) phase 08.2: connect frontend authentication api layer
```

### Stop condition

Auth UI uses real backend contracts and frontend checks pass.

Stop and ask permission before the next phase.

---

## Phase 08.3 — Dashboard integration

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Replace dashboard fixtures with live server queries.

### Tasks

1. Connect summary cards, recent transactions, charts, and notification indicators mapped in the UI/API matrix.
2. Add clear loading skeletons or existing loading patterns, empty states, and error/retry states.
3. Preserve layout and visual design.
4. Remove or isolate dashboard fixture values after verified replacement.
5. Test responsive rendering and backend error behavior.

### Required tests

```bash
cd client
npm run build
npm run lint --if-present
npm run test --if-present
```

### Local commit

```text
milestone(08) phase 08.3: connect dashboard to server analytics
```

### Stop condition

Dashboard renders live data states without fixture dependency.

Stop and ask permission before the next phase.

---

## Phase 08.4 — CRUD screen integration

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Connect transaction, account, category, budget, savings, recurring, notification, and receipt UI surfaces that already exist.

### Tasks

1. Follow the UI/API matrix and integrate existing screens incrementally.
2. Connect account and category forms and lists.
3. Connect income, expense, and transfer flows including idempotency behavior where relevant.
4. Connect budget and savings-goal screens.
5. Connect recurring rules, receipts, and notification actions only for UI surfaces that exist or minimally required states defined in the matrix.
6. Preserve UI design; add only missing states required for correctness.

### Required tests

```bash
cd client
npm run build
npm run lint --if-present
npm run test --if-present
```

### Local commit

```text
milestone(08) phase 08.4: connect finance screens to server data
```

### Stop condition

Existing CRUD surfaces use server data and frontend checks pass.

Stop and ask permission before the next phase.

---

## Phase 08.5 — Fixture removal and resilience states

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Remove remaining runtime fixtures and complete user-facing resilience behavior.

### Tasks

1. Search for mock, fixture, hardcoded finance values, and unused temporary adapters.
2. Remove runtime fixture dependencies after confirming all mapped UI surfaces have real data paths.
3. Verify loading, empty, error, retry, unauthorized, and offline/network-failure states.
4. Keep intentional development fixtures only in tests or clearly named seed scripts.
5. Update UI/API matrix and project state.

### Required tests

```bash
cd client
npm run build
npm run lint --if-present
npm run test --if-present
# Run repository searches for recorded fixture names and hardcoded values.
```

### Local commit

```text
milestone(08) phase 08.5: remove runtime fixtures and add resilience states
```

### Stop condition

Runtime fixtures are removed and resilience states are verified.

Stop and ask permission before the next phase.

---

## Phase 08.6 — Responsive and end-to-end checks

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Validate integrated user journeys and responsive behavior.

### Tasks

1. Add or run end-to-end tests for registration/login, account creation, category creation, income, expense, transfer, budget, savings contribution, report rendering, notification behavior, and logout where supported.
2. Test mobile, tablet, and desktop breakpoints for affected screens.
3. Fix integration defects without redesigning UI.
4. Record exact local full-stack run commands.

### Required tests

```bash
cd server
pytest -q
cd ../client
npm run build
npm run lint --if-present
npm run test --if-present
# Run the documented E2E command added by this phase.
```

### Local commit

```text
milestone(08) phase 08.6: validate responsive full stack journeys
```

### Stop condition

Integrated user journeys and responsive checks pass.

Stop and ask permission before the next phase.

---

## Phase 08.V — Frontend verification

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Verify the complete frontend/server integration milestone.

### Tasks

1. Run backend, frontend, contract-drift, and end-to-end checks.
2. Verify no production UI path depends on mock values.
3. Review changed screens against preserved UI requirement.
4. Update project state and set next allowed phase to `09.1`.

### Required tests

```bash
cd server
ruff check .
ruff format --check .
mypy app
pytest -q
cd ../client
npm run build
npm run lint --if-present
npm run test --if-present
# Run API contract drift check and documented E2E command.
```

### Local commit

```text
milestone(08) verify: validate frontend integration milestone
```

### Stop condition

Milestone 08 is verified. Stop and ask permission to push the branch and begin milestone 09.

Stop and ask permission before the next phase.
