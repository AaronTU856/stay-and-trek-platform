# 🗺️ AWM Project Complete Structure Guide

This guide documents the complete project structure, all maps, and cleanup recommendations.

---

## 📋 Table of Contents

1. [Map Structure & Routing](#-map-structure--routing)
2. [Project Directory Structure](#-project-directory-structure)
3. [Cleanup Recommendations](#-cleanup-recommendations)
4. [URL Routing Reference](#-url-routing-reference)
5. [Static Files Organization](#-static-files-organization)

---

## 🗺️ Map Structure & Routing

### 1. SEO Trails Map (Main Application Map)
```
URL:      http://localhost:8000/api/trails/map/
View:     trails_api/views.py → trail_map()
Template: trails_api/templates/trails/map.html
Status:   ✅ ACTIVE (Primary map for trail exploration)
```

**Features:**
- Full-featured interactive Leaflet.js map
- Left sidebar with search and filtering
- 1,055+ trail markers with details
- Geographic boundaries (rivers, counties)
- Town locations with population data
- Distance-based proximity search
- Elevation and difficulty filters

**Connected APIs:**
- GET `/api/trails/` - All trails (paginated)
- GET `/api/trails/geojson/` - Trail paths as GeoJSON
- GET `/api/trails/towns/geojson/` - Town locations
- GET `/api/trails/boundaries/` - Geographic boundaries

---

### 2. Advanced Mapping Lab (Polygon Analysis Map)
```
URL:      http://localhost:8000/advanced-js-mapping/map/
View:     advanced_js_mapping/views.py → map_view()
Template: advanced_js_mapping/templates/advanced_js_mapping/map.html
Status:   ✅ ACTIVE (Spatial analysis tool)
```

**Features:**
- Polygon/rectangle drawing tools (Leaflet.Draw)
- Spatial analysis of drawn polygons
- Town population analysis within polygons
- Area calculation and density metrics
- Right-side results panel
- Interactive polygon editing

**Connected APIs:**
- POST `/advanced-js-mapping/api/polygon-search/` - Spatial query
- GET `/api/trails/towns/geojson/` - Town data for overlay

**JavaScript Modules:**
- `map-interface.js` - Map initialization
- `spatial-analysis.js` - Polygon analysis logic
- `ui-controls.js` - UI controls

---

### 3. Home/Index Page
```
URL:      http://localhost:8000/
View:     webmapping_project/views.py → home()
Template: templates/index.html
Status:   ✅ ACTIVE (Navigation hub)
```

**Quick Links:**
- 🥾 SEO Trails Map → `/api/trails/map/`
- 🗺️ Interactive Map (Polygon) → `/advanced-js-mapping/map/`
- 🎨 Advanced Mapping Lab → `/advanced-js-mapping/`
- 📊 Dashboard → `/dashboard/`
- ⚙️ Admin → `/admin/`

---

## 📁 Project Directory Structure

```
awm_assignment/
├── 📄 MAP_STRUCTURE.md                    # ✨ NEW: Comprehensive map documentation
├── 📄 CLEANUP_SUMMARY.md                  # ✨ NEW: Files removed during cleanup
├── 📄 cleanup.sh                          # ✨ NEW: Automated cleanup script
├── 📄 PROJECT_STRUCTURE.md                # ✨ NEW: This file
│
├── 🐳 Docker Configuration
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── .dockerignore
│   └── docker/
│       └── nginx/
│           ├── Dockerfile
│           └── nginx.conf
│
├── 🐍 Django Project Root
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   └── webmapping_project/
│       ├── settings.py              # ✅ Updated: DEBUG respects env var
│       ├── urls.py
│       ├── wsgi.py
│       ├── asgi.py
│       └── views.py
│
├── 🗺️ Main Applications
│   ├── trails_api/                  # ✅ Trail data & SEO map
│   │   ├── models.py
│   │   ├── views.py                 # ✅ Fixed: trail_map() renders correct template
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   ├── templates/trails/
│   │   │   └── map.html            # ✅ SEO Trails Map Template
│   │   ├── static/trails_api/
│   │   │   └── css/leaflet-search.min.css
│   │   └── management/commands/
│   │
│   ├── advanced_js_mapping/         # ✅ Polygon analysis map
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── templates/advanced_js_mapping/
│   │   │   ├── base.html            # ✅ Updated: Added Leaflet CSS/JS
│   │   │   └── map.html             # ✅ Updated: Fixed static file refs
│   │   ├── static/advanced_js_mapping/
│   │   │   ├── js/
│   │   │   │   ├── map-interface.js
│   │   │   │   ├── spatial-analysis.js
│   │   │   │   └── ui-controls.js
│   │   │   └── css/advanced.css
│   │   └── migrations/
│   │
│   ├── authentication/              # ✅ User auth
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── templates/authentication/
│   │
│   └── dashboard/                   # ✅ Analytics dashboard
│       ├── models.py
│       ├── views.py
│       ├── urls.py
│       └── templates/dashboard/
│
├── 📁 Static Files & Templates
│   ├── staticfiles/                 # ✅ Collected static files (generated)
│   │   ├── leaflet/                # Leaflet.js library
│   │   ├── advanced_js_mapping/    # Advanced mapping assets
│   │   ├── css/                    # Global styles
│   │   └── images/                 # Logos and images
│   ├── static/                     # Source static files
│   │   ├── leaflet/
│   │   ├── advanced_js_mapping/
│   │   ├── css/
│   │   ├── js/
│   │   └── images/
│   └── templates/                  # Project-level templates
│       ├── index.html             # ✅ Home page
│       ├── _navigation.html
│       └── advanced_js_mapping/   # App templates
│
├── 🧪 Testing & Configuration
│   ├── pytest.ini
│   ├── conftest.py
│   └── (test files removed in cleanup)
│
├── 📚 Documentation
│   ├── README.md
│   ├── NGINX_SETUP.md
│   ├── _REFERENCE_NOTES/
│   │   ├── DATABASE.md
│   │   ├── SPATIAL_FEATURES.md
│   │   └── ...
│   └── Documentation/
│
├── 📦 Database
│   └── PostgreSQL via Docker
│       - 1,055 trails
│       - 46 towns
│       - 2,771 geographic boundaries
│
└── 📱 Mobile App (Separate)
    └── stay-and-trek-mobile/       # React Native/Expo app

```

---

## 🧹 Cleanup Recommendations

### Already Created (Reference Files)
✅ `MAP_STRUCTURE.md` - Detailed map routing documentation
✅ `CLEANUP_SUMMARY.md` - Summary of cleanup changes
✅ `cleanup.sh` - Automated cleanup script

### Files to Remove (Optional)
The following files are not used and can be safely deleted:

#### 1. Database Backups
```bash
rm clean_dump.sql full_backup.dump local_dump.sql awm_project.zip
```
**Why:** Database is managed via Docker and backed up via git

#### 2. Test Scripts
```bash
rm check_rivers.py test_api.py test_endpoint.py test_spatial.py
rm test_trails_towns.sh test_web_app.sh run_tests.sh
```
**Why:** Tests should run via pytest through CI/CD pipeline

#### 3. Unused Applications
```bash
rm -rf weathermap/   # Separate weather app, not integrated
rm -rf maps/         # Legacy mapping app, replaced by trails_api
```
**Why:** Not installed in INSTALLED_APPS, functionality replaced

#### 4. Python Cache (Optional)
```bash
find . -type d -name "__pycache__" -delete
find . -type d -name ".pytest_cache" -delete
find . -type f -name "*.pyc" -delete
```
**Why:** Generated automatically, doesn't need to be in repo

### To Run Automated Cleanup
```bash
bash cleanup.sh
```

---

## 🔀 URL Routing Reference

### Main Application Routes

#### Trails API
```
/api/trails/                    TrailListCreateView (paginated list)
/api/trails/<id>/               TrailDetailView (detail view)
/api/trails/map/                trail_map() → trails/map.html ✅
/api/trails/geojson/            trails_geojson() (GeoJSON)
/api/trails/search/             trail_search() (search API)
/api/trails/towns/geojson/      towns_geojson() (town markers)
/api/trails/boundaries/         GeographicBoundaryViewSet
```

#### Advanced Mapping
```
/advanced-js-mapping/           index_view() (accommodations)
/advanced-js-mapping/map/       map_view() → advanced_js_mapping/map.html ✅
/advanced-js-mapping/analytics/ analytics_view() (dashboard)
/advanced-js-mapping/api/polygon-search/  polygon_search() (spatial query)
```

#### Authentication
```
/authentication/login/          Login view
/authentication/signup/         Signup view
/authentication/logout/         Logout view
/authentication/profile/        User profile
```

#### Other
```
/                               home() → templates/index.html ✅
/dashboard/                     Dashboard views
/admin/                         Django admin
```

---

## 📦 Static Files Organization

### Leaflet Assets (Shared)
```
staticfiles/leaflet/
├── leaflet.css (from CDN in dev, local in staticfiles)
├── leaflet.js
├── leaflet.min.js
├── draw/
│   ├── leaflet.draw.css
│   └── leaflet.draw.js
└── images/
    ├── marker-icon.png
    ├── marker-icon-2x.png
    └── marker-shadow.png
```

### Advanced Mapping Assets
```
staticfiles/advanced_js_mapping/
├── js/
│   ├── map-interface.js
│   ├── spatial-analysis.js
│   └── ui-controls.js
└── css/
    └── advanced.css
```

### Global Assets
```
staticfiles/
├── css/
│   ├── style.css
│   └── global-theme.css
├── images/
│   ├── logo.png
│   ├── hike_2.jpg
│   └── towns.jpg
└── js/
    └── main.js
```

---

## ⚙️ Key Configuration Changes

### 1. DEBUG Setting (webmapping_project/settings.py)
```python
# Before:
DEBUG = False

# After:
DEBUG = os.getenv('DEBUG', 'False').lower() in ('true', '1', 'yes', 'on')
```
**Effect:** Respects `DEBUG=1` in docker-compose.yml for local development

### 2. Trail Map Template (trails_api/views.py)
```python
# Before:
def trail_map(request):
    return render(request, 'advanced_js_mapping/map.html')  # ❌ Wrong!

# After:
def trail_map(request):
    return render(request, 'trails/map.html')  # ✅ Correct!
```
**Effect:** SEO trails map now shows correct interface with sidebar search

### 3. Static Files in Base Template (advanced_js_mapping/templates/advanced_js_mapping/base.html)
```django-html
<!-- Added to base.html -->
<link rel="stylesheet" href="{% static 'leaflet/leaflet.css' %}">
<link rel="stylesheet" href="{% static 'leaflet/draw/leaflet.draw.css' %}">
<script src="{% static 'leaflet/leaflet.js' %}"></script>
<script src="{% static 'leaflet/draw/leaflet.draw.js' %}"></script>
```
**Effect:** All pages extending base.html have Leaflet available

---

## 📊 Data Model

### Trails
- 1,055 trails with coordinates
- Properties: trail_name, distance_km, difficulty, elevation_gain_m, dogs_allowed, parking_available
- Geographic: latitude/longitude, county, region

### Towns
- 46 towns across Ireland
- Properties: name, population, coordinates
- Used for proximity analysis

### Boundaries
- 2,771 geographic boundaries (rivers, county borders, etc.)
- Used for spatial analysis and visualization

### Points of Interest (POIs)
- Various POI types (parking, accommodations, restaurants, etc.)
- Associated with trails and towns
- Used in advanced mapping analysis

---

## 🚀 Quick Start

### Access the Application
```bash
# Development (port 8000, Django dev server)
http://localhost:8000/

# Production-like (port 80, via Nginx)
http://localhost/
```

### Navigate to Maps
- **SEO Trails Map:** `http://localhost:8000/api/trails/map/`
- **Polygon Analysis:** `http://localhost:8000/advanced-js-mapping/map/`
- **Home/Hub:** `http://localhost:8000/`

### Docker Commands
```bash
# Start containers
docker-compose up -d

# View logs
docker-compose logs -f django_container

# Run migrations
docker exec django_container python manage.py migrate

# Collect static files
docker exec django_container python manage.py collectstatic --noinput
```

---

## 📝 Notes

- Both maps use Leaflet.js but in different contexts
  - SEO map: Trail exploration and planning
  - Advanced map: Spatial analysis with polygon tools
- Static files are served by Nginx in production, Django in development
- All geographic data uses SRID 4326 (WGS84)
- Database changes are tracked via Django migrations

---

**Last Updated:** December 16, 2025
**Status:** Production Ready ✅

