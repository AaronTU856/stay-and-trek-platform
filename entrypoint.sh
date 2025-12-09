#!/bin/bash
set -e

echo "Starting Stay and Trek service..."

# Skip migrations if database already populated
# Migrations will timeout on Cloud Run startup
# Database is pre-populated via Cloud SQL import

# Collect static files  
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Start gunicorn
echo "Starting gunicorn..."
exec gunicorn --bind 0.0.0.0:${PORT:-8080} --workers 4 webmapping_project.wsgi:application
