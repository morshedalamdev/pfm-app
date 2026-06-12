# RUN_COMMANDS.md — Codex Settings and Commands

## Codex model setup by milestone

| Milestone | Recommended model | Reasoning | Speed |
|---|---|---|---|
| 00 Discovery and architecture | GPT-5.5 | Extra High for 00.3; High otherwise | Standard |
| 01 FastAPI foundation | GPT-5.5 | High | Standard |
| 02 Authentication and security | GPT-5.5 | Extra High | Standard |
| 03 Finance core | GPT-5.5 | Extra High | Standard |
| 04 Budgets and savings | GPT-5.5 | High | Standard |
| 05 Reports and analytics | GPT-5.5 | Extra High | Standard |
| 06 Recurring worker | GPT-5.5 | Extra High | Standard |
| 07 Integrations and notifications | GPT-5.5 | High | Standard |
| 08 Frontend integration | GPT-5.5 | High | Standard |
| 09 CI, Docker, deployment | GPT-5.5 | High | Standard |
| 10 Final audit | GPT-5.5 | Extra High | Standard |

Use Standard speed for all phases. Do not use Fast speed for schema design, money mutations, security, or deployment work.

## Command template

Run one phase only:

```bash
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/NN_FILE_NAME.md. Execute only phase NN.X. Follow its stop condition exactly. Run required tests, fix failures, update PFM_PROJECT_STATE.md, create the local phase commit, report results, and stop. Ask permission before the next phase."
```

## Branch creation commands

```bash
git checkout main
git pull
git checkout -b milestone/00-discovery-architecture
```

After verification, push only when ready:

```bash
git push -u origin milestone/00-discovery-architecture
```

Merge the PR, update `main`, and create the next milestone branch.

## Exact phase commands

### Milestone 00

```bash
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/00_DISCOVERY_ARCHITECTURE.md. Execute only phase 00.1. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/00_DISCOVERY_ARCHITECTURE.md. Execute only phase 00.2. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/00_DISCOVERY_ARCHITECTURE.md. Execute only phase 00.3. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/00_DISCOVERY_ARCHITECTURE.md. Execute only phase 00.4. Follow its stop condition exactly."
```

### Milestone 01

```bash
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/01_FASTAPI_FOUNDATION.md. Execute only phase 01.1. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/01_FASTAPI_FOUNDATION.md. Execute only phase 01.2. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/01_FASTAPI_FOUNDATION.md. Execute only phase 01.3. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/01_FASTAPI_FOUNDATION.md. Execute only phase 01.4. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/01_FASTAPI_FOUNDATION.md. Execute only phase 01.V. Follow its stop condition exactly."
```

### Milestone 02

```bash
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/02_AUTH_SECURITY.md. Execute only phase 02.1. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/02_AUTH_SECURITY.md. Execute only phase 02.2. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/02_AUTH_SECURITY.md. Execute only phase 02.3. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/02_AUTH_SECURITY.md. Execute only phase 02.4. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/02_AUTH_SECURITY.md. Execute only phase 02.5. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/02_AUTH_SECURITY.md. Execute only phase 02.V. Follow its stop condition exactly."
```

### Milestone 03

```bash
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/03_FINANCE_CORE.md. Execute only phase 03.1. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/03_FINANCE_CORE.md. Execute only phase 03.2. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/03_FINANCE_CORE.md. Execute only phase 03.3. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/03_FINANCE_CORE.md. Execute only phase 03.4. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/03_FINANCE_CORE.md. Execute only phase 03.5. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/03_FINANCE_CORE.md. Execute only phase 03.6. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/03_FINANCE_CORE.md. Execute only phase 03.V. Follow its stop condition exactly."
```

### Milestone 04

```bash
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/04_BUDGETS_SAVINGS.md. Execute only phase 04.1. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/04_BUDGETS_SAVINGS.md. Execute only phase 04.2. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/04_BUDGETS_SAVINGS.md. Execute only phase 04.3. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/04_BUDGETS_SAVINGS.md. Execute only phase 04.4. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/04_BUDGETS_SAVINGS.md. Execute only phase 04.V. Follow its stop condition exactly."
```

### Milestone 05

```bash
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/05_REPORTS_ANALYTICS.md. Execute only phase 05.1. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/05_REPORTS_ANALYTICS.md. Execute only phase 05.2. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/05_REPORTS_ANALYTICS.md. Execute only phase 05.3. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/05_REPORTS_ANALYTICS.md. Execute only phase 05.4. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/05_REPORTS_ANALYTICS.md. Execute only phase 05.5. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/05_REPORTS_ANALYTICS.md. Execute only phase 05.V. Follow its stop condition exactly."
```

### Milestone 06

```bash
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/06_RECURRING_WORKER.md. Execute only phase 06.1. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/06_RECURRING_WORKER.md. Execute only phase 06.2. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/06_RECURRING_WORKER.md. Execute only phase 06.3. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/06_RECURRING_WORKER.md. Execute only phase 06.4. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/06_RECURRING_WORKER.md. Execute only phase 06.5. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/06_RECURRING_WORKER.md. Execute only phase 06.V. Follow its stop condition exactly."
```

### Milestone 07

```bash
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/07_INTEGRATIONS_NOTIFICATIONS.md. Execute only phase 07.1. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/07_INTEGRATIONS_NOTIFICATIONS.md. Execute only phase 07.2. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/07_INTEGRATIONS_NOTIFICATIONS.md. Execute only phase 07.3. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/07_INTEGRATIONS_NOTIFICATIONS.md. Execute only phase 07.4. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/07_INTEGRATIONS_NOTIFICATIONS.md. Execute only phase 07.5. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/07_INTEGRATIONS_NOTIFICATIONS.md. Execute only phase 07.V. Follow its stop condition exactly."
```

### Milestone 08

```bash
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/08_FRONTEND_INTEGRATION.md. Execute only phase 08.1. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/08_FRONTEND_INTEGRATION.md. Execute only phase 08.2. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/08_FRONTEND_INTEGRATION.md. Execute only phase 08.3. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/08_FRONTEND_INTEGRATION.md. Execute only phase 08.4. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/08_FRONTEND_INTEGRATION.md. Execute only phase 08.5. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/08_FRONTEND_INTEGRATION.md. Execute only phase 08.6. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/08_FRONTEND_INTEGRATION.md. Execute only phase 08.V. Follow its stop condition exactly."
```

### Milestone 09

```bash
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/09_CI_DOCKER_DEPLOY.md. Execute only phase 09.1. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/09_CI_DOCKER_DEPLOY.md. Execute only phase 09.2. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/09_CI_DOCKER_DEPLOY.md. Execute only phase 09.3. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/09_CI_DOCKER_DEPLOY.md. Execute only phase 09.4. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/09_CI_DOCKER_DEPLOY.md. Execute only phase 09.5. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/09_CI_DOCKER_DEPLOY.md. Execute only phase 09.V. Follow its stop condition exactly."
```

### Milestone 10

```bash
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/10_FINAL_AUDIT.md. Execute only phase 10.1. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/10_FINAL_AUDIT.md. Execute only phase 10.2. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/10_FINAL_AUDIT.md. Execute only phase 10.3. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/10_FINAL_AUDIT.md. Execute only phase 10.4. Follow its stop condition exactly."
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/10_FINAL_AUDIT.md. Execute only phase 10.V. Follow its stop condition exactly."
```
