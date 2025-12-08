# 🥾 Irish Trails Web Mapping Application

## 1. Project Overview
The Trails API and web mapping project is a Django + GeoDjango based web application
that provides RESTful and GeoJSON endpoints for Irish hiking trail data.
The project integrates PostGIS, Leaflet and Mapbox for spatial analysis radius and bounding box queries.
and visualization using Leaflet and Mapbox.


## 2. Features Implemented
### Core
- REST API for Trails (`/api/trails/`)
- GeoJSON endpoint (`/api/trails/geojson/`)
- Map view with Leaflet and Mapbox tiles
- Spatial queries:
  - `within-radius`
  - `in-bounding-box`
- Interactive Leaflet map (`/api/trails/map/`)
- API info endpoint (`/api/trails/info/`)

### Additional
- Django admin for Trails
- Custom management command `create_sample_trails`
- Interactive Leaflet map (`/api/trails/map/`)
- Pagination, filtering, and search via Django REST Framework
- CORS support for external clients
- DRF Spectacular for auto-generated Swagger documentation



## 3. Technologies Used

 **Backend**  Django 4.2 , GeoDjango 
 **Database**  PostgreSQL , PostGIS 
 **Frontend**  Leaflet.js , Bootstrap 
 **API** Django REST Framework , drf_spectacular 
 **Spatial Tools**  Mapbox, django-geojson 
 **Dev Environment**  Homebrew GDAL/GEOS/PROJ setup 



## 4. Installation & Setup

# Clone project
git clone https://github.com/AaronTU856/hiking-trails-ireland.git
cd trails_api

# Activate environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create and seed database
python manage.py migrate
python manage.py create_sample_trails

# Run server
python manage.py runserver


 (Endpoint)                      (Method)              (Description)                             

 `/api/trails/`                GET / POST          List or create trails                   
 `/api/trails/<id>/`           GET / PUT / DELETE  Retrieve, update or delete a trail      
 `/api/trails/geojson/`        GET                 Get all trails as GeoJSON               
 `/api/trails/within-radius/`  POST                Find trails near a coordinate           
 `/api/trails/bbox/`           POST                Find trails in bounding box             
 `/api/trails/stats/`          GET                 Trail summary statistics                
`/api/trails/info/`            GET                 API metadata                            
 `/api/trails/map/`            GET                 Map interface                           
 `/api/trails/test/`           GET                 Testing interface – not activated yet 
`/api/trails/towns/geojson/`   GET                 GeoJSON of towns with filters

URL                     Description                         

`/dashboard/`            Dashboard home page                  
`/dashboard/analytics/`  Data analytics and charts for trails 
`/maps/api/status/`          Health/status check endpoint



## 6. Tests & Validation

- Implemented but not activated yet

- Trails API Test Interface (Django view template)

- Unit tests planned for:

- Radius search (within-radius)

- GeoJSON response structure

- Database model constraints

### Debugging

- The town filters (type and population) were not working because two URL routes were defined for the same endpoint (/api/trails/towns/geojson/).

- The duplicate class-based view (TownGeoJSONView) was removed.

- The function-based view (towns_geojson) was kept, allowing proper filtering and debug logging.

- Confirmed working filters for town_type, min_population, and max_population.

### Proximity Search

- Trails and towns are now searchable by proximity using GeoDjango’s DistanceFunction.

- Clicking on the map triggers a radius search that:

- Returns trails ordered by distance.

- Displays results on the map and in the side panel.

- Each marker now uses a numbered icon for clarity.

### GeoJSON Fix

- Initially, trails did not appear on the map due to mismatched field names (location vs start_point).

- Serializer and Leaflet JS were updated to use the correct coordinate field.

## 7. Future Enhancements

- Add user accounts for trail submissions

- Enable Mapbox layer switching

- Connect frontend search UI for live queries

- Automate tests via Django’s TestCase class

## 8  Testing

All API routes tested using pytest and Django’s test client.

Tests for GeoJSON endpoints, proximity search, and radius queries all pass.



9. References

Mapbox Documentation – https://console.mapbox.com

Django GeoDjango – https://docs.djangoproject.com/en/4.2/ref/contrib/gis/

Django REST Framework – https://www.django-rest-framework.org/api-guide/metadata/

DRF Spectacular – https://drf-spectacular.readthedocs.io/en/latest/readme.html#testing

LeafletJS – https://leafletjs.com/examples/geojson/

10. ## Docker Setup (Final Deployment)

Ensure Docker Desktop is running before executing these commands.

docker compose up -d --build
docker compose exec web python manage.py migrate
docker compose exec web python manage.py fetch_trails_from_arcgis
docker compose exec web python manage.py load_towns

# Restore
docker compose exec web python manage.py loaddata trails_api/data/towns_backup.json
docker compose exec web python manage.py loaddata trails_api/data/trails_backup.json

### Open Browser
http://localhost:8000/dashboard/

## 🐋 Docker Usage Guide

### Start the Application
Run from project root (where `docker-compose.yml` is located):

docker compose up -d


## Stop the Application

- Stop and remove running containers:

  docker compose down

- Pause them without removing:

docker compose stop

## Restart the Application

docker compose down
docker compose up -d

## Check Running Containers

docker ps

## Clean Up Unused Containers & Images

- Removes all stopped containers, images, and volumes:

docker system prune -a

## Intersection Test Page

URL: http://localhost:8000/maps/intersect_test/

# Description: 
Displays a test interface for validating trail intersection points and spatial operations using Leaflet.

# Data Sources

The trail data used in this project comes from the Sport Ireland “Get Ireland Active Trail Routes” dataset, which is published through ArcGIS. I fetched it directly from their ArcGIS REST API in GeoJSON format using a Django management command. This data includes the names, locations, and details for walking and cycling trails around Ireland.

The towns data is loaded from a local GeoJSON file called sample_towns.geojson in the trails_api/data/ folder. It’s a simplified dataset that includes Irish towns with their coordinates, county names, and a few extra fields. It was originally taken from Irish open data data.gov.ie and cleaned up before being added to the project.

- Markers
https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png
https://github.com/pointhi/leaflet-color-markers
Trigger test Sat Nov  8 19:42:01 GMT 2025
Trigger test Sat Nov  8 19:45:24 GMT 2025
Pipeline test Sat Nov  8 20:05:55 GMT 2025


## Project folder in google cloud
cloud-sql-proxy long-octane-477515-k6:europe-west1:stay-trek-db --port=5432

### Database Modes
- Local: `ACTIVE_DB=local`
- Cloud: `ACTIVE_DB=new`
# Cloud Build test push - Mon Dec  8 19:45:45 GMT 2025
