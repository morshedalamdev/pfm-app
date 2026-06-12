# Milestone 10 — Final Audit and Release Readiness

- Branch: `final-audit`
- Milestone objective: Audit backend and frontend, run complete test suites, repair verified defects only, and produce a release-readiness report.

## Mandatory execution rule

Read `AGENTS.md` and `PFM_PROJECT_STATE.md` first. Execute **only one explicitly requested phase** from this file. Do not continue to the following phase automatically, even when tests pass. Update `PFM_PROJECT_STATE.md`, create the local phase commit, report exact results, and stop for user permission.

## Branch protocol

Create this branch only when beginning the milestone. Later phases must continue on the same milestone branch. Do not push until the verification phase passes and the user explicitly requests a push.

## Phase 10.1 — Backend audit

**Recommended Codex setup:** GPT-5.5 / Extra High reasoning / Standard speed

### Objective

Audit backend correctness, security, data integrity, and operational behavior.

### Tasks

1. Review auth, ownership filtering, money precision, database transactions, idempotency, migrations, analytics queries, worker locking, retry behavior, uploads, notifications, SSE, configuration, and logging.
2. Search for TODO, FIXME, placeholder, insecure defaults, accidental secrets, broad exception swallowing, unbounded queries, and dead code.
3. Run backend quality and test suites.
4. Document verified defects only. Fix small isolated defects when safe; defer broad changes to phase 10.4.

### Required tests

```bash
cd server
ruff check .
ruff format --check .
mypy app
pytest -q
alembic upgrade head
# Run documented secret scan or repository search commands.
```

### Local commit

```text
milestone(10) phase 10.1: audit backend release readiness
```

### Stop condition

Backend audit findings and test results are recorded.

Stop and ask permission before the next phase.

---

## Phase 10.2 — Frontend audit

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Audit integrated frontend behavior without redesigning UI.

### Tasks

1. Search for runtime fixtures, stale mock values, unhandled loading/error states, auth-state defects, contract drift, broken responsive layouts, and console errors.
2. Run frontend build, lint, tests, and available end-to-end checks.
3. Inspect mobile, tablet, and desktop behavior for critical flows.
4. Document verified defects only. Fix small isolated defects when safe; defer broad changes to phase 10.4.

### Required tests

```bash
cd client
npm run build
npm run lint --if-present
npm run test --if-present
# Run documented E2E command and runtime fixture searches.
```

### Local commit

```text
milestone(10) phase 10.2: audit frontend release readiness
```

### Stop condition

Frontend audit findings and test results are recorded.

Stop and ask permission before the next phase.

---

## Phase 10.3 — Full test execution

**Recommended Codex setup:** GPT-5.5 / Extra High reasoning / Standard speed

### Objective

Run the complete production-oriented verification matrix and classify failures.

### Tasks

1. Run full backend quality, migrations, frontend build/lint/tests, contract drift check, end-to-end tests, Compose validation, and deployment smoke flow.
2. Record every command and result in a release checklist.
3. Classify failures as code defect, environment blocker, deferred provider integration, or out-of-scope enhancement.
4. Do not expand scope.

### Required tests

```bash
cd server
ruff check .
ruff format --check .
mypy app
pytest -q
alembic upgrade head
cd ../client
npm run build
npm run lint --if-present
npm run test --if-present
cd ..
docker compose config
# Run API contract drift check, documented E2E command, and deployment smoke flow.
```

### Local commit

```text
milestone(10) phase 10.3: run full release verification matrix
```

### Stop condition

Full-suite results and classified failures are recorded.

Stop and ask permission before the next phase.

---

## Phase 10.4 — Verified defect repair

**Recommended Codex setup:** GPT-5.5 / Extra High reasoning / Standard speed

### Objective

Repair only defects proven by audits or tests and rerun affected suites.

### Tasks

1. Review classified failures from phases 10.1 through 10.3.
2. Fix in-scope code defects in small, reviewable changes.
3. Do not add new product features or redesign architecture.
4. Rerun all affected checks and full suite where feasible.
5. Update release checklist and project state.

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
cd ..
docker compose config
# Run API contract drift check, documented E2E command, and deployment smoke flow.
```

### Local commit

```text
milestone(10) phase 10.4: repair verified release defects
```

### Stop condition

All repaired defects have passing regression checks; unresolved blockers are precise and honest.

Stop and ask permission before the next phase.

---

## Phase 10.V — Final readiness verification

**Recommended Codex setup:** GPT-5.5 / Extra High reasoning / Standard speed

### Objective

Produce the final release-readiness record.

### Tasks

1. Run the complete verification matrix one final time.
2. Create `docs/release/RELEASE_READINESS.md` with implemented scope, environment requirements, migrations, test results, provider decisions, known limitations, deployment steps, and rollback notes.
3. Confirm `PFM_PROJECT_STATE.md` contains accurate final status and historical progress log.
4. Report whether the app is ready to deploy, ready with documented external configuration, or blocked by named issues.

### Required tests

```bash
cd server
ruff check .
ruff format --check .
mypy app
pytest -q
alembic upgrade head
cd ../client
npm run build
npm run lint --if-present
npm run test --if-present
cd ..
docker compose config
test -f docs/release/RELEASE_READINESS.md
# Run API contract drift check, documented E2E command, and deployment smoke flow.
```

### Local commit

```text
milestone(10) verify: finalize release readiness audit
```

### Stop condition

Milestone 10 is verified. Stop and request permission before pushing the final audit branch.

Stop and ask permission before the next phase.
