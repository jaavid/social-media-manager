# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS frontend-build
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci --no-audit --no-fund
COPY frontend/ ./
ARG NEXT_PUBLIC_API_URL=
ARG REACT_APP_API_URL=/api
ARG NEXT_PUBLIC_SITE_URL=
ARG NEXT_PUBLIC_WS_URL=
ARG NEXT_PUBLIC_PLAUSIBLE_DOMAIN=
ARG NEXT_PUBLIC_PLAUSIBLE_HOST=
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} REACT_APP_API_URL=${REACT_APP_API_URL} \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL} \
    NEXT_PUBLIC_PLAUSIBLE_DOMAIN=${NEXT_PUBLIC_PLAUSIBLE_DOMAIN} \
    NEXT_PUBLIC_PLAUSIBLE_HOST=${NEXT_PUBLIC_PLAUSIBLE_HOST} NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT=standalone
RUN CI=true npm run build \
    && mkdir -p /runtime/frontend/.next /runtime/frontend/src/services /runtime/bin \
    && cp /usr/local/bin/node /runtime/bin/node \
    && cp -a .next/standalone/. /runtime/frontend/ \
    && cp -a .next/static /runtime/frontend/.next/static \
    && cp -a public /runtime/frontend/public \
    && cp src/services/platformCapabilities.json /runtime/frontend/src/services/ \
    && rm -rf .next/cache

FROM python:3.12-slim-bookworm AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DJANGO_SETTINGS_MODULE=dashboard.settings

WORKDIR /app/backend
COPY backend/ /app/backend/
RUN --mount=type=secret,id=proxy_ca \
    apt-get update && apt-get install -y --no-install-recommends \
      nginx supervisor curl libstdc++6 \
      libpq5 libpango-1.0-0 libpangoft2-1.0-0 libcairo2 libgdk-pixbuf-2.0-0 \
      fonts-dejavu-core shared-mime-info ffmpeg gcc libpq-dev \
    && if [ -f /run/secrets/proxy_ca ]; then cat /etc/ssl/certs/ca-certificates.crt /run/secrets/proxy_ca > /tmp/build-ca.pem; export PIP_CERT=/tmp/build-ca.pem; fi \
    && pip install -r requirements.txt \
    && rm -f /tmp/build-ca.pem \
    && apt-get purge -y gcc libpq-dev \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 999 --create-home --home-dir /home/socialstats socialstats \
    && mkdir -p /app/backend/media /app/backend/staticfiles /var/log/supervisor \
    && chown -R socialstats:socialstats /app/backend/media /app/backend/staticfiles /home/socialstats \
    && chmod -R a+rX /app/backend \
    && SECRET_KEY=build-only DEBUG=True python manage.py collectstatic --noinput
# One assembly layer also keeps builds practical on VFS Docker runners, where
# each COPY otherwise duplicates the complete Python/media dependency image.
RUN --mount=from=frontend-build,source=/runtime,target=/runtime,ro \
    --mount=type=bind,source=docs/PLATFORM_SUPPORT.md,target=/tmp/PLATFORM_SUPPORT.md,ro \
    --mount=type=bind,source=docker,target=/tmp/socialstats-docker,ro \
    cp -a /runtime/. /app/ \
    && mkdir -p /app/docs /opt/socialstats-docker \
    && cp /tmp/PLATFORM_SUPPORT.md /app/docs/PLATFORM_SUPPORT.md \
    && cp -a /tmp/socialstats-docker/. /opt/socialstats-docker/ \
    && chown -R 999:999 /app/frontend /app/bin /app/docs \
    && cp /opt/socialstats-docker/nginx.conf /etc/nginx/conf.d/default.conf \
    && cp /opt/socialstats-docker/supervisord.conf /etc/supervisor/conf.d/socialstats.conf \
    && cp /opt/socialstats-docker/entrypoint.sh /usr/local/bin/socialstats-entrypoint \
    && rm -f /etc/nginx/sites-enabled/default \
    && chmod +x /usr/local/bin/socialstats-entrypoint

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://127.0.0.1/healthz || exit 1

ENTRYPOINT ["/usr/local/bin/socialstats-entrypoint"]
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]
