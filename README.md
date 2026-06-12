# PFM App — Phased Codex Milestone Pack

This pack reorganizes the project into **one Markdown file per milestone**. Each milestone file contains its own smaller phases. Run only one phase in each Codex session.

## Copy into the repository

Copy these files into the root of `pfm-app`:

```text
AGENTS.md
PFM_PROJECT_STATE.md
RUN_COMMANDS.md
milestones/
```

## Working model

```text
One project
└── One milestone branch
    ├── One Codex run for phase NN.1
    ├── One Codex run for phase NN.2
    ├── ...
    └── One Codex run for phase NN.V verification
```

Each phase must stop after tests pass and request approval before the next phase.

## Start here

```bash
git checkout main
git pull
git checkout -b milestone/00-discovery-architecture

codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/00_DISCOVERY_ARCHITECTURE.md. Execute only phase 00.1. Follow its stop condition exactly."
```

After phase 00.1 passes, approve phase 00.2 and run:

```bash
codex "Read AGENTS.md, PFM_PROJECT_STATE.md, and milestones/00_DISCOVERY_ARCHITECTURE.md. Execute only phase 00.2. Follow its stop condition exactly."
```

Use `RUN_COMMANDS.md` for all commands and recommended Codex model settings.
