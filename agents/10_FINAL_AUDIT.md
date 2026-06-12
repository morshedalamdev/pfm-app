# Milestone 10 Agent — Final End-to-End Audit

- Branch: `final-audit`
- Commit: `milestone(10): complete end-to-end audit`

## Required workflow

Follow `AGENTS.md` exactly. Read `PFM_PROJECT_STATE.md` first. Work only on this milestone. Think, execute, run the required tests, fix failures until they pass, update `PFM_PROJECT_STATE.md`, commit the milestone, report exact results, and stop. Ask permission before starting the next milestone.

## Objective

Audit the finished system. Fix defects, documentation errors, and integration gaps only. Do not introduce new product scope.

## Tasks

1. Read all architecture and state documents.
2. Review the final repository tree for stale Express, Nest.js, Prisma, TypeORM, placeholder-data, secret, and dead-code remnants.
3. Run the full backend, frontend, migration, worker, and end-to-end test suite from a clean environment.
4. Test critical user journeys and ownership isolation manually or through automation.
5. Verify API docs, generated TypeScript contract synchronization, CORS, cookie behavior, worker startup, migration procedure, local adapters, and production configuration documentation.
6. Review the README against actual commands and dependencies.
7. Fix only verified defects.
8. Update `PFM_PROJECT_STATE.md` with a final audit report, passed checks, remaining limitations, and future roadmap candidates clearly marked as deferred.

## Completion gate

Finish only when the final audit report is recorded and all available required tests pass. Report any external deployment validation that could not be executed locally. Stop.
