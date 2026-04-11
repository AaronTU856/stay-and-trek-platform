# Stay & Trek

Stay & Trek is a web mapping project for exploring walking trails in Ireland. It combines a Django and PostGIS backend, a Leaflet-based web map, supporting analytics pages, and an optional Expo / React Native mobile client that uses the same API.

## What The System Does

- displays trail start points and trail paths on an interactive map
- supports radius search, bounding-box search, and county filtering
- shows nearby accommodation and route planning between trails and stays
- provides weather lookups for trails and towns
- includes POI and river/boundary exploration tools
- supports admin moderation of trail description submissions

## Main Components

- `webmapping_project/` Django project settings, URLs, and shared configuration
- `trails_api/` core models, serializers, API views, admin, tests, and map assets
- `advanced_js_mapping/` advanced spatial exploration pages and views
- `dashboard/` analytics and reporting pages
- `authentication/` login, signup, and profile views
- `maps/` additional map-related pages and app wiring
- `stay-and-trek-mobile/` optional mobile client using the same backend API
- `docker/` local Docker configuration for Django, PostGIS, and nginx
- `tests/` supporting test notes, scripts, and evidence material

## Dependencies

The local web system is intended to run with Docker.

Required for the web application:

- Docker Desktop or Docker Engine
- Docker Compose

Useful for development outside Docker:

- Python 3
- PostgreSQL with PostGIS

Optional for the mobile client:

- Node.js and npm
- Expo CLI / Expo Go

## Run Locally

Start the web stack:

```bash
docker compose up -d --build
docker compose exec web python manage.py migrate
docker compose exec web python manage.py collectstatic --noinput
```

Open the local system at:

- `http://127.0.0.1:8000/`
- `http://127.0.0.1:8000/admin/`

Run the Django tests:

```bash
docker compose exec web python manage.py test
```

## Mobile Client

The mobile app in `stay-and-trek-mobile/` is an optional companion application. It uses the same backend API and supports:

- trail browsing
- trail detail views
- nearby accommodation
- weather display
- trail description submission

See `stay-and-trek-mobile/README.md` for local mobile setup.

## Submission Scope

Included in the academic project:

- Django web application and templates
- REST and GeoJSON API endpoints
- spatial search, POI, boundary, and routing logic
- automated tests in `trails_api/tests/`
- documentation and test evidence folders
- optional mobile client source code

Not intended as core submission material:

- local virtual environments
- dependency caches and `node_modules`
- collected static build artefacts
- coverage output, runtime logs, and editor/system files
- private environment files and machine-specific settings

## Suggested Exclusions From Final Hand-In

These should normally be excluded from the final submission package:

- `.git/`
- `.venv/`
- `__pycache__/`
- `.pytest_cache/`
- `.vscode/`
- `stay-and-trek-mobile/node_modules/`
- `stay-and-trek-mobile/.expo/`
- `stay-and-trek-mobile/dist/`
- `htmlcov/`
- `server.log`
- `.DS_Store`
- `staticfiles/` unless specifically required as deployment evidence

## Main Technologies

- Django
- Django REST Framework
- GeoDjango
- PostgreSQL / PostGIS
- pgRouting
- Leaflet
- Docker
- Expo / React Native
