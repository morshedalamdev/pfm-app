# Milestone 09 Agent — Quality, CI, Deployment, and Documentation

- Branch: `quality-ci-deployment`
- Commit: `milestone(09): harden CI deployment and documentation`

## Required workflow

Follow `AGENTS.md` exactly. Read `PFM_PROJECT_STATE.md` first. Work only on this milestone. Think, execute, run the required tests, fix failures until they pass, update `PFM_PROJECT_STATE.md`, commit the milestone, report exact results, and stop. Ask permission before starting the next milestone.

## Objective

Harden the complete application for repeatable local development, CI validation, and portable deployment.

## Tasks

1. Ask the user for the intended production API hosting platform and production domain topology only when needed. Keep the deployment portable.
2. Add or refine:
   - backend Dockerfile;
   - local Docker Compose support where useful without breaking the user's locally installed PostgreSQL workflow;
   - worker start command;
   - production environment variable documentation;
   - database migration deployment procedure;
   - health and readiness integration;
   - logging and error reporting expectations;
   - CORS and cookie production settings;
   - upload storage configuration;
   - email provider configuration.
3. Add GitHub Actions or equivalent CI checks for backend lint, format, typing, tests, migrations, client build, and available frontend checks.
4. Add coverage reporting where practical and record critical untested areas.
5. Add security-oriented tests for authorization boundaries, token handling, unsafe upload attempts, and common validation failures.
6. Update the root README completely:
   - remove obsolete Nest.js, Express, Prisma, TypeORM, Netlify API, and Node server instructions;
   - document FastAPI, PostgreSQL, SQLAlchemy, Alembic, worker, OpenAPI-generated frontend contract, local setup, tests, migrations, and deployment;
   - distinguish implemented features from deferred roadmap items.
7. Confirm `.gitignore` excludes secrets, Python caches, virtual environments, local uploads, coverage, and build artifacts.

## Tests

Run the full backend and frontend suites plus the CI workflow locally where feasible. Verify a clean setup from documented commands using a disposable environment.

## Completion gate

Stop after documentation, CI, and deployment checks pass. Ask permission to proceed to milestone 10.
