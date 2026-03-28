console.log("✅ dashboard_map.js loaded");

// Sets up the dashboard map, filters, and summary cards.
document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Initializing dashboard map...");

    // Clears any old Leaflet instance before rebuilding the dashboard map.
    const existingMap = L.DomUtil.get('map');
    if (existingMap !== null) {
        existingMap._leaflet_id = null;
    }

    const southWest = L.latLng(51.0, -11.0);
    const northEast = L.latLng(55.5, -5.0);
    const bounds = L.latLngBounds(southWest, northEast);

    // Keeps the dashboard map focused on Ireland.
    const map = L.map('map', {
        maxBounds: bounds,
        maxBoundsViscosity: 1.0,
        minZoom: 7.2,
        maxZoom: 20
    }).setView([53.4, -8.2], 7.3);

    // Adds the base map tiles.
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    const trailIcons = {
        easy: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [20, 30], iconAnchor: [12, 41]
        }),
        moderate: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [20, 30], iconAnchor: [12, 41]
        }),
        hard: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [20, 30], iconAnchor: [12, 41]
        }),
        unknown: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [20, 30], iconAnchor: [12, 41]
        })
    };

    const townIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [15, 20],
        iconAnchor: [12, 41]
    });


    let trailsLayer = null;
    let trailsClusterLayer = null;
    let townsLayer = null;

    // Loads trail data onto the map and refreshes the totals.
    function loadTrails(filters = {}) {
        const loader = document.getElementById('loading');
        if (loader) loader.style.display = 'block';

        let url = '/api/trails/geojson/';
        const params = new URLSearchParams(filters);
        
        params.set('limit', '10000'); 
        for (const [key, val] of params.entries()) {
            if (!val) params.delete(key); 
        }
        const qs = params.toString();
        if (qs) url += '?' + qs;
        console.log("🔗 Fetching trails:", url);

        fetch(url)
            .then(res => res.json())
            .then(data => {
                console.log("📦 Trails loaded:", data.features?.length || 0);

                if (trailsLayer) map.removeLayer(trailsLayer);
                if (trailsClusterLayer) map.removeLayer(trailsClusterLayer);

                trailsLayer = L.geoJSON(data, {
                    
                    style: (feature) => {
                        const difficulty = (feature.properties.difficulty || "").toLowerCase();
                        let trailColor = '#28a745';
                        if (difficulty === 'moderate') trailColor = '#fd7e14'; 
                        if (difficulty === 'hard') trailColor = '#dc3545';
                        
                        return { color: trailColor, weight: 4, opacity: 0.9 };
                    },

                    // Uses colour-coded dots for trail points.
                    pointToLayer: (feature, latlng) => {
                            const difficulty = (feature.properties.difficulty || "").toLowerCase();
                            
                            let dotColor;
                            if (difficulty === 'easy') {
                                dotColor = '#28a745';
                            } else if (difficulty === 'moderate') {
                                dotColor = '#fd7e14';
                            } else if (difficulty === 'hard') {
                                dotColor = '#dc3545';
                            } else {
                                dotColor = '#6c757d';
                            }

                            return L.circleMarker(latlng, {
                                radius: 6,
                                fillColor: dotColor,
                                color: "#ffffff",
                                weight: 2,
                                opacity: 1,
                                fillOpacity: 0.9
                            });
                    },
                    onEachFeature: (feature, layer) => {
                        const p = feature.properties;
                        layer.bindPopup(`
                            <b>${p.trail_name || 'Unknown Trail'}</b><br>
                            <b>County:</b> ${p.county || "Unknown"}<br>
                            <b>Distance:</b> ${p.distance_km || "?"} km<br>
                            <b>Difficulty:</b> ${p.difficulty || "N/A"}
                        `);
                    }
                }).addTo(map);

                trailsClusterLayer = L.markerClusterGroup();
                trailsClusterLayer.addLayer(trailsLayer);

                const townsCount = townsLayer ? townsLayer.getLayers().length : 0;
                const trailsCount = data.features?.length || 0;
                const currentPop = parseInt(
                    document.getElementById('total-population').textContent.replace(/,/g, "")
                ) || 0;
                
                updateDashboardSummary(trailsCount, townsCount, currentPop);

                if (loader) loader.style.display = 'none';
            })
            .catch(err => {
                console.error('❌ Error loading trails:', err);
                if (loader) loader.style.display = 'none';
            });
    }

    // Collects the current filter values and reloads both datasets.
    function applyFilters() {
        const minLength = document.getElementById('trail-length-min')?.value.trim();
        const maxLength = document.getElementById('trail-length-max')?.value.trim();
        const difficulty = document.getElementById('trail-difficulty-min')?.value.trim().toLowerCase();
        const county = document.getElementById('country-filter')?.value.trim();
        const townType = document.getElementById('town-type-filter')?.value.trim();
        const minTownPop = document.getElementById('town-pop-min')?.value.trim();
        const maxTownPop = document.getElementById('town-pop-max')?.value.trim();
        const trailType = document.getElementById('trail-type-filter')?.value.trim();

        const filters = {};

        if (minLength && !isNaN(minLength)) filters.min_length = minLength;
        if (maxLength && !isNaN(maxLength)) filters.max_length = maxLength;
        if (difficulty && ['easy', 'moderate', 'hard'].includes(difficulty)) {
            filters.difficulty = difficulty;
        }
        if (county && county !== "") {
            filters.county = county;
        }
        if (townType) filters.town_type = townType;
        if (minTownPop) filters.min_population = minTownPop;
        if (maxTownPop) filters.max_population = maxTownPop;
        if (trailType) filters.trail_type = trailType;

        console.log("Selected county:", county);
        console.log("🎯 Applying filters:", filters);
        loadTrails(filters);
        loadTowns(filters);
    }

    // Hooks the filter controls into the dashboard map.
    document.getElementById('apply-filters').addEventListener('click', applyFilters);
    document.getElementById('country-filter')?.addEventListener('change', applyFilters);

    // Clears the form and reloads the full dataset.
    document.getElementById('clear-filters').addEventListener('click', () => {
        document.querySelectorAll('#trail-length-min, #trail-length-max, #trail-difficulty-min, #country-filter, #town-type-filter, #town-pop-min, #town-pop-max, #trail-type-filter')
            .forEach(el => el.value = '');
        loadTrails({});
        loadTowns({});
    });

    
    
    // Switches between clustered and plain trail layers.
    const clusterTrails = document.getElementById('cluster-trails');
    if (clusterTrails) {
        clusterTrails.addEventListener('change', (e) => {
            if (!trailsLayer || !trailsClusterLayer) return;
    
            if (e.target.checked) {
                if (map.hasLayer(trailsLayer)) map.removeLayer(trailsLayer);
                map.addLayer(trailsClusterLayer);
            } else {
                if (map.hasLayer(trailsClusterLayer)) map.removeLayer(trailsClusterLayer);
                map.addLayer(trailsLayer);
            }
        });
    }
    

    // Loads town markers and refreshes the totals.
    function loadTowns(filters = {}) {
        const loader = document.getElementById('loading');
        if (loader) loader.style.display = 'block';

        let url = `/api/trails/towns/geojson/`;
        const params = new URLSearchParams(filters).toString();
        if (params) url += '?' + params;
    
        console.log("🔗 Fetching towns:", url);
    
        fetch(url)
            .then(res => res.json())
            .then(data => {
                console.log("🏘️ Towns loaded:", data.features?.length || 0);
                if (townsLayer) map.removeLayer(townsLayer);
    
                townsLayer = L.geoJSON(data, {
                    pointToLayer: (feature, latlng) => L.marker(latlng, { icon: townIcon }),
                    onEachFeature: (feature, layer) => {
                        const p = feature.properties;
                        layer.bindPopup(`
                            <b>${p.name}</b><br>
                            <b>Type:</b> ${p.town_type || "N/A"}<br>
                            <b>Population:</b> ${p.population ? p.population.toLocaleString() : "N/A"}<br>
                            <b>Area:</b> ${p.area ? p.area + " km²" : "N/A"}<br>
                            <b>Latitude:</b> ${feature.geometry.coordinates[1].toFixed(4)}<br>
                            <b>Longitude:</b> ${feature.geometry.coordinates[0].toFixed(4)}
                        `);
                    }
                }).addTo(map);
    
                const trailsCount = trailsLayer ? trailsLayer.getLayers().length : 0;
                const townsCount = data.features ? data.features.length : 0;
                const totalPop = data.features.reduce((sum, f) => sum + (f.properties.population || 0), 0);
                updateDashboardSummary(trailsCount, townsCount, totalPop);

                if (loader) loader.style.display = 'none';
            })
            .catch(err => {
                console.error('❌ Error loading towns:', err);
                if (loader) loader.style.display = 'none';
            });
    }


    // Hooks the layer toggles into the trail and town layers.
    const showTrails = document.getElementById('show-trails');
    const showTowns = document.getElementById('show-towns');

    if (showTrails) {
        showTrails.addEventListener('change', (e) => {
            if (trailsLayer) {
                if (e.target.checked) map.addLayer(trailsLayer);
                else map.removeLayer(trailsLayer);
            }
        });
    }

    if (showTowns) {
        showTowns.addEventListener('change', (e) => {
            if (townsLayer) {
                if (e.target.checked) map.addLayer(townsLayer);
                else map.removeLayer(townsLayer);
            }
        });
    }

    // Updates the summary cards under the map.
    function updateDashboardSummary(trailsCount = 0, townsCount = 0, totalPopulation = 0) {
        const trailsEl = document.getElementById('trails-count');
        const townsEl = document.getElementById('towns-count');
        const popEl = document.getElementById('total-population');
    
        if (trailsEl) trailsEl.textContent = trailsCount.toLocaleString();
        if (townsEl) townsEl.textContent = townsCount.toLocaleString();
        if (popEl) popEl.textContent = totalPopulation.toLocaleString();
    
        console.log(`📊 Dashboard updated — Trails: ${trailsCount}, Towns: ${townsCount}, Population: ${totalPopulation}`);
    }
    

    // Loads the first set of trails and towns when the page opens.
    loadTrails();
    loadTowns();
});
