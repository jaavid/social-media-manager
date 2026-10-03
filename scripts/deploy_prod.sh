#!/usr/bin/env bash
set -euo pipefail
TASK_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$TASK_ROOT"
# Existing .env, PostgreSQL and media volumes are preserved.
test -f .env || { echo "Create .env from .env.example before deployment" >&2; exit 1; }
docker compose up -d --build
docker compose ps
