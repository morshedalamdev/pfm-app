# Milestone 02 — Authentication and User Security

- Branch: `auth-security`
- Milestone objective: Implement users, registration, login, JWT access tokens, rotated refresh sessions, logout, authorization dependencies, and security-focused tests.

## Mandatory execution rule

Read `AGENTS.md` and `PFM_PROJECT_STATE.md` first. Execute **only one explicitly requested phase** from this file. Do not continue to the following phase automatically, even when tests pass. Update `PFM_PROJECT_STATE.md`, create the local phase commit, report exact results, and stop for user permission.

## Branch protocol

Create this branch only when beginning the milestone. Later phases must continue on the same milestone branch. Do not push until the verification phase passes and the user explicitly requests a push.

## Phase 02.1 — User and session models

**Recommended Codex setup:** GPT-5.5 / High reasoning / Standard speed

### Objective

Create persisted auth schema and migrations before implementing auth routes.

### Tasks

1. Add user and refresh-session models with UUID identifiers, normalized email, password hash, active status, timestamps, refresh-token hash, expiry, revocation metadata, and session family metadata when needed for rotation.
2. Apply appropriate unique constraints and indexes.
3. Create Alembic migration and upgrade/downgrade tests.
4. Add repository/service skeletons with no endpoint behavior beyond what this phase needs.
5. Update project state schema and migration registry.

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
milestone(02) phase 02.1: add user and refresh session schema
```

### Stop condition

User/session schema migration passes upgrade/downgrade/upgrade checks.

Stop and ask permission before the next phase.

---

## Phase 02.2 — Registration and password hashing

**Recommended Codex setup:** GPT-5.5 / Extra High reasoning / Standard speed

### Objective

Implement secure user registration and password handling.

### Tasks

1. Implement password policy, email normalization, Argon2 hashing via `pwdlib`, registration request/response schemas, and registration service.
2. Add `/api/v1/auth/register`.
3. Ensure password hashes and sensitive data never appear in API responses or logs.
4. Handle duplicate emails deterministically without leaking inappropriate detail.
5. Add tests for success, duplicate email, invalid email, weak password, normalization, and serialization safety.

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
milestone(02) phase 02.2: implement secure user registration
```

### Stop condition

Registration behavior and security edge cases pass.

Stop and ask permission before the next phase.

---

## Phase 02.3 — Login and access token

**Recommended Codex setup:** GPT-5.5 / Extra High reasoning / Standard speed

### Objective

Implement credential verification and short-lived access JWT issuance.

### Tasks

1. Implement login schema, credential verification, inactive-user rejection, access JWT claims, signing configuration, expiry handling, and token decode validation.
2. Add `/api/v1/auth/login` and a protected `/api/v1/users/me` endpoint.
3. Create reusable authorization dependency for current user resolution.
4. Use generic invalid-credential responses.
5. Add tests for valid login, invalid credentials, inactive account, protected access, malformed token, expired token, and invalid signature.

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
milestone(02) phase 02.3: implement jwt login and protected user access
```

### Stop condition

Access-token login and protected endpoint tests pass.

Stop and ask permission before the next phase.

---

## Phase 02.4 — Refresh rotation and logout

**Recommended Codex setup:** GPT-5.5 / Extra High reasoning / Standard speed

### Objective

Implement refresh-session rotation and revocation without storing plaintext refresh tokens.

### Tasks

1. Implement refresh-token creation, secure hashing, rotation, expiry validation, revocation, and session-family reuse handling.
2. Add `/api/v1/auth/refresh` and `/api/v1/auth/logout`.
3. Ensure a rotated or revoked refresh token cannot be reused successfully.
4. Decide cookie-versus-response transport based on the existing frontend deployment topology and document the choice.
5. Add tests for refresh success, rotation, reuse rejection, expiry, logout, and revocation.

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
milestone(02) phase 02.4: implement refresh rotation and logout
```

### Stop condition

Refresh and logout security tests pass.

Stop and ask permission before the next phase.

---

## Phase 02.5 — Authentication edge-case tests

**Recommended Codex setup:** GPT-5.5 / Extra High reasoning / Standard speed

### Objective

Harden auth behavior and fill missing test coverage.

### Tasks

1. Review auth code for user enumeration, sensitive logging, session replay, token leakage, timezone handling, and authorization dependency correctness.
2. Add tests for concurrency-sensitive refresh behavior where feasible.
3. Add rate-limit design notes for login and registration. Implement only if foundation supports it cleanly without scope expansion.
4. Update OpenAPI contract notes and project state endpoint registry.

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
milestone(02) phase 02.5: harden authentication edge cases
```

### Stop condition

Auth edge-case review and tests pass without introducing unrelated features.

Stop and ask permission before the next phase.

---

## Phase 02.V — Authentication verification

**Recommended Codex setup:** GPT-5.5 / Extra High reasoning / Standard speed

### Objective

Verify schema, migrations, security behavior, and code quality for the complete auth milestone.

### Tasks

1. Run the full quality suite and migration smoke tests.
2. Inspect OpenAPI auth routes and protected-route dependency behavior.
3. Confirm no secret values are committed.
4. Update project state and set the next allowed phase to `03.1`.

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
milestone(02) verify: validate authentication security milestone
```

### Stop condition

Milestone 02 is verified. Stop and ask permission to push the branch and begin milestone 03.

Stop and ask permission before the next phase.
