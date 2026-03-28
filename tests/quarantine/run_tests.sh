#!/bin/bash
# Simple test runner script

echo "🧪 Running Django Tests..."
echo "=========================="

# Activate virtual environment
source /Users/aaronbaggot/Desktop/awm_assignment/.venv/bin/activate

# Navigate to project root
cd /Users/aaronbaggot/Desktop/awm_assignment

# Set environment variables for Docker backend
export DJANGO_SETTINGS_MODULE=webmapping_project.settings
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/trails_db"

echo "✅ Environment configured"
echo ""
echo "Running model tests..."
python manage.py test trails_api.tests.test_model -v 2

echo ""
echo "Running API tests..."
python manage.py test trails_api.tests.test_api -v 2

echo ""
echo "✅ Tests complete!"
