# PFM App — Codex Milestone Agent Pack

Use this pack to rebuild the `pfm-app` backend in Python FastAPI and then connect the existing Next.js frontend to real server data.

## How to use this pack

1. Copy this folder into the repository root.
2. Keep `PFM_PROJECT_STATE.md` in the repository root. Every Codex agent must read and update it.
3. Run exactly one milestone agent at a time, starting with `agents/00_DISCOVERY_ARCHITECTURE.md`.
4. Start each milestone from the latest passed milestone branch. Create a new branch using the branch name defined in that agent file.
5. Let the agent think, execute, test, fix failures, update `PFM_PROJECT_STATE.md`, and stop.
6. Review the milestone result. Push the milestone branch yourself or explicitly tell Codex to push it.
7. Grant permission before running the next milestone agent.

Do not paste every milestone into one Codex session. The point of the pack is to prevent repeated architecture reasoning and to keep each session bounded.

## Recommended Codex setup

| Milestone | Model | Reasoning | Speed |
|---|---|---:|---|
| 00 — Discovery and architecture | GPT-5.5 | Extra High | Standard |
| 01 — FastAPI foundation | GPT-5.5 | High | Standard |
| 02 — Authentication and users | GPT-5.5 | High | Standard |
| 03 — Core finance ledger | GPT-5.5 | High | Standard |
| 04 — Budgets and savings goals | GPT-5.5 | High | Standard |
| 05 — Reports and analytics | GPT-5.5 | High | Standard |
| 06 — Recurring jobs and outbox | GPT-5.5 | High | Standard |
| 07 — Receipts, notifications, and SSE | GPT-5.5 | High | Standard |
| 08 — Frontend integration | GPT-5.5 | High | Standard |
| 09 — Quality, CI, deployment, and docs | GPT-5.5 | High | Standard |
| 10 — Final audit | GPT-5.5 | High | Standard |

Use Fast speed only for a small follow-up fix after a milestone agent has already established the context.

## Files

- `PFM_PROJECT_STATE.md`: persistent project memory and architecture contract.
- `AGENTS.md`: global rules that apply to every milestone.
- `agents/00_DISCOVERY_ARCHITECTURE.md`: inspect the real repository and finalize the implementation map.
- `agents/01_FASTAPI_FOUNDATION.md`: replace the Express scaffold with a production-oriented FastAPI foundation.
- `agents/02_AUTH_USERS.md`: users, sessions, secure authentication, and authorization boundaries.
- `agents/03_CORE_FINANCE_LEDGER.md`: accounts, categories, transactions, transfers, and balances.
- `agents/04_BUDGETS_SAVINGS.md`: budgets, savings goals, and progress calculations.
- `agents/05_REPORTS_ANALYTICS.md`: dashboard summaries, charts, reports, and query performance.
- `agents/06_RECURRING_OUTBOX.md`: recurring transactions, worker execution, idempotency, and domain events.
- `agents/07_RECEIPTS_NOTIFICATIONS_SSE.md`: uploads, email adapters, notifications, and real-time server push.
- `agents/08_FRONTEND_INTEGRATION.md`: replace placeholder UI data with typed API data while preserving the frontend design.
- `agents/09_QUALITY_CI_DEPLOYMENT.md`: hardening, CI, deployment configuration, and README correction.
- `agents/10_FINAL_AUDIT.md`: complete end-to-end audit without adding scope.

## Core architecture decision

Build a **modular monolith**, not microservices. PostgreSQL is the source of truth. FastAPI exposes a versioned REST API under `/api/v1`. FastAPI's OpenAPI schema is used to generate TypeScript client types for the Next.js frontend. A separate worker process handles recurring and deferred work. Server-Sent Events are added only for one-way server-to-client updates such as notifications or synchronization hints. WebSockets are not the default because the current product does not require bidirectional real-time messaging.

## Integration keys

Do not request third-party credentials during early milestones. Ask only when the relevant milestone is reached. The implementation must support local-development adapters so work can continue without paid services.
