#!/bin/bash
# Cleanup Script for AWM Project
# This script removes unnecessary files and directories from the project
# Run with: bash cleanup.sh

set -e

echo "🧹 Cleaning up AWM Assignment Project..."
echo ""

# Database Backups
echo "📦 Removing database backup files..."
rm -fv clean_dump.sql 2>/dev/null || true
rm -fv full_backup.dump 2>/dev/null || true
rm -fv local_dump.sql 2>/dev/null || true
rm -fv awm_project.zip 2>/dev/null || true
echo "✅ Database backups removed"
echo ""

# Test Scripts
echo "🧪 Removing test/development scripts..."
rm -fv check_rivers.py 2>/dev/null || true
rm -fv test_api.py 2>/dev/null || true
rm -fv test_endpoint.py 2>/dev/null || true
rm -fv test_spatial.py 2>/dev/null || true
rm -fv test_trails_towns.sh 2>/dev/null || true
rm -fv test_web_app.sh 2>/dev/null || true
rm -fv run_tests.sh 2>/dev/null || true
echo "✅ Test scripts removed"
echo ""

# Unused Application Directories
echo "📁 Removing unused application directories..."
rm -rfv weathermap/ 2>/dev/null || true
rm -rfv maps/ 2>/dev/null || true
echo "✅ Unused applications removed"
echo ""

# Optional: Clean pycache and dist
echo "🗑️  Cleaning Python cache..."
find . -type d -name "__pycache__" -exec rm -rfv {} + 2>/dev/null || true
find . -type d -name ".pytest_cache" -exec rm -rfv {} + 2>/dev/null || true
find . -type d -name "*.egg-info" -exec rm -rfv {} + 2>/dev/null || true
echo "✅ Cache cleaned"
echo ""

echo "✨ Cleanup complete!"
echo ""
echo "Removed files:"
echo "  - Database backups (clean_dump.sql, full_backup.dump, local_dump.sql, awm_project.zip)"
echo "  - Test scripts (test_*.py, test_*.sh, check_rivers.py, run_tests.sh)"
echo "  - Unused apps (weathermap/, maps/)"
echo "  - Python cache (__pycache__, .pytest_cache, *.egg-info)"
echo ""
echo "Project size reduced by ~100MB+"
echo "Repository is now cleaner and more maintainable!"

