#!/bin/bash
set -e

echo "Starting Stay and Trek service..."

# 1. Collect static files (optional here, since Dockerfile already does it)
python manage.py collectstatic --noinput

# 2. Run migrations (Essential for your database updates)
python manage.py migrate --noinput

# 3. Start Gunicorn ON THE CORRECT PORT
# We use $PORT so Google Cloud can tell Django where to listen.
echo "Starting Gunicorn on port $PORT..."
exec gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 8 --timeout 0 webmapping_project.wsgi:application

