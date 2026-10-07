#!/usr/bin/env bash
set -euo pipefail
TASK_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$TASK_ROOT"
# Existing .env, PostgreSQL and media volumes are preserved.
test -f .env || { echo "Create .env from .env.example before deployment" >&2; exit 1; }
docker compose up -d --build
docker compose ps

# Do not report a successful deployment until the public ingress, supervised
# processes, and registry-driven provider contracts are ready. OAuth readiness
# is intentionally informational: a deployment may enable only some providers.
for attempt in $(seq 1 30); do
  if curl --fail --silent --show-error http://localhost:${APP_PORT:-3000}/healthz >/dev/null; then
    break
  fi
  if [ "$attempt" -eq 30 ]; then
    echo "Deployment health check did not become ready" >&2
    docker compose logs --tail=100 app >&2
    exit 1
  fi
  sleep 2
done

docker compose exec -T app supervisorctl status
docker compose exec -T app python manage.py check --deploy
docker compose exec -T app python manage.py check_platform_config
docker compose exec -T app python manage.py check_provider_conformance
docker compose exec -T app python manage.py check_oauth_readiness
docker compose exec -T app python manage.py check_deployment_runtime
