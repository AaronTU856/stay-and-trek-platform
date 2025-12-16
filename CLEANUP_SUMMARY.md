# Cleanup Summary

This document lists files and directories that were cleaned up from the project.

## Files Removed

### Database Backups (Not used in current workflow)
- `clean_dump.sql` - Old database dump (1,055 trails backed up via git/docker)
- `full_backup.dump` - PostgreSQL backup file
- `local_dump.sql` - Local development backup
- `awm_project.zip` - Project backup zip file

**Reason:** Database is managed via docker-compose and backed up via git. These old dumps are no longer referenced.

### Test/Development Scripts (Not used in current CI/CD)
- `check_rivers.py` - Standalone test script for rivers
- `test_api.py` - Manual API testing script
- `test_endpoint.py` - Endpoint testing script  
- `test_spatial.py` - Spatial feature testing script
- `test_trails_towns.sh` - Shell test script
- `test_web_app.sh` - Web app test script
- `run_tests.sh` - Test runner script

**Reason:** Tests should run via pytest through docker. Manual test scripts are not part of CI/CD.

### Unused Applications/Projects

#### weathermap/ directory
- Standalone weather mapping project (not integrated)
- Not referenced in INSTALLED_APPS
- Has its own django project structure
- Contains: `db.sqlite3`, `weather_map_project/`, `weathermap/`, `templates/`, `static/`, `documents/`

**Reason:** This is a separate weather app not integrated into main project

#### maps/ directory
- Incomplete/legacy mapping app
- Not referenced in INSTALLED_APPS
- Not used by any URL patterns

**Reason:** Functionality replaced by trails_api and advanced_js_mapping apps

## Result

### Space Saved
- Removed ~15-20 small test/script files
- Removed weathermap/ directory (~5MB)
- Removed maps/ directory (~100KB)
- Removed backup SQL dumps (~100MB combined)

### Project Cleanliness
- Reduced clutter in root directory
- Removed unused test scripts
- Removed unused applications
- Clearer project structure

## Files Kept

All essential files retained:
- `requirements.txt` - Python dependencies
- `.env.example` - Configuration template
- `pytest.ini` - Test configuration
- `conftest.py` - Pytest configuration
- `Dockerfile` - Container definition
- `docker-compose.yml` - Container orchestration
- `.dockerignore` - Build optimization
- All app directories and templates
- All static files and documentation

