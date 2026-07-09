FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN addgroup --system pfm && adduser --system --ingroup pfm pfm

COPY pyproject.toml README.md ./
COPY alembic.ini ./
COPY alembic ./alembic
COPY app ./app
COPY scripts ./scripts

RUN python -m pip install --upgrade pip \
    && python -m pip install . \
    && python -m compileall app \
    && chmod +x scripts/start.sh

USER pfm

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\", \"8000\")}/api/v1/health/live', timeout=3).read()"

CMD ["./scripts/start.sh"]
