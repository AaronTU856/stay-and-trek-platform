#!/bin/bash
set -e

echo "Starting Stay and Trek service..."

# 1. Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# 2. Start Gunicorn in the BACKGROUND (&) on port 8000
# Notice we changed 8080 to 8000 here
echo "Starting Gunicorn on port 8000..."
gunicorn --bind 0.0.0.0:8000 --workers 4 webmapping_project.wsgi:application &

# 3. Start Nginx in the FOREGROUND
# Nginx will listen on 8080 (as defined in your nginx.conf)
echo "Starting Nginx on port 8080..."
nginx -g "daemon off;"