# Milestone 00 — Discovery and Architecture Baseline

- Branch: `discovery-architecture`
- Milestone objective: Verify the real repository, record the frontend-to-backend requirements, and create a durable architecture baseline without implementing product features.

## Mandatory execution rule

Read `AGENTS.md` and `PFM_PROJECT_STATE.md` first. Execute **only one explicitly requested phase** from this file. Do not continue to the following phase automatically, even when tests pass. Update `PFM_PROJECT_STATE.md`, create the local phase commit, report exact results, and stop for user permission.

## Branch protocol

Create this branch only when beginning the milestone. Later phases must continue on the same milestone branch. Do not push until the verification phase passes and the user explicitly requests a push.

## Phase 00.1 — Repository audit

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Inspect the local repository and record the actual starting point before any migration work.

### Tasks

1. Run `git status --short --branch`, inspect remotes, active branch, `.gitignore`, root tree, and tracked files.
2. Read root and nested README files, package manifests, lock files, scripts, environment templates, deployment files, and existing tests.
3. Inspect the complete `server/` directory. Determine whether it is scaffold-only or contains meaningful behavior that must be preserved conceptually.
4. Inspect the complete `client/` directory structure without modifying UI code.
5. Run current valid baseline checks. Do not repair unrelated product issues in this phase; record failures precisely.
6. Update `PFM_PROJECT_STATE.md`: verified repository inventory, valid commands, stale documentation findings, baseline test results, and phase status.

### Required tests

```bash
git status --short --branch
cd client
npm install
npm run build
npm run lint --if-present
npm run test --if-present
# Return to repository root and run only currently valid server scaffold checks discovered during inspection.
```

### Local commit

```text
milestone(00) phase 00.1: record verified repository baseline
```

### Stop condition

Repository structure, current checks, and server replacement evidence are recorded. No product implementation was added.

Stop and ask permission before the next phase.

---

## Phase 00.2 — Frontend requirements map

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Map every implemented UI surface to data requirements and mutations so later backend phases build what the existing frontend actually needs.

### Tasks

1. Inspect every frontend route, page, layout, major component, form, chart, modal, table, filter, state store, constant, mock data object, and API helper.
2. Create `docs/architecture/UI_API_MATRIX.md` with screen, visible data, required query, required mutation, validation, loading state, empty state, and error state columns.
3. Create or update the screen inventory and UI-to-API summary in `PFM_PROJECT_STATE.md`.
4. Identify fixtures and hardcoded values that milestone 08 must replace. Record exact file paths.
5. Record UI gaps that need new states without redesigning the current visual language.

### Required tests

```bash
cd client
npm run build
npm run lint --if-present
npm run test --if-present
```

### Local commit

```text
milestone(00) phase 00.2: map frontend data requirements
```

### Stop condition

The UI/API matrix covers every existing screen and fixture. No backend implementation was added.

Stop and ask permission before the next phase.

---

## Phase 00.3 — Architecture baseline

**Recommended Codex setup:** GPT-5.5 / Extra High reasoning / Standard speed

### Objective

Create the system design and reconcile it with the verified UI requirements.

### Tasks

1. Review locked architecture decisions in `PFM_PROJECT_STATE.md` against the verified repository and UI/API matrix.
2. Create `docs/architecture/SYSTEM_DESIGN.md` with product scope, module boundaries, database responsibility boundaries, Mermaid component diagram, request flow, auth flow, transaction flow, worker/outbox flow, SSE flow, local topology, production topology, and non-goals.
3. Define a proposed entity map for users, sessions, accounts, categories, transactions, transfer linkage, idempotency records, budgets, savings goals, contributions, recurring rules, outbox events, notifications, receipts, and audit metadata.
4. Define API groups under `/api/v1`, pagination conventions, error envelope, decimal serialization, UTC timestamp strategy, and OpenAPI client-generation approach.
5. Record architectural decisions and deferred decisions in `PFM_PROJECT_STATE.md`.

### Allowed questions

- Ask the user to confirm default base currency and whether MVP requires multiple currencies only if not already specified. Record a safe default and defer conversion logic when unanswered.

### Required tests

```bash
test -f docs/architecture/SYSTEM_DESIGN.md
test -f docs/architecture/UI_API_MATRIX.md
grep -q "api/v1" docs/architecture/SYSTEM_DESIGN.md
grep -q "FastAPI" docs/architecture/SYSTEM_DESIGN.md
```

### Local commit

```text
milestone(00) phase 00.3: define fastapi system architecture
```

### Stop condition

The architecture baseline is documented and later milestones can implement without rethinking the whole system.

Stop and ask permission before the next phase.

---

## Phase 00.4 — Discovery verification

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Verify the milestone documents are internally consistent and sufficient for implementation.

### Tasks

1. Review `PFM_PROJECT_STATE.md`, `docs/architecture/SYSTEM_DESIGN.md`, and `docs/architecture/UI_API_MATRIX.md` for contradictions or missing screens.
2. Confirm that every fixture is mapped to a planned API source or explicitly deferred feature.
3. Confirm server replacement boundaries and files that must be removed or archived in milestone 01.
4. Run baseline frontend checks again.
5. Mark milestone 00 phases as passed and set the next allowed phase to `01.1`.

### Required tests

```bash
cd client
npm run build
npm run lint --if-present
npm run test --if-present
cd ..
test -f docs/architecture/SYSTEM_DESIGN.md
test -f docs/architecture/UI_API_MATRIX.md
```

### Local commit

```text
milestone(00) phase 00.4: verify discovery architecture baseline
```

### Stop condition

Milestone 00 is verified. Stop and ask permission to push the branch and begin milestone 01.

Stop and ask permission before the next phase.
