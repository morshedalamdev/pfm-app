# Milestone 00 Agent — Discovery and Architecture Baseline

- Branch: `discovery-architecture`
- Commit: `milestone(00): record verified architecture baseline`
- Implementation permission: documentation and baseline-only changes. Do not build product features.

## Required workflow

Follow `AGENTS.md` exactly. Read `PFM_PROJECT_STATE.md` first. Work only on this milestone. Think, execute, run the required tests, fix failures until they pass, update `PFM_PROJECT_STATE.md`, commit the milestone, report exact results, and stop. Ask permission before starting the next milestone.

## Objective

Inspect the real local repository thoroughly and convert the prefilled architecture into a verified implementation map. The result must allow later agents to work without repeatedly re-evaluating the whole project.

## Tasks

1. Read `README.md`, `AGENTS.md`, and `PFM_PROJECT_STATE.md`.
2. Inspect the complete repository tree, Git status, active branch, remotes, ignored files, environment templates, package manifests, and any existing tests.
3. Inspect every frontend route, major component, form, chart, modal, state store, fixture, constant, and API helper. Build a UI-to-API inventory.
4. Inspect the existing `server/` directory. Confirm whether it contains only scaffold code or meaningful implementation that must be preserved, archived, or translated conceptually.
5. Run the existing frontend build and any present lint/test commands. Run any existing server checks that are currently valid. Do not hide failures.
6. Compare the current UI with the proposed data model in `PFM_PROJECT_STATE.md`. Adjust the proposed model only when the actual UI or product requirements justify it.
7. Write or update the following sections in `PFM_PROJECT_STATE.md`:
   - verified repository tree summary;
   - screen inventory;
   - UI-to-endpoint matrix;
   - confirmed server replacement approach;
   - confirmed local development commands;
   - corrected deferred questions;
   - baseline test results;
   - milestone status and progress log.
8. Add `docs/architecture/SYSTEM_DESIGN.md` containing:
   - product scope;
   - modular-monolith diagram in Mermaid;
   - request flow;
   - worker/outbox flow;
   - authentication flow;
   - data ownership boundaries;
   - deployment topology for local and production;
   - explicit non-goals.
9. Add `docs/architecture/UI_API_MATRIX.md` with every screen, visible data source, mutation, report query, loading state, empty state, and error state.

## Questions allowed

Ask the user only after inspection, and only when the answer changes the design now. Confirm the default base currency and whether MVP requires multiple currencies. Record defaults when the user does not answer.

## Tests

Run all available existing checks. At minimum:

```bash
cd client
npm install
npm run build
npm run lint --if-present
npm run test --if-present
```

For the existing server, run only commands that are valid for its current scaffold and record the result.

## Completion gate

Do not implement FastAPI in this milestone. Finish only when the repository inventory, architecture document, UI/API matrix, and baseline test report are recorded. Stop and ask permission to proceed to milestone 01.
