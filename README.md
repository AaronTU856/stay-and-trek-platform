# 🥾 Irish Trails Web Mapping Application

## 1. Project Overview
This is a full-stack application for exploring Irish hiking trails. It includes a REST API backend built with Django and GeoDjango, a web-based map interface, and a mobile app built with React Native and Expo. The system stores trail data with geographic information in PostgreSQL with PostGIS, allowing users to search, view, and discover trails across Ireland.


## 2. Features

### Backend API
- REST API endpoints for accessing trail data
- GeoJSON support for geographic data
- Spatial queries to find trails within a radius or bounding box
- Search and filtering by location, difficulty, and distance
- Trail statistics and metadata endpoints

### Web Interface
- Interactive map with Leaflet and Mapbox
- Proximity search - click on the map to find nearby trails
- Trail details view with distance and difficulty information
- Responsive design that works on desktop and tablets

### Mobile App
- Cross-platform mobile app built with React Native and Expo
- Browse all trails in an easy-to-read list
- View detailed trail information including distance, difficulty, and elevation
- Accessibility features for font scaling and high contrast mode
- Works with the live API to display real trail data
- Fallback to sample data if API is unavailable


## 3. Technologies Used

The backend is built with Django 4.2 and GeoDjango for geographic capabilities. Data is stored in PostgreSQL with PostGIS for spatial queries. The web interface uses Leaflet.js and Mapbox for mapping. The mobile app uses React Native with Expo for cross-platform development. Django REST Framework provides the API layer with DRF Spectacular for API documentation.


## 4. Getting Started

### Backend Setup

Clone the project and navigate to the root directory:

```
git clone https://github.com/AaronTU856/hiking-trails-ireland.git
cd awm_assignment
```

Create a virtual environment and install dependencies:

```
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Set up the database:

```
python manage.py migrate
python manage.py create_sample_trails
```

Run the server:

```
python manage.py runserver
```

The API will be available at http://localhost:8000/api/trails/

### Mobile App Setup

Navigate to the mobile app directory:

```
cd stay-and-trek-mobile
npm install
```

Start the Expo development server:

```
npx expo start --web
```

This opens the app at http://localhost:19006. You can also use Expo Go on your phone to scan the QR code and run the app on a mobile device.

### Using Docker

If you prefer to run everything with Docker, make sure Docker Desktop is running and use:

```
docker compose up -d --build
docker compose exec web python manage.py migrate
docker compose exec web python manage.py fetch_trails_from_arcgis
docker compose exec web python manage.py load_towns
```

Then open http://localhost:8000/dashboard/

### Available API Endpoints

The main trail endpoints are:

- GET /api/trails/ - List all trails with pagination and filtering
- GET /api/trails/{id}/ - Get details for a specific trail
- GET /api/trails/geojson/ - Get all trails as GeoJSON
- POST /api/trails/within-radius/ - Find trails within a distance from coordinates
- POST /api/trails/bbox/ - Find trails within a bounding box
- GET /api/trails/stats/ - Get summary statistics about all trails
- GET /api/trails/info/ - Get API metadata and info


## 5. How It Works

The web interface lets you click on the map to search for trails near any location. Results show on the map with numbered markers and in a side panel. You can see each trail's distance, difficulty level, and elevation gain.

The mobile app fetches data from the same REST API and displays trails in a scrollable list. Each trail card shows the basic information, and you can tap to see full details. The app includes accessibility features so users can adjust text size and enable high contrast mode.


## 6. Testing

The project includes tests for the API endpoints and spatial queries. You can run tests with pytest:

```
pytest
```

Tests cover the GeoJSON endpoints, proximity search, radius queries, and bounding box searches.


## 7. Data Sources

The trail data comes from Sport Ireland's Get Ireland Active Trail Routes dataset via ArcGIS REST API. This provides the names, locations, and details for walking and cycling trails around Ireland.

The towns data is sourced from Irish open data and cleaned for use in the application.

Trail markers on the map use open source icons from the leaflet-color-markers project.


## 8. Deployment

The application is set up to run with Docker Compose for local development. For production, the application can be deployed to any cloud platform that supports Docker containers.


## 9. References

Mapbox Documentation – https://console.mapbox.com

Django GeoDjango – https://docs.djangoproject.com/en/4.2/ref/contrib/gis/

Django REST Framework – https://www.django-rest-framework.org/api-guide/metadata/

DRF Spectacular – https://drf-spectacular.readthedocs.io/en/latest/readme.html#testing

LeafletJS – https://leafletjs.com/examples/geojson/

React Native – https://reactnative.dev/

Expo – https://expo.dev/
