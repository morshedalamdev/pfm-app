# PFM Server

FastAPI backend scaffold for the PFM app.

## Local setup

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e ".[dev,test]"
```

## Phase 01.1 checks

```bash
python -m compileall app
python -m pytest --collect-only
ruff check .
ruff format --check .
```

## Local PostgreSQL

Create a local development database without embedding credentials:

```bash
createuser pfm_app
createdb --owner=pfm_app pfm_app
```

Then set:

```bash
DATABASE_URL=postgresql+asyncpg://pfm_app@localhost:5432/pfm_app
```
