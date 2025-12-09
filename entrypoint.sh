#!/bin/bash
set -e

echo "Starting Stay and Trek service..."

# Run migrations
echo "Running Django migrations..."
python manage.py migrate --no-input

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Start gunicorn
echo "Starting gunicorn..."
exec gunicorn --bind 0.0.0.0:${PORT:-8080} --workers 4 webmapping_project.wsgi:application
