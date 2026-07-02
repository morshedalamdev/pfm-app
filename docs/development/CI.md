# Continuous Integration

The GitHub Actions workflow in `.github/workflows/ci.yml` reproduces the local
quality gates for the FastAPI backend, Next.js frontend, and generated API
contract.

## Backend

Run from `server/` with dependencies installed:

```bash
ruff check .
ruff format --check .
mypy app
pytest -q
alembic upgrade head
```

`pytest -q` uses disposable local PostgreSQL clusters through the test fixture
when PostgreSQL server binaries are available. `alembic upgrade head` needs a
valid `DATABASE_URL`; CI points it at a disposable PostgreSQL service with
test-only credentials.

## Frontend

Run from `client/`:

```bash
npm run build
npm run lint --if-present
npm run test --if-present
```

The current package has no `lint` or `test` scripts, so those commands are
intentional no-ops until real scripts are added.

## API Contract

Run from `client/` after installing backend and frontend dependencies:

```bash
npm run api:check
```

The check exports a fresh FastAPI OpenAPI schema, regenerates TypeScript API
types in a temporary directory, and fails if committed generated artifacts drift.
