# Map Structure & Routing Guide

This document maps which map interface is rendered at each URL endpoint for the Hiking Trails Ireland application.

## Map URLs and Templates

### 1. SEO Trails Map (Main Map)
**URL:** `http://localhost:8000/api/trails/map/`  
**View Function:** `trails_api/views.py` → `trail_map()`  
**Template:** `trails_api/templates/trails/map.html`  
**Features:**
- Full-featured interactive map with Leaflet.js
- **Left Sidebar:** Search and filter interface
  - Distance-based proximity search
  - Trail filtering by difficulty, county, region
  - Live search with autocomplete
  - Elevation gain filters
- **Map Display:**
  - All 1,055+ trails with markers
  - Geographic boundaries (rivers, county borders)
  - Town locations and population data
  - Trail paths as polylines
- **Functionality:**
  - Click trails/towns to view details in popup
  - Search control for quick trail location
  - Responsive sidebar (collapsible on mobile)
  - Population density visualization

**Connected Views:**
- `trails_api/views.py` → `TrailListCreateView` (GET `/api/trails/`)
- `trails_api/views.py` → `towns_geojson()` (GET `/api/trails/towns/geojson/`)
- `trails_api/views.py` → `trails_geojson()` (GET `/api/trails/geojson/`)
- `trails_api/views.py` → `boundaries()` (GET `/api/trails/boundaries/`)

**JavaScript:**
- Uses CDN Leaflet.js: `https://unpkg.com/leaflet@1.9.4/dist/leaflet.js`
- Search library: `{% static 'trails_api/css/leaflet-search.min.css' %}`

---

### 2. Advanced Mapping Lab (Polygon Analysis Map)
**URL:** `http://localhost:8000/advanced-js-mapping/map/`  
**View Function:** `advanced_js_mapping/views.py` → `map_view()`  
**Template:** `advanced_js_mapping/templates/advanced_js_mapping/map.html`  
**Features:**
- Polygon drawing tools for spatial analysis
- **Left Panel:** Results and analysis display
  - Shows towns found within drawn polygon
  - Population statistics
  - Area calculations
  - Population density metrics
- **Drawing Tools:**
  - Draw custom polygons
  - Draw squares/rectangles
  - Polygon editing capabilities
  - Clear/reset functionality
- **Map Display:**
  - Base map with Leaflet.js
  - Town markers from API
  - Interactive polygon manipulation

**Connected Views:**
- `advanced_js_mapping/views.py` → `polygon_search()` (POST `/advanced-js-mapping/api/polygon-search/`)
- `trails_api/views.py` → `towns_geojson()` (GET `/api/trails/towns/geojson/`)

**JavaScript Libraries:**
- Leaflet.js (local): `{% static 'leaflet/leaflet.js' %}`
- Leaflet Draw (local): `{% static 'leaflet/draw/leaflet.draw.js' %}`
- Custom modules:
  - `map-interface.js` - Map initialization
  - `spatial-analysis.js` - Polygon analysis logic
  - `ui-controls.js` - UI controls

**Template Hierarchy:**
```
advanced_js_mapping/templates/advanced_js_mapping/base.html
└── map.html (extends base.html)
    ├── Leaflet CSS & JS (from base)
    ├── Leaflet Draw CSS & JS (from base)
    ├── Custom mapping JS (from map.html block)
    └── Cursor styles for polygon drawing
```

---

### 3. Home/Index Page
**URL:** `http://localhost:8000/`  
**View Function:** `webmapping_project/views.py` → `home()`  
**Template:** `templates/index.html`  
**Features:**
- Navigation hub with quick links
- Bootstrap-styled layout
- Links to all major features

**Quick Links:**
- 🏠 Home
- 🥾 Trails in Ireland → `/api/trails/map/` (SEO Trails Map)
- 🗺️ Interactive Map → `/advanced-js-mapping/map/` (Polygon Analysis Map)
- 🎨 Advanced Mapping Lab → `/advanced-js-mapping/` (Accommodations)
- 📊 Dashboard → `/dashboard/`
- ⚙️ Admin → `/admin/`

---

## Map Comparison Table

| Feature | SEO Trails Map | Advanced Mapping Lab |
|---------|---|---|
| **URL** | `/api/trails/map/` | `/advanced-js-mapping/map/` |
| **Purpose** | Explore all trails & towns | Spatial polygon analysis |
| **Sidebar** | Search & filter trails | Polygon search results |
| **Drawing Tools** | None | Full polygon/rectangle tools |
| **Data Displayed** | Trails + Towns + Boundaries | Towns only (for polygon analysis) |
| **Analysis** | Trail details on click | Population within polygon |
| **Use Case** | Trail discovery & planning | Spatial queries (pop density, etc.) |
| **Template** | `trails/map.html` | `advanced_js_mapping/map.html` |

---

## URL Routing Summary

### Trails API Routes
```
/api/trails/                         → TrailListCreateView (API list all trails)
/api/trails/map/                     → trail_map() → trails/map.html
/api/trails/geojson/                 → trails_geojson() (GeoJSON format)
/api/trails/towns/geojson/           → towns_geojson() (GeoJSON format)
/api/trails/boundaries/              → GeographicBoundaryViewSet (GeoJSON)
/api/trails/search/                  → trail_search() (API search)
```

### Advanced Mapping Routes
```
/advanced-js-mapping/                → index_view() → advanced_js_mapping/index.html
/advanced-js-mapping/map/            → map_view() → advanced_js_mapping/map.html
/advanced-js-mapping/analytics/      → analytics_view() (dashboard)
/advanced-js-mapping/api/polygon-search/  → polygon_search() (spatial query API)
```

### Other Routes
```
/                                    → home() → templates/index.html
/dashboard/                          → dashboard views
/admin/                              → Django admin
/authentication/login/               → login page
/authentication/signup/              → signup page
```

---

## Static Files Organization

**Leaflet Assets (Shared):**
```
staticfiles/leaflet/
├── leaflet.css
├── leaflet.js
├── leaflet.min.js
├── draw/
│   ├── leaflet.draw.css
│   └── leaflet.draw.js
├── images/
│   ├── marker-icon.png
│   ├── marker-icon-2x.png
│   └── marker-shadow.png
```

**Advanced Mapping Assets:**
```
staticfiles/advanced_js_mapping/
├── js/
│   ├── map-interface.js
│   ├── spatial-analysis.js
│   └── ui-controls.js
└── css/
    └── advanced.css
```

**Global Assets:**
```
staticfiles/
├── css/
│   ├── style.css
│   └── global-theme.css
├── images/
│   ├── logo.png
│   ├── hike_2.jpg
│   └── towns.jpg
└── trails_api/
    └── css/
        └── leaflet-search.min.css
```

---

## Debug Notes

- Both maps use Leaflet.js but in different ways
- SEO Trails Map uses CDN Leaflet for performance
- Advanced Mapping uses local Leaflet to ensure consistency
- Always access via `http://localhost` (port 80) or `http://localhost:8000` (Django dev server)
- For production, use `http://localhost` (nginx) - port 8000 is development only

---

## Future Enhancements

- Consolidate both maps to use consistent Leaflet source (local vs CDN)
- Add map switching capability to toggle between modes
- Merge common utilities into shared JavaScript modules
- Consider single-page app approach with JavaScript routing

