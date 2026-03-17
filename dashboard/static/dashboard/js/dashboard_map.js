console.log("✅ dashboard_map.js loaded");

document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Initializing dashboard map...");

    // ✅ Prevent multiple Leaflet initializations
    const existingMap = L.DomUtil.get('map');
    if (existingMap !== null) {
        existingMap._leaflet_id = null;
    }

    // ✅ Initialize map
    // Define the corners of the box around Ireland
    const southWest = L.latLng(51.0, -11.0); // Bottom left (Atlantic)
    const northEast = L.latLng(55.5, -5.0);  // Top right (North Channel/Irish Sea)
    const bounds = L.latLngBounds(southWest, northEast);

    // Initialize map with restricted bounds
    const map = L.map('map', {
        maxBounds: bounds,         // Restricts panning
        maxBoundsViscosity: 1.0,   // Makes the bounds "hard" (bounces back)
        minZoom: 7.2,                // Prevents zooming out to see the whole world
        maxZoom: 20
    }).setView([53.4, -8.2], 7.3);

    // 🗺️ Base tile layer - Updated to CartoDB to fix 403 Access Blocked
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // 🟩 Custom icons
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

    
    function loadTrails(filters = {}) {
        const loader = document.getElementById('loading');
        if (loader) loader.style.display = 'block'; // Start the spinner

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
                        let trailColor = '#28a745'; // Default Green
                        if (difficulty === 'moderate') trailColor = '#fd7e14'; 
                        if (difficulty === 'hard') trailColor = '#dc3545';
                        
                        return { color: trailColor, weight: 4, opacity: 0.9 };
                    },

                    // This part handles the Pins (Markers)
                    pointToLayer: (feature, latlng) => {
                            const difficulty = (feature.properties.difficulty || "").toLowerCase();
                            
                            // Define the Traffic Light colors for the dots
                            let dotColor;
                            if (difficulty === 'easy') {
                                dotColor = '#28a745'; // Green
                            } else if (difficulty === 'moderate') {
                                dotColor = '#fd7e14'; // Orange
                            } else if (difficulty === 'hard') {
                                dotColor = '#dc3545'; // Red
                            } else {
                                dotColor = '#6c757d'; // Grey for unknown
                            }

                            // Return a CircleMarker instead of a standard Marker
                            return L.circleMarker(latlng, {
                                radius: 6,               // Size of the dot
                                fillColor: dotColor,     // The "Traffic Light" color
                                color: "#ffffff",        // White border (makes it pop)
                                weight: 2,               // Border thickness
                                opacity: 1,
                                fillOpacity: 0.9         // Slight transparency
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

                // STOP THE SPINNER HERE 
                if (loader) loader.style.display = 'none';
            })
            .catch(err => {
                console.error('❌ Error loading trails:', err);
                //  STOP THE SPINNER 
                if (loader) loader.style.display = 'none';
            });
    }


// Apply filters when the user clicks
document.getElementById('apply-filters').addEventListener('click', () => {
    const minLength = document.getElementById('trail-length-min')?.value.trim();
    const maxLength = document.getElementById('trail-length-max')?.value.trim();
    const difficulty = document.getElementById('trail-difficulty-min')?.value.trim().toLowerCase();
    const county = document.getElementById('country-filter')?.value.trim();
    const townType = document.getElementById('town-type-filter')?.value.trim();
    const minTownPop = document.getElementById('town-pop-min')?.value.trim();
    const maxTownPop = document.getElementById('town-pop-max')?.value.trim();
    const trailType = document.getElementById('trail-type-filter')?.value.trim();

    const filters = {};

    // Add filters only if valid values are provided
    if (minLength && !isNaN(minLength)) filters.min_length = minLength;
    if (maxLength && !isNaN(maxLength)) filters.max_length = maxLength;
    if (difficulty && ['easy', 'moderate', 'hard'].includes(difficulty))
        filters.difficulty = difficulty;
    if (county) filters.county = county;
    if (townType) filters.town_type = townType;
    if (minTownPop) filters.min_population = minTownPop;
    if (maxTownPop) filters.max_population = maxTownPop;
    if (trailType) filters.trail_type = trailType;


    console.log("🎯 Applying filters:", filters);
    loadTrails(filters);
    loadTowns(filters);
});

// Clear filters when the user clicks
document.getElementById('clear-filters').addEventListener('click', () => {
    document.querySelectorAll('#trail-length-min, #trail-length-max, #trail-difficulty-min, #country-filter')
        .forEach(el => el.value = '');
    loadTrails({});
});

    
    
    // ✅ Cluster toggle
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
    

    // ✅ Load Towns
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


    // ✅ Toggles
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

    function updateDashboardSummary(trailsCount = 0, townsCount = 0, totalPopulation = 0) {
        const trailsEl = document.getElementById('trails-count');
        const townsEl = document.getElementById('towns-count');
        const popEl = document.getElementById('total-population');
    
        if (trailsEl) trailsEl.textContent = trailsCount.toLocaleString();
        if (townsEl) townsEl.textContent = townsCount.toLocaleString();
        if (popEl) popEl.textContent = totalPopulation.toLocaleString();
    
        console.log(`📊 Dashboard updated — Trails: ${trailsCount}, Towns: ${townsCount}, Population: ${totalPopulation}`);
    }
    


    // ✅ Initial load
    loadTrails();
    loadTowns();



    
});
