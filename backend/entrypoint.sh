#!/usr/bin/env sh
set -e

# run db migrations before starting the server
echo "running migrations: alembic upgrade head"
alembic upgrade head

# exec so uvicorn becomes PID 1 and receives signals (SIGTERM) directly
echo "starting uvicorn"
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
