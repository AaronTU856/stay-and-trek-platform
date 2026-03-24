# Stay and Trek

Stay and Trek is a full-stack geospatial project for exploring walking trails in Ireland. The main idea is simple: a user can browse trails, view them on a map, look for nearby accommodation, generate a route between a trail and a stay, and check weather information for trail locations and towns.

The project has both a web side and a mobile side. The web app is built into the Django project and uses server-rendered templates with JavaScript for the interactive map. It is the main deployed part of the system and is live at `stay-and-trek.com`. The mobile app is a separate React Native client in the `stay-and-trek-mobile` folder and is intended to consume the same API.

## Architecture overview

The system follows a client-server structure with more than one client talking to the same backend.

The backend is built with Django, Django REST Framework, and GeoDjango. It exposes API endpoints for trails, towns, points of interest, accommodation, weather lookups, and route generation. Spatial data is stored in PostgreSQL with PostGIS, which is used for distance, radius, bounding box, and geometry intersection queries.

Routing is handled through pgRouting on top of OpenStreetMap-based road data. In practice, the application snaps trail and accommodation points to a routing network in the database and then returns a route as GeoJSON.

The web frontend uses Django templates and Leaflet. The main map interface lives inside the Django project and loads data from the backend API. The mobile frontend is a separate Expo / React Native app that also talks to the backend API.

## Key features

The current system includes:

- trail discovery and filtering
- interactive trail and town maps
- nearby accommodation lookups
- route generation between trails and accommodation
- weather integration for trail and town locations
- spatial queries such as radius search, bounding box search, and boundary analysis

## Project structure

The repository is a bit mixed because the project has grown over time, but the main parts are straightforward.

- `webmapping_project/` contains the main Django project configuration
- `trails_api/` contains the core backend models, views, serializers, API routes, and geospatial logic
- `templates/` and app template folders contain the web frontend pages
- `stay-and-trek-mobile/` contains the separate mobile client
- `docker/` contains the database and nginx container setup

There are also some older or experimental modules in the repo, but `trails_api`, the web templates, and the mobile app are the main parts to focus on.

## Setup

The easiest way to run the project is with Docker. The application is set up to run with Docker Compose, including a PostGIS database service.

Use:

```bash
docker compose up -d --build
docker compose exec web python manage.py migrate
docker compose exec web python manage.py collectstatic --noinput
```

The backend service runs in the `web` container and the spatial database runs in the `db` container. The database image includes PostGIS support, which is required for the spatial queries used by the API.

## Notes and limitations

The main web platform is live and deployed, so this repository is not just a prototype. The Django, PostGIS, Leaflet, and routing parts form the main working system.

The mobile client is still the prototype part of the project. It is being built as a separate companion app and some mobile UI and integration work is still in progress. There are also parts of the repo that reflect earlier development stages, so not every folder has the same importance in the final system.

## Deployment

The application is deployed in containers. Docker is used for the application setup, and static files are collected through Django `collectstatic` as part of the deployment process. The web system is deployed through the project CI/CD flow and runs on the live domain `stay-and-trek.com`.

In short, the project is a Django and PostGIS backend with two clients on top of it: a Leaflet-based web app and a separate React Native mobile app.
