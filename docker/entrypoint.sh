#!/bin/sh
set -eu

cd /app/backend

mkdir -p /app/backend/media /app/backend/staticfiles
# No root bootstrap or recursive chown: new named volumes inherit image UID.
# Existing/bind-mounted media must be provisioned for UID/GID 999 by the operator.
for path in /app/backend/media /app/backend/staticfiles /run/socialstats /var/cache/nginx; do
    if [ ! -w "$path" ]; then
        echo "Runtime path is not writable by UID/GID 999: $path" >&2
        exit 1
    fi
done

python manage.py migrate --noinput
python manage.py collectstatic --noinput

exec "$@"
