console.log("✅ dashboard_map.js loaded");

document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Initializing dashboard map...");

    // ✅ Prevent multiple Leaflet initializations
    const existingMap = L.DomUtil.get('map');
    if (existingMap !== null) {
        existingMap._leaflet_id = null;
    }

    // ✅ Initialize map
    const map = L.map('map').setView([53.4, -8.2], 7);

    // 🗺️ Base tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // 🟩 Custom icons
    const trailIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41]
    });

    const townIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41]
    });


    let trailsLayer = null;
    let trailsClusterLayer = null;
    let townsLayer = null;

    
    function loadTrails(filters = {}) {
        let url = '/api/trails/geojson/';
        const params = new URLSearchParams(filters);
        for (const [key, val] of params.entries()) {
            if (!val) params.delete(key); // remove empty
        }
        const qs = params.toString();
        if (qs) url += '?' + qs;
        console.log("🔗 Fetching trails:", url);
    
        fetch(url)
            .then(res => res.json())
            .then(data => {
                console.log("📦 Trails loaded:", data.features?.length || 0);

    
                // Remove previous layers
                if (trailsLayer) map.removeLayer(trailsLayer);
                if (trailsClusterLayer) map.removeLayer(trailsClusterLayer);
    
                // Base trails layer
                trailsLayer = L.geoJSON(data, {
                    style: (feature) => ({
                        color: '#2ecc71',   // bright green for trails
                        weight: 3,
                        opacity: 0.9
                    }),
                    pointToLayer: (feature, latlng) => L.marker(latlng, { icon: trailIcon }),
                    onEachFeature: (feature, layer) => {
                        const p = feature.properties;
                        
                
                        // Bind popup for both line and point trails
                        layer.bindPopup(`
                            <b>${p.trail_name || 'Unknown Trail'}</b><br>
                            <b>County:</b> ${p.county || "Unknown"}<br>
                            <b>Distance:</b> ${p.distance_km || "?"} km<br>
                            <b>Difficulty:</b> ${p.difficulty || "N/A"}
                        `);
                    }
                }).addTo(map);


                // Cluster version
                trailsClusterLayer = L.markerClusterGroup();
                trailsClusterLayer.addLayer(trailsLayer);
    
                // Default show normal trails
                const townsCount = townsLayer ? townsLayer.getLayers().length : 0;
                const trailsCount = data.features?.length || 0;
                const currentPop = parseInt(
                    document.getElementById('total-population').textContent.replace(/,/g, "")
                ) || 0;
                
                updateDashboardSummary(trailsCount, townsCount, currentPop);
        })
        .catch(err => console.error('❌ Error loading trails:', err));
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
            })
            .catch(err => console.error('❌ Error loading towns:', err));
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
