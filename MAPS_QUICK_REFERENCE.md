# 🗺️ AWM Maps Quick Reference Card

## Two Main Maps

### 1️⃣ SEO Trails Map
- **URL:** `http://localhost:8000/api/trails/map/`
- **Template:** `trails_api/templates/trails/map.html`
- **Purpose:** Explore all trails with search & filters
- **Features:** Sidebar search, difficulty filters, elevation filters, town markers, river boundaries
- **Data:** 1,055 trails + 46 towns + 2,771 boundaries

### 2️⃣ Polygon Analysis Map  
- **URL:** `http://localhost:8000/advanced-js-mapping/map/`
- **Template:** `advanced_js_mapping/templates/advanced_js_mapping/map.html`
- **Purpose:** Spatial analysis with polygon drawing
- **Features:** Draw polygons/rectangles, analyze population density, calculate areas
- **Data:** Town population data, area calculations

---

## Quick Navigation

| Link | URL | Type |
|------|-----|------|
| 🏠 Home | `/` | Hub with links |
| 🥾 SEO Trails Map | `/api/trails/map/` | **Main map** |
| 🗺️ Polygon Analysis | `/advanced-js-mapping/map/` | Analysis tool |
| 📊 Dashboard | `/dashboard/` | Analytics |
| ⚙️ Admin | `/admin/` | Django admin |

---

## File Locations

**SEO Trails Map Components:**
```
trails_api/
├── templates/trails/map.html        ← Template
├── views.py (trail_map function)    ← View
└── static/trails_api/css/          ← Styles
```

**Polygon Analysis Components:**
```
advanced_js_mapping/
├── templates/advanced_js_mapping/
│   ├── base.html                    ← Base with Leaflet
│   └── map.html                     ← Map template
├── views.py (map_view function)     ← View
└── static/advanced_js_mapping/
    ├── js/                          ← JavaScript modules
    └── css/                         ← Styles
```

---

## Helpful Commands

```bash
# Start application
docker-compose up -d

# Restart Django
docker restart django_container

# View logs
docker-compose logs -f django_container

# Run migrations
docker exec django_container python manage.py migrate

# Collect static files
docker exec django_container python manage.py collectstatic --noinput

# Clean up project (optional)
bash cleanup.sh
```

---

## Documentation Files

| File | Purpose |
|------|---------|
| `MAP_STRUCTURE.md` | Detailed map routing & features |
| `PROJECT_STRUCTURE.md` | Full project overview & setup |
| `cleanup.sh` | Remove unused files & backups |
| `CLEANUP_SUMMARY.md` | What was removed & why |

---

## Access Methods

### Development (Django dev server)
```
Port: 8000
URL: http://localhost:8000/api/trails/map/
```

### Production-like (Via Nginx)
```
Port: 80
URL: http://localhost/api/trails/map/
```

---

## Troubleshooting

**Static files not loading?**
- Ensure `docker-compose up -d` containers are running
- Check: `docker exec django_container python manage.py collectstatic --noinput`
- Access via port 80 (nginx) not port 8000 (Django dev)

**Map not rendering?**
- Check browser console for errors
- Verify Leaflet is loaded: Check Network tab in DevTools
- Ensure `/api/trails/towns/geojson/` API endpoint is accessible

**Polygon analysis not working?**
- Verify `polygon_search()` view is registered in urls
- Check that `spatial-analysis.js` is loading
- Confirm town data API returns GeoJSON

---

**Keep this card handy for quick reference during development!** 📌

