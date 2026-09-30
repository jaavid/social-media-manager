#!/bin/sh
set -eu

cd /app/backend

mkdir -p /app/backend/media /app/backend/staticfiles /usr/share/nginx/html/static
chown -R socialstats:socialstats /app/backend/media /app/backend/staticfiles

python manage.py migrate --noinput
python manage.py collectstatic --noinput

# React CRA and Django both publish assets under /static/. Nginx serves a
# single static root, so merge collected Django assets (admin, DRF, etc.) into
# the React build's static directory without removing the hashed React files.
cp -a /app/backend/staticfiles/. /usr/share/nginx/html/static/

exec "$@"
