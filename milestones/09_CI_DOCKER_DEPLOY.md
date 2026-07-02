# Milestone 09 — CI, Docker, and Deployment

- Branch: `ci-docker-deploy`
- Milestone objective: Add containerized local orchestration, CI quality gates, deployment configuration, operational documentation, and updated FastAPI README content.

## Mandatory execution rule

Read `AGENTS.md` and `PFM_PROJECT_STATE.md` first. Execute **only one explicitly requested phase** from this file. Do not continue to the following phase automatically, even when tests pass. Update `PFM_PROJECT_STATE.md`, create the local phase commit, report exact results, and stop for user permission.

## Branch protocol

Create this branch only when beginning the milestone. Later phases must continue on the same milestone branch. Do not push until the verification phase passes and the user explicitly requests a push.

## Phase 09.1 — Docker and Compose

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Containerize the API and worker and provide local full-stack orchestration.

### Tasks

1. Add production-oriented backend Dockerfile and worker execution configuration.
2. Review or add frontend Docker strategy only when consistent with existing deployment.
3. Add local Compose configuration for PostgreSQL, API, worker, and frontend where useful.
4. Add health checks, volumes, ignored artifacts, and environment template usage.
5. Do not embed secrets.
6. Document local start, stop, migrate, and reset commands.

### Required tests

```bash
docker compose config
# Run documented build command, normally:
docker compose build
```

### Local commit

```text
milestone(09) phase 09.1: add docker compose local stack
```

### Stop condition

Compose configuration validates and images build or a clearly documented external Docker blocker is proven.

Stop and ask permission before the next phase.

---

## Phase 09.2 — Continuous integration

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Add CI checks that reproduce required quality gates.

### Tasks

1. Add CI workflow for backend lint, formatting, type checking, tests, PostgreSQL service, migrations, and frontend build/lint/tests.
2. Add API contract generation drift check.
3. Add dependency caching where appropriate without obscuring reproducibility.
4. Ensure CI uses test-only secrets and disposable services.
5. Document CI commands locally.

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
# Run local API contract drift check.
```

### Local commit

```text
milestone(09) phase 09.2: add continuous integration quality gates
```

### Stop condition

CI workflow syntax and locally reproducible checks pass.

Stop and ask permission before the next phase.

---

## Phase 09.3 — Deployment configuration

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Document a production deployment topology and safe environment setup.

### Tasks

1. Document required services: frontend, API, worker, PostgreSQL, storage provider when selected, email provider when selected, TLS termination, and log collection.
2. Add production environment variable checklist without values.
3. Document migration procedure, rollback considerations, database backup requirement, health probes, worker start command, and receipt storage behavior.
4. Add production CORS and cookie security notes based on actual frontend/API domains.
5. Ask user only for hosting-provider-specific details required to generate concrete deployment files.

### Required tests

```bash
test -f docs/deployment/DEPLOYMENT.md
grep -q "migration" docs/deployment/DEPLOYMENT.md
grep -q "worker" docs/deployment/DEPLOYMENT.md
```

### Local commit

```text
milestone(09) phase 09.3: document production deployment topology
```

### Stop condition

Deployment documentation covers services, secrets, migrations, health, and rollback considerations.

Stop and ask permission before the next phase.

---

## Phase 09.4 — README update

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Replace stale backend documentation and create accurate developer onboarding.

### Tasks

1. Update root README to describe the FastAPI backend, Next.js frontend, PostgreSQL database, worker, architecture links, setup prerequisites, local commands, migrations, tests, and milestone workflow.
2. Remove stale Nest.js, Express, Prisma, and TypeORM claims unless historical notes are intentionally retained and clearly labeled.
3. Document local-development adapters and optional production provider setup.
4. Verify commands against actual scripts.

### Required tests

```bash
grep -R "NestJS\|Nest.js\|Express\|Prisma\|TypeORM" -n README.md server docs || true
# Run commands documented in README where feasible.
```

### Local commit

```text
milestone(09) phase 09.4: update fastapi project documentation
```

### Stop condition

README accurately describes the implemented stack and commands.

Stop and ask permission before the next phase.

---

## Phase 09.5 — Deployment smoke test

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Run local deployment-oriented smoke checks.

### Tasks

1. Start the Compose stack or equivalent local production-like stack.
2. Apply migrations and verify API liveness/readiness.
3. Verify frontend reaches API, worker starts, and a minimal authenticated money flow works.
4. Stop stack cleanly and record exact results.
5. Fix deployment defects within scope.

### Required tests

```bash
docker compose config
docker compose up -d --build
# Run documented migration, health, and smoke-test commands.
docker compose down
```

### Local commit

```text
milestone(09) phase 09.5: validate deployment smoke flow
```

### Stop condition

Local deployment smoke flow passes or external Docker limitations are recorded precisely.

Stop and ask permission before the next phase.

---

## Phase 09.V — DevOps verification

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Verify CI, containerization, deployment docs, and README consistency.

### Tasks

1. Run backend and frontend suites, Compose validation, and contract drift checks.
2. Review committed files for secrets and generated artifacts that should be ignored.
3. Update project state and set next allowed phase to `10.1`.

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
# Run API contract drift check.
```

### Local commit

```text
milestone(09) verify: validate ci docker deployment milestone
```

### Stop condition

Milestone 09 is verified. Stop and ask permission to push the branch and begin milestone 10.

Stop and ask permission before the next phase.
