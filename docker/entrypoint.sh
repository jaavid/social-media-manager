#!/bin/sh
set -eu

cd /app/backend

mkdir -p /app/backend/media /app/backend/staticfiles
chown -R socialstats:socialstats /app/backend/media /app/backend/staticfiles

python manage.py migrate --noinput
python manage.py collectstatic --noinput

exec "$@"
