#!/bin/sh
set -eu

case "${RUN_MIGRATIONS:-false}" in
    1|true|TRUE|yes|YES)
        alembic upgrade head
        ;;
    0|false|FALSE|no|NO|"")
        ;;
    *)
        echo "RUN_MIGRATIONS must be true or false" >&2
        exit 2
        ;;
esac

exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port "${PORT:-8000}" \
    --proxy-headers
