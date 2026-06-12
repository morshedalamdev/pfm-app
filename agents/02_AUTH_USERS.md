# Milestone 02 Agent — Authentication and Users

- Branch: `auth-users`
- Commit: `milestone(02): add secure user authentication and sessions`

## Required workflow

Follow `AGENTS.md` exactly. Read `PFM_PROJECT_STATE.md` first. Work only on this milestone. Think, execute, run the required tests, fix failures until they pass, update `PFM_PROJECT_STATE.md`, commit the milestone, report exact results, and stop. Ask permission before starting the next milestone.

## Objective

Implement secure local email/password authentication and the user profile boundary.

## Tasks

1. Add `users` and `refresh_sessions` models with Alembic migrations.
2. Normalize and uniquely index user email addresses.
3. Hash passwords with `pwdlib` recommended Argon2 settings. Never store plaintext passwords.
4. Implement:
   - registration;
   - login;
   - refresh-token rotation;
   - logout for the active session;
   - logout-all-sessions;
   - current authenticated user endpoint;
   - profile update endpoint for safe editable fields.
5. Use short-lived access JWTs. Store refresh-token hashes, not plaintext refresh tokens.
6. Define secure cookie behavior from environment settings. Document local-development and production cookie differences.
7. Apply ownership dependencies and authorization helpers that later modules can reuse.
8. Add rate-limiting protection around auth endpoints using a clean abstraction. If a durable distributed limiter requires infrastructure not yet justified, implement an explicit local-safe default and document the production hardening step.
9. Add tests for happy paths, invalid credentials, duplicate registration, expired tokens, refresh reuse, revoked sessions, unauthorized access, and logout behavior.

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

Run API smoke checks for register, login, refresh, logout, and `/api/v1/users/me`.

## Completion gate

Do not implement finance modules. Finish only when auth tests pass and the session model is documented in `PFM_PROJECT_STATE.md`. Stop and ask permission to proceed to milestone 03.
