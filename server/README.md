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
