# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS frontend-build
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
# package.json currently contains newer safe dependency ranges than the checked-in
# lockfile. npm install reconciles them during the image build; switch back to
# npm ci once package-lock.json is regenerated and committed.
RUN npm install --no-audit --no-fund
COPY frontend/ ./
ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
RUN CI=true npm run build

FROM python:3.12-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DJANGO_SETTINGS_MODULE=dashboard.settings

RUN apt-get update && apt-get install -y --no-install-recommends \
      nginx supervisor curl \
      libpq5 libpango-1.0-0 libpangoft2-1.0-0 libcairo2 libgdk-pixbuf-2.0-0 \
      fonts-dejavu-core shared-mime-info ffmpeg \
      gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend
COPY backend/requirements.txt ./requirements.txt
RUN pip install -r requirements.txt \
    && apt-get purge -y gcc libpq-dev \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

COPY backend/ /app/backend/
COPY --from=frontend-build /src/frontend/build/ /usr/share/nginx/html/
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/socialstats.conf
COPY docker/entrypoint.sh /usr/local/bin/socialstats-entrypoint

RUN rm -f /etc/nginx/sites-enabled/default \
    && chmod +x /usr/local/bin/socialstats-entrypoint \
    && useradd --system --uid 999 --create-home --home-dir /home/socialstats socialstats \
    && mkdir -p /app/backend/media /app/backend/staticfiles /var/log/supervisor \
    && chown -R socialstats:socialstats /app/backend/media /app/backend/staticfiles /home/socialstats

RUN SECRET_KEY=build-only DEBUG=True python manage.py collectstatic --noinput

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://127.0.0.1/healthz || exit 1

ENTRYPOINT ["/usr/local/bin/socialstats-entrypoint"]
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]
