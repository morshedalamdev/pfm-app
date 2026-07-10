# Baseline Test Report

## Date

2026-07-10

## Branch

`feature/pfm-audit-before-ui-domain-updates`

## Commands Run

- `cd server && PATH="$PWD/.venv/bin:$PATH" ruff check .`
- `cd server && PATH="$PWD/.venv/bin:$PATH" ruff format --check .`
- `cd server && PATH="$PWD/.venv/bin:$PATH" mypy app`
- `cd server && PATH="$PWD/.venv/bin:$PATH" pytest -q`
- `cd client && npm run build`
- `cd client && npm run lint --if-present`
- `cd client && npm run test --if-present`
- `cd client && npm run api:check`
- `cd client && npm run e2e`

## Passing Checks

- Backend lint passed: `ruff check .`
- Backend format check passed: `157 files already formatted`.
- Backend type check passed: `mypy app`.
- Backend tests passed after approved rerun: `167 passed, 1 warning`.
- Frontend production build passed after approved rerun.
- Frontend optional lint command passed as no-op because no `lint` script exists.
- Frontend optional test command passed as no-op because no unit `test` script exists.
- API contract check passed: generated API contract is up to date.
- Full-stack E2E passed after approved rerun: `1 passed`.

## Failing Checks

- No app baseline checks are failing.
- Sandboxed `pytest -q` failed before approval because the disposable PostgreSQL fixture could not bind `127.0.0.1`.
- Sandboxed `npm run build` failed before approval because Next.js could not fetch the configured Google-hosted Urbanist font.
- Sandboxed `npm run e2e` failed before approval because the runner could not bind `127.0.0.1`.

## Fixed Issues

- None. Phase 00.5 did not require baseline code fixes.

## Known Existing Issues

- `client/package.json` still contains stale metadata keywords `api`, `express`, and `typescript`; this is metadata only and no Node/Express backend was found.
- `client` has no real `lint` or unit `test` scripts.
- Backend test output includes one existing Starlette/httpx deprecation warning from FastAPI TestClient import behavior.
- Local sandbox requires approvals for localhost-bound test harnesses and Google font network fetches.
- `AGENT.md` remains modified in the working tree from before this phase and was not staged or committed by Agent 00 phase work.

## Safe Starting Point for Agent 01

- The repository structure, frontend UI/routes, data/state/domain behavior, and future-agent checklist are documented in `docs/audit/`.
- The branch `feature/pfm-audit-before-ui-domain-updates` contains Agent 00 phase commits through 00.5.
- The current baseline verification passed for backend lint/format/type/tests, frontend build, API contract, and full-stack E2E.
- No requested product feature changes were implemented by Agent 00.
