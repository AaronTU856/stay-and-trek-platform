# POI & Boundary Map Implementation Guide

## How to Use the POI Map Features

1. **POI Markers** - Colored emoji icons for:
   - 🅿️ Parking (Red)
   - ☕ Cafés (Yellow)
   - 🍽️ Restaurants (Orange)
   - ⭐ Attractions (Green)
   - 👁️ Viewpoints (Blue)
   - 🚻 Toilets (Purple)
   - 🏕️ Shelters (Teal)
   - 🧺 Picnic Areas (Gold)
   - ℹ️ Information Centers (Light Blue)
   - 🏨 Accommodations (Pink)

2. **Control Panel** (top-right of map):
   - Toggle each POI type on/off
   - Load all POIs button
   - Spatial Analysis button

3. **Click any marker** to see:
   - POI name & type
   - County/region
   - Description
   - Phone number
   - Website link
   - Opening hours

### JavaScript Functions (Available in Console):

You can use these functions directly in the browser console:

```javascript
// Load all POIs
window.poiMap.loadAllPOIs()

// Load POIs near a specific trail (by trail ID)
window.poiMap.loadPOIsNearTrail(1)

// Load POIs within 5km radius of coordinates
window.poiMap.loadPOIsInRadius(53.5, -7.7, 5)

// Load POIs of a specific type near a trail
window.poiMap.loadPOIsNearTrail(1, 'parking')

// Load geographic boundaries
window.poiMap.loadGeographicBoundaries()

// Get trails crossing a boundary (by boundary ID)
window.poiMap.loadTrailsCrossingBoundary(1)

// Get trails in a specific county
window.poiMap.loadTrailsByCounty('Cork')

// Get spatial analysis summary (logs to console)
window.poiMap.getSpatialAnalysisSummary()

// Toggle POI type visibility
window.poiMap.togglePOIType('parking')
```

### Loading Sample Data

To make the map useful, need to add POI data to the database. You can do this via:

1. **Django Admin** (`/admin/`):
   - Go to `Trails API > Points of Interest`
   - Add parking, cafes, attractions near popular trails

2. **Using the API** (POST to `/api/trails/pois/`):
   ```json
   {
     "name": "Wicklow Parking Area",
     "poi_type": "parking",
     "county": "Wicklow",
     "location": {
       "type": "Point",
       "coordinates": [-6.3, 53.0]
     }
   }
   ```

3. **Bulk Import** (create a management command):
   - Import from CSV/GeoJSON file

### Example: Add Parking Near a Trail

```python
from trails_api.models import PointOfInterest
from django.contrib.gis.geos import Point

# Add a parking location
parking = PointOfInterest.objects.create(
    name="Glendalough Upper Lake Car Park",
    poi_type="parking",
    county="Wicklow",
    region="East",
    description="Free parking at the upper lake entrance",
    phone="+353 404 45352",
    opening_hours="24/7",
    location=Point(-6.3119, 53.0083, srid=4326)
)
```

### How the Map Updates:

1. When open the map, it automatically:
   - Loads all trails
   - Creates POI layer groups for each type
   - Creates the control panel
   - Displays all POIs

2. Click checkboxes to show/hide POI types

3. Click "Load All POIs" to refresh data

4. Click "Spatial Analysis" to see stats in console

### Advanced: Filter by Trail

To show only POIs near a specific trail:

```javascript
// Show POIs near trail with ID 5
window.poiMap.loadPOIsNearTrail(5)

// Show only parking near trail 5
window.poiMap.loadPOIsNearTrail(5, 'parking')
```

### Color Legend

| Icon | Type | Color | Example |
|------|------|-------|---------|
| 🅿️ | Parking | Red | `#FF6B6B` |
| ☕ | Café | Yellow | `#FFD93D` |
| 🍽️ | Restaurant | Orange | `#FFA500` |
| ⭐ | Attraction | Green | `#6BCB77` |
| 👁️ | Viewpoint | Blue | `#4D96FF` |
| 🚻 | Toilet | Purple | `#9D84B7` |
| 🏕️ | Shelter | Teal | `#A8D8D8` |
| 🧺 | Picnic | Gold | `#FFC93C` |
| ℹ️ | Info | Light Blue | `#95B8D1` |
| 🏨 | Accommodation | Pink | `#E8B4B8` |

### Troubleshooting

**POIs not showing?**
- Check browser console for errors
- Verify POI data exists in database
- Click "Load All POIs" button
- Check network tab in DevTools

**Can't see control panel?**
- It's in the top-right corner of the map
- May be overlapped by other controls
- Try zooming or panning

**Want to customize?**
- Edit `/trails_api/static/trails_api/js/pois_boundaries.js`
- Change colors in `POI_TYPES` object
- Modify popup content in `addPOIMarker()` function

## Integration with Your Assignment

This feature demonstrates:
- ✅ Advanced spatial data (Point geometries)
- ✅ Complex queries (nearby, within radius, proximity)
- ✅ Interactive mapping (dynamic layers, filtering)
- ✅ Real-world GIS use (amenity discovery, trail planning)
- ✅ Creative implementation (emoji icons, color-coded types)

Perfect for your demo presentation!
