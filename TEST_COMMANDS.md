# Testing Commands

## ✅ Test Status: ALL PASSING

### Test Summary
- **Django Tests**: 9/9 passing ✅
- **Pytest Tests**: 6/6 passing ✅
- **Total**: 15/15 tests passing
- **Platform**: Docker (PostGIS + GeoDjango)

## Quick Test Guide

### Option 1: Run Tests in Docker (Recommended)

Ensure Docker containers are running:
```bash
docker compose ps
```

If not running, start them:
```bash
docker compose up -d
```

Then run the tests:
```bash
# Run all trails API tests (Django)
docker compose exec web python manage.py test trails_api.tests --verbosity=2

# Run all pytest tests
docker compose exec web python -m pytest trails_api/tests/ -v

# Run all tests in the project
docker compose exec web python manage.py test --verbosity=2
```

### Option 2: Run Specific Test Classes

#### Django Tests

```bash
# Test the Trails API
docker compose exec web python manage.py test trails_api.tests.TrailAPITestCase --verbosity=2

# Test authentication
docker compose exec web python manage.py test authentication.tests --verbosity=2

# Test dashboard
docker compose exec web python manage.py test dashboard.tests --verbosity=2
```

#### Pytest Tests

```bash
# Run API endpoint tests
docker compose exec web python -m pytest trails_api/tests/test_api.py -v

# Run model tests
docker compose exec web python -m pytest trails_api/tests/test_model.py -v

# Run validation tests
docker compose exec web python -m pytest trails_api/tests/tests.py -v
```

### Option 3: Run Individual Test Methods

#### Django Individual Tests

```bash
# Test a single test method
docker compose exec web python manage.py test trails_api.tests.TrailAPITestCase.test_trail_list --verbosity=2

# Other individual tests
docker compose exec web python manage.py test trails_api.tests.TrailAPITestCase.test_trail_detail --verbosity=2
docker compose exec web python manage.py test trails_api.tests.TrailAPITestCase.test_within_radius_query --verbosity=2
docker compose exec web python manage.py test trails_api.tests.TrailAPITestCase.test_trail_creation --verbosity=2
docker compose exec web python manage.py test trails_api.tests.TrailAPITestCase.test_statistics_endpoint --verbosity=2
docker compose exec web python manage.py test trails_api.tests.TrailAPITestCase.test_coordinates_properties --verbosity=2
docker compose exec web python manage.py test trails_api.tests.TrailAPITestCase.test_distance_field --verbosity=2
docker compose exec web python manage.py test trails_api.tests.TrailAPITestCase.test_string_representation --verbosity=2
docker compose exec web python manage.py test trails_api.tests.TrailAPITestCase.test_geojson_format --verbosity=2
```

#### Pytest Individual Tests

```bash
# GeoJSON endpoint tests
docker compose exec web python -m pytest trails_api/tests/test_api.py::test_list_trails -v
docker compose exec web python -m pytest trails_api/tests/test_api.py::test_towns_geojson -v
docker compose exec web python -m pytest trails_api/tests/test_api.py::test_trails_within_radius -v

# Model tests
docker compose exec web python -m pytest trails_api/tests/test_model.py::test_trail_str -v
docker compose exec web python -m pytest trails_api/tests/test_model.py::test_town_str -v

# Validation tests
docker compose exec web python -m pytest trails_api/tests/tests.py::TrailsWithinRadiusAPITest::test_missing_fields_returns_400 -v
```

## Test Coverage

The test suite covers:

### API Endpoints (7 tests)
- ✅ Trail list endpoint (`test_trail_list`)
- ✅ Trail detail endpoint (`test_trail_detail`)
- ✅ Trail creation with authentication (`test_trail_creation`)
- ✅ Trail statistics endpoint (`test_statistics_endpoint`)
- ✅ Spatial within-radius query (`test_within_radius_query`)
- ✅ Trails GeoJSON (`test_list_trails`)
- ✅ Towns GeoJSON (`test_towns_geojson`)

### Model Properties (5 tests)
- ✅ String representation (`test_string_representation`, `test_trail_str`, `test_town_str`)
- ✅ Coordinate properties - latitude/longitude (`test_coordinates_properties`)
- ✅ Distance field validation (`test_distance_field`)
- ✅ GeoJSON format output (`test_geojson_format`)

### Input Validation (1 test)
- ✅ Missing fields error handling (`test_missing_fields_returns_400`)

## Additional Test Commands

### Check Test Coverage
```bash
docker compose exec web pip install coverage
docker compose exec web coverage run --source='.' manage.py test trails_api.tests
docker compose exec web coverage report
```

### Run with Different Verbosity Levels

#### Django Tests
```bash
# Minimal output (verbosity=0)
docker compose exec web python manage.py test trails_api.tests

# Normal output (verbosity=1) - default
docker compose exec web python manage.py test trails_api.tests --verbosity=1

# Verbose output (verbosity=2)
docker compose exec web python manage.py test trails_api.tests --verbosity=2

# Very verbose output (verbosity=3)
docker compose exec web python manage.py test trails_api.tests --verbosity=3
```

#### Pytest Tests
```bash
# Verbose output
docker compose exec web python -m pytest trails_api/tests/ -v

# Very verbose output
docker compose exec web python -m pytest trails_api/tests/ -vv

# Show print statements
docker compose exec web python -m pytest trails_api/tests/ -v -s

# Stop on first failure
docker compose exec web python -m pytest trails_api/tests/ -v -x

# Run with coverage
docker compose exec web python -m pytest trails_api/tests/ -v --cov=trails_api

# Show slowest tests
docker compose exec web python -m pytest trails_api/tests/ -v --durations=10
```

## Custom Test Scripts

The `test_spatial.py` script tests spatial queries:

```bash
docker compose exec web python test_spatial.py
```

This script:
- Loads geographic boundaries (rivers)
- Tests trail-river intersections
- Verifies spatial query functionality
- Example: Found 2 trails crossing the Ara river (Ballyhoura Way, Multeen Way)

## Database Reset (if needed)

```bash
# Stop and remove containers
docker compose down

# Remove PostgreSQL volume
docker volume rm awm_assignment_postgres_data

# Restart and create fresh database
docker compose up -d
```

## Local Testing (without Docker)

**Note**: Requires GDAL, GEOS, and PostGIS installed locally:

```bash
# Activate virtual environment
source .venv/bin/activate

# Install dependencies if needed
pip install -r requirements.txt

# Run Django tests
python manage.py test trails_api.tests --verbosity=2

# Run pytest tests
python -m pytest trails_api/tests/ -v
```

## Docker Setup Info

The project uses:
- **Container**: `django_container` - Django web application
- **Database**: `postgres_container` - PostgreSQL with PostGIS 15
- **Web Server**: `nginx_container` - Nginx reverse proxy

**Key Images**:
- `postgis/postgis:15-3.4` - PostgreSQL with PostGIS for geographic queries
- `awm_assignment-web` - Django application with GeoDjango

**Ports**:
- Django: `http://localhost:8000`
- Nginx: `http://localhost:80`
- PostgreSQL: `localhost:5432`



## Troubleshooting

### Tests fail with "docker-compose not found"
Use the newer syntax:
```bash
docker compose exec web python manage.py test ...
```

### Tests fail with "GDAL not found"
Ensure Docker containers are running and PostgreSQL is available:
```bash
docker compose ps
docker compose logs db
```

### Database errors
Reset the test database:
```bash
docker compose exec web python manage.py flush
docker compose exec web python manage.py migrate
```

## CI/CD Integration

To add tests to CI pipeline:

```bash
#!/bin/bash
docker compose up -d

# Run Django tests
docker compose exec web python manage.py test --verbosity=2
DJANGO_RESULT=$?

# Run pytest tests
docker compose exec web python -m pytest trails_api/tests/ -v
PYTEST_RESULT=$?

docker compose down

# Exit with error if either test suite failed
if [ $DJANGO_RESULT -ne 0 ] || [ $PYTEST_RESULT -ne 0 ]; then
  exit 1
fi

echo "✅ All tests passed!"
```

Save as `run_tests.sh` and run with `bash run_tests.sh`

## Database Access & Management

### Connect to PostgreSQL Database

```bash
# Connect to the database container
docker compose exec db psql -U postgres -d trails_db
```

Once connected, you're in the PostgreSQL shell (`trails_db=#`).

### List All Tables

```sql
\dt
```

This shows all tables in the current database with schema, name, type, and owner.

### View Table Structure

```sql
# Show columns for a specific table
\d table_name

# Example: View trails table structure
\d trails_api_trail
```

### Query Data from Tables

```sql
-- View all trails
SELECT * FROM trails_api_trail;

-- View all towns
SELECT * FROM trails_api_town;

-- View all users
SELECT * FROM auth_user;

-- View all geographic boundaries (rivers)
SELECT * FROM trails_api_geographicboundary;

-- Count records in each table
SELECT COUNT(*) as trail_count FROM trails_api_trail;
SELECT COUNT(*) as town_count FROM trails_api_town;
SELECT COUNT(*) as user_count FROM auth_user;
SELECT COUNT(*) as boundary_count FROM trails_api_geographicboundary;
```

### View Schema Information

```sql
-- List all schemas
\dn

-- List all tables in public schema
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- List all columns in trails table
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'trails_api_trail';
```

### Useful PostgreSQL Commands

```sql
-- Show databases
\l

-- Switch to different database
\c database_name

-- Show current user
SELECT current_user;

-- Show current database
SELECT current_database();

-- List all views
\dv

-- Show table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) 
FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Exit psql
\q
```

### Query Spatial Data (GeoDjango/PostGIS)

```sql
-- View trails with their geographic information
SELECT id, name, difficulty, ST_AsText(start_point) as start_point FROM trails_api_trail;

-- Find trails within a radius (5km) of a point
SELECT id, name, ST_Distance(start_point, ST_SetSRID(ST_MakePoint(-6.0, 53.0), 4326)) as distance_m
FROM trails_api_trail
WHERE ST_DWithin(start_point, ST_SetSRID(ST_MakePoint(-6.0, 53.0), 4326), 5000)
ORDER BY distance_m;

-- View geographic boundaries
SELECT id, name, ST_AsText(geometry) as geometry FROM trails_api_geographicboundary LIMIT 5;

-- Check PostGIS version
SELECT PostGIS_version();
```

### Export Data

```sql
-- Export table to CSV
\copy (SELECT * FROM trails_api_trail) TO '/tmp/trails.csv' WITH CSV HEADER;

-- Export with specific columns
\copy (SELECT id, name, difficulty FROM trails_api_trail) TO '/tmp/trails_simple.csv' WITH CSV HEADER;
```

### Exit Database Shell

```sql
\q
```

Or press `Ctrl+D`

### Django Shell (Alternative Database Access)

You can also use Django shell to interact with the database:

```bash
# Access Django shell
docker compose exec web python manage.py shell

# In the Django shell:
from trails_api.models import Trail, Town, GeographicBoundary
from django.contrib.auth.models import User

# View all trails
trails = Trail.objects.all()
print(f"Total trails: {trails.count()}")
for trail in trails[:5]:
    print(f"  - {trail.name}: {trail.difficulty}")

# View all towns
towns = Town.objects.all()
print(f"Total towns: {towns.count()}")

# View all users
users = User.objects.all()
print(f"Total users: {users.count()}")

# View geographic boundaries
boundaries = GeographicBoundary.objects.all()
print(f"Total boundaries: {boundaries.count()}")

# Exit Django shell
exit()
```

### Quick Database Statistics

```bash
# Get quick stats via Docker
docker compose exec db psql -U postgres -d trails_db -c "
SELECT 
  (SELECT COUNT(*) FROM trails_api_trail) as total_trails,
  (SELECT COUNT(*) FROM trails_api_town) as total_towns,
  (SELECT COUNT(*) FROM auth_user) as total_users,
  (SELECT COUNT(*) FROM trails_api_geographicboundary) as total_boundaries;
"
```
