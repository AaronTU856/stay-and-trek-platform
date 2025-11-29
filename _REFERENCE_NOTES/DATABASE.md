# Database & Infrastructure Guide

## 📊 Quick Database Access

### Connect to PostgreSQL
```bash
docker compose exec db psql -U postgres -d trails_db
```

### List All Tables
```bash
docker compose exec -T db psql -U postgres -d trails_db -c "\dt"
```

---

## 📋 Database Tables & Structure

### Main Tables

| Table | Records | Purpose |
|-------|---------|---------|
| **trails_api_trail** | 1,056 | Hiking trails across Ireland |
| **trails_api_town** | 47 | Irish towns and cities |
| **trails_api_geographicboundary** | 2,758 | Geographic features (rivers, streams) |
| **trails_api_pointofinterest** | 20 | POIs (parking, cafes, viewpoints, shelters) |
| **auth_user** | 1 | User accounts (admin) |

### Supporting Tables

| Table | Purpose |
|-------|---------|
| **django_migrations** | Track database schema changes |
| **django_session** | User session management |
| **django_content_type** | Django content type framework |
| **auth_group** | User group definitions |
| **auth_permission** | Permission definitions |
| **trails_api_trailpoiintersection** | Trail-to-POI relationships |

---

## 🔍 Database Query Commands

### View Sample Trails

```bash
docker compose exec -T db psql -U postgres -d trails_db -c "
SELECT id, trail_name, difficulty, county, distance_km 
FROM trails_api_trail LIMIT 10;"
```

**Sample Output:**
```
 id  |                  trail_name                  | difficulty |       county        | distance_km
-----+----------------------------------------------+------------+---------------------+-------------
  39 | Fastnet Trails - Gubbeen Loop                | easy       | Cork                |        6.50
  48 | Murroe - Nature loop                         | moderate   | Limerick, Tipperary |        4.20
  57 | Murroe - Glenstal Woods loop                 | moderate   | Limerick            |        5.00
  58 | The Skelligs Way                             | moderate   | Kerry               |       10.00
  59 | Reenroe Cliff Walk                           | easy       | Kerry               |        3.50
```

### View Towns with Population

```bash
docker compose exec -T db psql -U postgres -d trails_db -c "
SELECT id, name, town_type, population 
FROM trails_api_town 
ORDER BY population DESC LIMIT 15;"
```

**Sample Output:**
```
 id  |   name    | town_type | population
-----+-----------+-----------+------------
 612 | Dublin    | Urban     |    1173179
 613 | Cork      | Urban     |     222333
 614 | Limerick  | Urban     |      94192
 615 | Galway    | Historic  |      79934
 616 | Waterford | Historic  |      53804
```

### View Geographic Boundaries

```bash
docker compose exec -T db psql -U postgres -d trails_db -c "
SELECT id, name FROM trails_api_geographicboundary LIMIT 15;"
```

**Sample Output:**
```
  id   |      name
-------+-----------------
  9735 | Aughananna
  9736 | Sruhraungloragh
  9737 | Aughavaud River
  9738 | Aughavud River
  9739 | Corbally Stream
  9740 | Carlow-Wicklow
  9741 | Aghalona
```

### View Points of Interest

```bash
docker compose exec -T db psql -U postgres -d trails_db -c "
SELECT id, name, poi_type 
FROM trails_api_pointofinterest;"
```

**Sample Output:**
```
 id |                name                |  poi_type
----+------------------------------------+-------------
  1 | Wicklow Gap Car Park               | parking
  2 | Glendalough Upper Lake Parking     | parking
  3 | Powerscourt Estate Café            | cafe
  4 | Glendalough Visitor Centre         | information
  5 | Powerscourt Waterfall              | viewpoint
```

### Count Records in All Main Tables

```bash
docker compose exec -T db psql -U postgres -d trails_db -c "
SELECT 
  'trails_api_trail' as table_name, COUNT(*) as record_count FROM trails_api_trail
UNION ALL
SELECT 'trails_api_town', COUNT(*) FROM trails_api_town
UNION ALL
SELECT 'trails_api_geographicboundary', COUNT(*) FROM trails_api_geographicboundary
UNION ALL
SELECT 'trails_api_pointofinterest', COUNT(*) FROM trails_api_pointofinterest
UNION ALL
SELECT 'auth_user', COUNT(*) FROM auth_user
ORDER BY table_name;"
```

### View User Accounts

```bash
docker compose exec -T db psql -U postgres -d trails_db -c "
SELECT id, username, email, is_staff, is_superuser 
FROM auth_user;"
```

**Output:**
```
 id | username | email | is_staff | is_superuser
----+----------+-------+----------+--------------
  1 | admin    |       | t        | t
```

### View Trails by Difficulty

```bash
docker compose exec -T db psql -U postgres -d trails_db -c "
SELECT difficulty, COUNT(*) as count 
FROM trails_api_trail 
GROUP BY difficulty 
ORDER BY count DESC;"
```

### Find Trails within Radius (Spatial Query)

```bash
docker compose exec -T db psql -U postgres -d trails_db -c "
SELECT id, trail_name, 
  ST_Distance(start_point, ST_SetSRID(ST_MakePoint(-6.0, 53.0), 4326))/1000 as distance_km
FROM trails_api_trail
WHERE ST_DWithin(start_point, ST_SetSRID(ST_MakePoint(-6.0, 53.0), 4326), 50000)
ORDER BY distance_km LIMIT 10;"
```

### Check PostGIS Version

```bash
docker compose exec -T db psql -U postgres -d trails_db -c "SELECT PostGIS_version();"
```

### Export Table to CSV

```bash
docker compose exec -T db psql -U postgres -d trails_db -c "\copy (SELECT id, trail_name, difficulty, county FROM trails_api_trail) TO '/tmp/trails.csv' WITH CSV HEADER;"
```

---

## 🗄️ PostgreSQL Interactive Shell

### Open Interactive Shell

```bash
docker compose exec db psql -U postgres -d trails_db
```

### Common psql Commands (Once Connected)

```sql
-- List all tables
\dt

-- Describe table structure
\d trails_api_trail

-- List all databases
\l

-- Switch database
\c database_name

-- List schemas
\dn

-- List views
\dv

-- Get table size
SELECT pg_size_pretty(pg_total_relation_size('trails_api_trail'));

-- Exit
\q
```

---

## 🔧 Backend & API Details

### Technology Stack

| Component | Version | Purpose |
|-----------|---------|---------|
| **Python** | 3.11 | Application runtime |
| **Django** | 5.2.7 | Web framework |
| **Django REST Framework** | Latest | REST API framework |
| **GeoDjango** | Built-in | Geographic database queries |
| **PostGIS** | 15-3.4 | Spatial database extension |
| **PostgreSQL** | 15 | Database engine |
| **Nginx** | Latest | Reverse proxy/web server |

### Django Project Structure

```
webmapping_project/
├── settings.py          # Main Django settings
├── urls.py              # URL routing
├── wsgi.py              # WSGI application
├── asgi.py              # ASGI application
└── context_processors.py # Template context

trails_api/             # Main API app
├── models.py            # Trail, Town, POI models
├── views.py             # API views
├── serializers.py       # DRF serializers
├── urls.py              # API URL patterns
└── tests.py             # Test suite
```

### Main Django Apps

| App | Purpose |
|-----|---------|
| **trails_api** | Trail and geographic data API |
| **authentication** | User authentication |
| **dashboard** | Dashboard views |
| **advanced_js_mapping** | Advanced mapping features |
| **maps** | Map locations and test areas |

### Key Django Models

#### Trail Model
```python
class Trail(models.Model):
    trail_name = CharField(max_length=255)
    county = CharField(max_length=255)
    difficulty = CharField(choices=['easy', 'moderate', 'hard'])
    distance_km = DecimalField()
    elevation_gain_m = IntegerField()
    start_point = PointField()  # GeoDjango spatial field
    path = LineStringField()    # Trail path geometry
    description = TextField()
    activity = CharField()
    dogs_allowed = BooleanField()
```

#### Town Model
```python
class Town(models.Model):
    name = CharField(max_length=255)
    location = PointField()  # Geographic center point
    population = IntegerField()
    town_type = CharField()
    area = FloatField()
    elevation_m = IntegerField()
```

#### Geographic Boundary Model
```python
class GeographicBoundary(models.Model):
    name = CharField(max_length=255)
    geometry = GeometryField()  # Can be line, polygon, etc.
```

---

## 🐳 Docker & Infrastructure

### Docker Services

```yaml
Services Running:
├── web (django_container)
│   ├── Image: awm_assignment-web
│   ├── Port: 8000 (Django dev server)
│   ├── Runtime: Python 3.11
│   └── Role: Django application server
│
├── db (postgres_container)
│   ├── Image: postgis/postgis:15-3.4
│   ├── Port: 5432
│   ├── Database: trails_db
│   ├── User: postgres
│   └── Role: PostgreSQL + PostGIS
│
└── nginx (nginx_container)
    ├── Image: awm_assignment-nginx
    ├── Port: 80
    └── Role: Reverse proxy & static file serving
```

### Docker Compose Commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View status
docker compose ps

# View logs
docker compose logs -f web
docker compose logs -f db
docker compose logs -f nginx

# Run command in service
docker compose exec web python manage.py migrate
docker compose exec db psql -U postgres -d trails_db
```

### Common Docker Operations

```bash
# Restart all services
docker compose restart

# Restart specific service
docker compose restart web

# Build images
docker compose build

# Remove all containers and volumes
docker compose down -v

# View environment variables
docker compose config
```

---

## ☁️ Cloud Deployment (Cloud Run/GCP)

### Deployment Configuration

The project includes `cloudbuild.yaml` for Google Cloud Build:

```yaml
Steps:
1. Build Docker image
2. Push to Google Container Registry
3. Deploy to Cloud Run
4. Configure environment variables
```

### Environment Variables Required

```bash
DATABASE_URL=postgresql://user:password@host:5432/trails_db
ALLOWED_HOSTS=*.cloudbuild.goog,yourdomain.com
DEBUG=False
SECRET_KEY=your-secret-key
STATIC_ROOT=/workspace/staticfiles
```

### Cloud Run Deployment

```bash
# Deploy to Cloud Run
gcloud run deploy hiking-trails \
  --image gcr.io/PROJECT_ID/awm_assignment-web \
  --platform managed \
  --region us-central1 \
  --set-env-vars DATABASE_URL=postgresql://... \
  --allow-unauthenticated
```

### CloudSQL Integration

For production, use Google CloudSQL:

```bash
# Create CloudSQL instance
gcloud sql instances create trails-db \
  --database-version POSTGRES_15 \
  --tier db-f1-micro \
  --region us-central1

# Create database
gcloud sql databases create trails_db \
  --instance trails-db

# Enable PostGIS extension
gcloud sql connect trails-db --user=postgres
CREATE EXTENSION postgis;
```

---

## 🌐 Nginx Configuration

### Nginx Services

- **Port 80**: HTTP traffic
- **Reverse Proxy**: Routes requests to Django (port 8000)
- **Static Files**: Serves `/staticfiles/` directory
- **Load Balancing**: Can configure multiple backends

### Nginx Config Location

```
docker/nginx/nginx.conf

Key Configuration:
├── Upstream: Points to Django container (web:8000)
├── Server Block: Listens on port 80
├── Static Files: /static/ → /staticfiles/
└── API Routes: /api/ → Django app
```

### Common Nginx Commands

```bash
# Check configuration
docker compose exec nginx nginx -t

# Reload configuration
docker compose exec nginx nginx -s reload

# View error logs
docker compose logs nginx

# Restart nginx
docker compose restart nginx
```

---

## 🚀 Local Development Setup

### Prerequisites

```bash
# macOS (using Homebrew)
brew install python postgresql postgis docker

# Install Python dependencies
pip install -r requirements.txt

# Install GDAL/GEOS (for GeoDjango)
brew install gdal geos
```

### Database Setup

```bash
# Create local PostgreSQL database
createdb trails_db

# Enable PostGIS extension
psql trails_db -c "CREATE EXTENSION postgis;"

# Run migrations
python manage.py migrate

# Load spatial data
python manage.py shell < load_spatial_data.py
```

### Run Locally

```bash
# Development server
python manage.py runserver

# Test server
python manage.py test trails_api.tests --verbosity=2
```

---

## 📊 Database Backup & Recovery

### Backup Database

```bash
# Full backup
docker compose exec -T db pg_dump -U postgres trails_db > backup.sql

# Backup with compression
docker compose exec -T db pg_dump -U postgres -Fc trails_db > backup.dump

# Backup specific table
docker compose exec -T db pg_dump -U postgres -t trails_api_trail trails_db > trails_backup.sql
```

### Restore Database

```bash
# Restore from SQL file
docker compose exec -T db psql -U postgres trails_db < backup.sql

# Restore from compressed backup
docker compose exec -T db pg_restore -U postgres -d trails_db backup.dump
```

### Database Reset

```bash
# Full reset (warning: deletes all data)
docker compose exec web python manage.py flush

# Reset specific app
docker compose exec web python manage.py migrate zero trails_api
docker compose exec web python manage.py migrate trails_api
```

---

## 🔐 Security Considerations

### PostgreSQL Security

```bash
# Change postgres password
docker compose exec db psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'newpassword';"

# Create app user with limited permissions
docker compose exec db psql -U postgres -c "
CREATE USER trails_user WITH PASSWORD 'password';
GRANT CONNECT ON DATABASE trails_db TO trails_user;
GRANT USAGE ON SCHEMA public TO trails_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO trails_user;
"
```

### Django Security

- ✅ CSRF protection enabled
- ✅ SQL injection protection via ORM
- ✅ XSS protection via template escaping
- ✅ Security middleware configured
- ⚠️ Set DEBUG=False in production
- ⚠️ Use strong SECRET_KEY
- ⚠️ Configure ALLOWED_HOSTS properly

---

## 📈 Performance Monitoring

### Check Database Size

```bash
docker compose exec -T db psql -U postgres -d trails_db -c "
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

### Check Slow Queries

```bash
docker compose exec -T db psql -U postgres -d trails_db -c "
SELECT query, calls, mean_time, max_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;"
```

### Monitor Connections

```bash
docker compose exec -T db psql -U postgres -d trails_db -c "
SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"
```

---

## 🆘 Troubleshooting

### Docker Connection Issues

```bash
# Check if containers are running
docker compose ps

# View container logs
docker compose logs db
docker compose logs web

# Restart containers
docker compose restart
```

### PostgreSQL Connection Issues

```bash
# Test connection
docker compose exec -T db pg_isready -U postgres

# Check PostgreSQL status
docker compose logs db | grep "ready to accept"
```

### Django/Python Issues

```bash
# Check Python version
docker compose exec web python --version

# Check installed packages
docker compose exec web pip list | grep -E "Django|psycopg|postgis"

# Run Django system checks
docker compose exec web python manage.py check
```

### GeoDjango/PostGIS Issues

```bash
# Check PostGIS installation
docker compose exec -T db psql -U postgres -d trails_db -c "SELECT postgis_version();"

# Verify spatial indexes
docker compose exec -T db psql -U postgres -d trails_db -c "
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE indexdef LIKE '%gist%' OR indexdef LIKE '%brin%';"
```

---

## 📚 Additional Resources

- [Django Documentation](https://docs.djangoproject.com/)
- [GeoDjango](https://docs.djangoproject.com/en/5.2/ref/contrib/gis/)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Nginx Documentation](https://nginx.org/en/docs/)
