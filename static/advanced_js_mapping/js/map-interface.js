// advanced_js_mapping/static/advanced_js_mapping/js/map-interface.js

/**
 * Advanced Mapping Interface Module
 * Handles Leaflet.js map initialization and polygon drawing functionality
 */
window.AdvancedMapping = (function() {
    let map = null;
    let drawControl = null;
    let drawnItems = null;

    /**
     * Initialize the interactive map with drawing tools
     */
    function initializeMap(containerId) {
        try {
            // Create map instance
            map = L.map(containerId).setView([53.3498, -6.2603], 6); // Centered on Ireland

            // Add base tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 18
            }).addTo(map);

            // Expose map globally for other modules that expect it
            window.map = map;

            // Create and expose common layer groups used by analysis/UI modules
            window.citiesLayer = L.layerGroup().addTo(map);
            window.resultsLayer = L.layerGroup().addTo(map);

            // Load initial towns from Trails API and display them
            loadInitialTowns();

            // Basic marker style config expected by spatial-analysis.js
            window.MARKERS = window.MARKERS || {
                result: {
                    color: '#ff5722',
                    weight: 1,
                    fillColor: '#ff8a50',
                    fillOpacity: 0.8,
                    radius: 6
                }
            };

            // Shared state placeholders
            window.currentPolygon = null;
            window.currentResults = null;

            // Lightweight UI helpers used by other modules
            window.AdvancedMapping = window.AdvancedMapping || {};
            window.AdvancedMapping.showLoading = function(show) {
                const el = document.getElementById('loadingIndicator');
                if (el) el.style.display = show ? 'block' : 'none';
            };
            window.AdvancedMapping.showSuccessMessage = function(msg) {
                const status = document.getElementById('searchStatus');
                if (status) {
                    status.textContent = msg;
                    status.className = 'alert alert-success';
                    setTimeout(() => { status.textContent = ''; status.className = 'alert alert-info'; }, 4000);
                }
            };
            window.AdvancedMapping.showErrorMessage = function(msg) {
                const status = document.getElementById('searchStatus');
                if (status) {
                    status.textContent = msg;
                    status.className = 'alert alert-danger';
                    setTimeout(() => { status.textContent = ''; status.className = 'alert alert-info'; }, 6000);
                }
            };

            // Initialize drawing controls
            initializeDrawingControls();

            console.log('Map initialized successfully');

        } catch (error) {
            console.error('Failed to initialize map:', error);
            alert('Failed to load the map. Please refresh the page.');
        }
    }

    /**
     * Set up Leaflet.draw controls for polygon drawing
     */
    function initializeDrawingControls() {
        // Create feature group for drawn items
        drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);

        // Configure drawing options
        const drawControl = new L.Control.Draw({
            position: 'topright',
            draw: {
                polygon: {
                    allowIntersection: false,
                    drawError: {
                        color: '#e1e100',
                        message: '<strong>Error:</strong> Shape edges cannot cross!'
                    },
                    shapeOptions: {
                        color: '#007bff',
                        weight: 3,
                        opacity: 0.8,
                        fillOpacity: 0.2
                    }
                },
                polyline: false,
                rectangle: {
                    shapeOptions: {
                        color: '#007bff',
                        weight: 3,
                        opacity: 0.8,
                        fillOpacity: 0.2
                    }
                },
                circle: false,
                marker: false,
                circlemarker: false
            },
            edit: {
                featureGroup: drawnItems,
                remove: true
            }
        });

        map.addControl(drawControl);

        // Event handlers for drawing
        map.on('draw:created', function(event) {
            const layer = event.layer;
            drawnItems.addLayer(layer);

            // Extract polygon coordinates
            const geoJson = layer.toGeoJSON();
            console.log('Polygon drawn:', geoJson);

            // Track current polygon for other modules
            window.currentPolygon = layer;

            // Trigger spatial analysis (use performSpatialSearch which prepares params)
            if (window.SpatialAnalysis && typeof window.SpatialAnalysis.performSpatialSearch === 'function') {
                window.SpatialAnalysis.performSpatialSearch(geoJson.geometry);
            } else if (window.SpatialAnalysis && typeof window.SpatialAnalysis.executeSpatialQuery === 'function') {
                // Fallback to direct execute (wrap geometry)
                window.SpatialAnalysis.executeSpatialQuery({ polygon: geoJson.geometry });
            }
        });

        map.on('draw:deleted', function(event) {
            console.log('Polygon deleted');
            // Clear current polygon reference and results
            window.currentPolygon = null;
            if (window.UIControls && typeof window.UIControls.clearResults === 'function') window.UIControls.clearResults();
        });

        map.on('draw:edited', function(event) {
            const layers = event.layers;
            layers.eachLayer(function(layer) {
                const geoJson = layer.toGeoJSON();
                console.log('Polygon edited:', geoJson);
                // Update current polygon reference
                window.currentPolygon = layer;
                if (window.SpatialAnalysis && typeof window.SpatialAnalysis.performSpatialSearch === 'function') {
                    window.SpatialAnalysis.performSpatialSearch(geoJson.geometry);
                } else if (window.SpatialAnalysis && typeof window.SpatialAnalysis.executeSpatialQuery === 'function') {
                    window.SpatialAnalysis.executeSpatialQuery({ polygon: geoJson.geometry });
                }
            });
        });
    }

    /**
     * Add cities as markers to the map
     */
    function displayCitiesOnMap(cities) {
        // Clear existing city markers (use citiesLayer to manage them)
        if (window.citiesLayer) {
            window.citiesLayer.clearLayers();
        }

        // Add new city markers into the citiesLayer
        cities.forEach(function(city) {
            const marker = L.marker([city.latitude, city.longitude], {
                cityMarker: true
            });
            marker.bindPopup(createCityPopupContent(city));
            if (window.citiesLayer) {
                window.citiesLayer.addLayer(marker);
            } else {
                marker.addTo(map);
            }
        });

    }

    /**
     * Fetch initial towns from the Trails API and add to `citiesLayer`.
     */
    async function loadInitialTowns() {
        try {
            const res = await fetch('/api/trails/towns/geojson/');
            if (!res.ok) throw new Error('Failed to fetch towns');
            const geojson = await res.json();

            // Clear existing town markers
            if (window.citiesLayer) window.citiesLayer.clearLayers();

            if (geojson && geojson.features) {
                geojson.features.forEach(f => {
                    try {
                        const coords = f.geometry.coordinates;
                        const props = f.properties || {};
                        const lat = coords[1];
                        const lng = coords[0];

                        const marker = L.marker([lat, lng]);
                        const popup = `
                            <div class="city-popup">
                                <strong>${props.name || props.ENGLISH || 'Unknown'}</strong><br/>
                                <small>Population: ${props.population ? props.population.toLocaleString() : 'N/A'}</small>
                            </div>`;
                        marker.bindPopup(popup);
                        window.citiesLayer.addLayer(marker);
                    } catch (e) {
                        console.warn('Failed to add town marker', e);
                    }
                });
            }
        } catch (err) {
            console.warn('Could not load initial towns:', err);
        }
    }

    function createCityPopupContent(city) {
        return `
            <div class="city-popup">
                <h6>${city.name}</h6>
                <p><strong>Country:</strong> ${city.country}</p>
                <p><strong>Population:</strong> ${city.population?.toLocaleString() || 'N/A'}</p>
                <p><strong>Type:</strong> ${city.city_type || 'N/A'}</p>
                ${city.gdp_per_capita ? `<p><strong>GDP per Capita:</strong> ${city.gdp_per_capita}</p>` : ''}
            </div>
        `;
    }

    /**
     * Get reference to the map instance
     */
    function getMap() {
        return map;
    }

    // Public API
    return {
        initializeMap: initializeMap,
        displayCitiesOnMap: displayCitiesOnMap,
        getMap: getMap
    };
})();


// Ensure helper functions exist on the exported AdvancedMapping object
if (window.AdvancedMapping) {
    window.AdvancedMapping.showLoading = window.AdvancedMapping.showLoading || function(show) {
        const el = document.getElementById('loadingIndicator');
        if (el) el.style.display = show ? 'block' : 'none';
    };

    window.AdvancedMapping.showSuccessMessage = window.AdvancedMapping.showSuccessMessage || function(msg) {
        const status = document.getElementById('searchStatus');
        if (status) {
            status.textContent = msg;
            status.className = 'alert alert-success';
            setTimeout(() => { status.textContent = ''; status.className = 'alert alert-info'; }, 4000);
        }
    };

    window.AdvancedMapping.showErrorMessage = window.AdvancedMapping.showErrorMessage || function(msg) {
        const status = document.getElementById('searchStatus');
        if (status) {
            status.textContent = msg;
            status.className = 'alert alert-danger';
            setTimeout(() => { status.textContent = ''; status.className = 'alert alert-info'; }, 6000);
        }
    };
}
