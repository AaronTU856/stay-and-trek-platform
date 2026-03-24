// advanced_js_mapping/static/advanced_js_mapping/js/map-interface.js

/**
 * Advanced Mapping Interface Module
 * Handles Leaflet.js map initialization and polygon drawing functionality
 */


// Detect if running on Cloud Run or locally (Docker)
let API_BASE = "";

if (window.location.hostname.includes("run.app")) {
    // Production (Cloud Run) backend URL
    API_BASE = "https://stay-and-trek-service-642845720185.europe-west1.run.app";
} else {
    // Local development (Docker)
    API_BASE = "";
}


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
            map = L.map(containerId).setView([53.3598, -7.7603], 7.4); // Centered on Ireland

            // Add base tile layer
           L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 20
            }).addTo(map);

            // Smoothly fly in to Ireland after 1 second
            setTimeout(() => {
                map.flyTo([53.35, -7.8], 7, {
                    duration: 2.5,
                    easeLinearity: 0.1
                });
            }, 1000);

            // Expose map globally for other modules that expect it
            window.map = map;

            // Ensure Leaflet default icon URLs point to local static files so markers render correctly.
            // Use explicit absolute static URLs to avoid path resolution issues.
            try {
                if (L && L.Icon && L.Icon.Default) {
                    L.Icon.Default.mergeOptions({
                        iconUrl: '/static/leaflet/images/marker-icon.png',
                        iconRetinaUrl: '/static/leaflet/images/marker-icon-2x.png',
                        shadowUrl: '/static/leaflet/images/marker-shadow.png'
                    });
                }
            } catch (e) {
                // Icon settings failed silently
            }

            // Create and expose common layer groups used by analysis/UI modules
            // Use FeatureGroup so we can call getBounds() and treat it as a group of features
            window.citiesLayer = L.featureGroup().addTo(map);
            window.resultsLayer = L.featureGroup().addTo(map);

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

            // Explicit result marker icon to avoid icon path resolution issues
            // Using blue colored markers from GitHub CDN to match dashboard style
            try {
                window.resultMarkerIcon = L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                });
            } catch (e) {
                // Result marker icon creation failed, use default
                window.resultMarkerIcon = null;
            }

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


            // Add Legend Control
            const legend = L.control({ position: 'bottomleft' });

            legend.onAdd = function() {
                const div = L.DomUtil.create('div', 'map-legend');
                
                // Inline Styles to guarantee visibility
                div.style.backgroundColor = 'white';
                div.style.padding = '10px';
                div.style.border = '2px solid #2E8B57';
                div.style.borderRadius = '8px';
                div.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
                div.style.fontSize = '12px';
                div.style.lineHeight = '1.5';
                div.style.minWidth = '140px';

                div.style.pointerEvents = 'auto';

                div.innerHTML = `
                    <div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #eee; color: #23624A;">MAP KEY</div>
                    <div style="display: flex; align-items: center; margin-bottom: 4px;">
                        <span style="position: relative; width: 14px; height: 14px; background: #3f88c5; border-radius: 50%; display: inline-block; margin-right: 8px; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.08);">
                            <span style="position: absolute; top: 50%; left: 50%; width: 5px; height: 5px; background: #fff; border-radius: 50%; transform: translate(-50%, -50%);"></span>
                        </span>
                        <span>Towns with Population Data</span>
                    </div>
                    <div style="display: flex; align-items: center; margin-bottom: 4px;">
                        <span style="width: 18px; height: 0; border-top: 3px dashed #2E8B57; display: inline-block; margin-right: 8px;"></span>
                        <span>Polygon Search</span>
                    </div>
                    <div style="display: flex; align-items: center;">
                        <span style="display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 20px; margin-right: 8px; color: #dc3545; font-size: 18px; line-height: 1;">📍</span>
                        <span>Town Location</span>
                    </div>
                `;
                return div;
            };

            L.control.scale({ imperial: false, position: 'bottomright' }).addTo(map);

            legend.addTo(map);



            // Add a small helper control to finish a polygon drawing if the draw:created
            // event does not fire in some environments. This control finds the last
            // polygon layer on the map and triggers the spatial search.
            const FinishDrawControl = L.Control.extend({
                options: { position: 'topright' },
                onAdd: function() {
                    const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                    const btn = L.DomUtil.create('a', '', container);
                    btn.href = '#';
                    btn.title = 'Finish Draw (fallback)';
                    btn.innerHTML = '&#10003;';
                    btn.style.padding = '6px';
                    btn.style.fontSize = '16px';
                    L.DomEvent.on(btn, 'click', L.DomEvent.stop)
                        .on(btn, 'click', () => {
                            try {
                                let lastPoly = null;
                                map.eachLayer(function(layer) {
                                    // detect polygons (exclude tile layers and marker groups)
                                    if (layer instanceof L.Polygon && !(layer instanceof L.Rectangle) && layer._latlngs) {
                                        lastPoly = layer;
                                    }
                                });
                                if (lastPoly) {
                                    lastPoly.setStyle({
                                        color: '#2E8B57',
                                        weight: 4,
                                        opacity: 1,
                                        fillColor: '#90EE90',
                                        fillOpacity: 0.15
                                    });
                                    const geoJson = lastPoly.toGeoJSON();
                                    try { if (drawnItems && drawnItems.getLayers && drawnItems.getLayers().indexOf(lastPoly) === -1) drawnItems.addLayer(lastPoly); } catch (e) {}
                                    if (window.SpatialAnalysis && typeof window.SpatialAnalysis.performSpatialSearch === 'function') {
                                        window.SpatialAnalysis.performSpatialSearch(geoJson.geometry);
                                    } else if (window.SpatialAnalysis && typeof window.SpatialAnalysis.executeSpatialQuery === 'function') {
                                        window.SpatialAnalysis.executeSpatialQuery({ polygon: geoJson.geometry });
                                    }
                                }
                            } catch (err) {
                                // Finish button click failed silently
                            }
                        });
                    return container;
                }
            });
            map.addControl(new FinishDrawControl());

        } catch (error) {
            // Map initialization failed silently
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
                        color: '#2E8B57',      // Green (brand color for visibility)
                        weight: 4,              // Thicker line
                        opacity: 1,             // Fully opaque outline
                        fillColor: '#90EE90',   // Light green fill
                        fillOpacity: 0.15      // Subtle fill
                    },
                    metric: true
                },
                polyline: false,
                rectangle: {
                    shapeOptions: {
                        color: '#2E8B57',
                        weight: 4,
                        opacity: 1,
                        fillColor: '#90EE90',
                        fillOpacity: 0.15
                    },
                    metric: true
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
        // CRITICAL WORKAROUND: Leaflet.Draw 1.0.4 has click handling issues in some environments
        // Create a manual polygon drawing system as fallback
        let manualPolygonMode = false;
        let manualPolygonPoints = [];
        let manualPolygonLayer = null;
        
        // Hook into polygon button click to enable manual drawing mode
        setTimeout(() => {
            const polygonBtn = document.querySelector('.leaflet-draw-draw-polygon');
            if (polygonBtn) {
                polygonBtn.addEventListener('click', function(e) {
                    setTimeout(() => {
                        manualPolygonMode = true;
                        manualPolygonPoints = [];
                        attachFinishButtonHandler();
                    }, 50);
                });
            }
        }, 600);
        
        // Attach finish button handler
        function attachFinishButtonHandler() {
            setTimeout(() => {
                let finishBtn = document.querySelector('.leaflet-draw-actions a');
                
                if (finishBtn && !finishBtn._hasFinishHandler) {
                    finishBtn._hasFinishHandler = true;
                    finishBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        finishManualPolygon();
                    });
                }
            }, 100);
        }
        
        // Hook into cancel button to disable manual mode
        map.on('draw:drawstop', function() {
            manualPolygonMode = false;
            manualPolygonPoints = [];
        });
        
        // Capture map clicks during manual polygon mode
        map.on('click', function(e) {
            if (manualPolygonMode && e.originalEvent) {
                // Make sure this click isn't from a UI element
                if (e.originalEvent.target.closest('.leaflet-draw')) return;
                
                manualPolygonPoints.push([e.latlng.lat, e.latlng.lng]);
                
                // Remove old preview layer if exists
                if (manualPolygonLayer) {
                    map.removeLayer(manualPolygonLayer);
                }
                
                // Draw preview of polygon so far
                if (manualPolygonPoints.length > 1) {
                    manualPolygonLayer = L.polyline(manualPolygonPoints, {
                        color: '#2E8B57',
                        weight: 4,
                        opacity: 1,
                        dashArray: '5, 5'
                    }).addTo(map);
                }
            }
        });
        
        // Support double-click to finish polygon
        map.on('dblclick', function(e) {
            if (manualPolygonMode && manualPolygonPoints.length > 2) {
                finishManualPolygon();
            }
        });
        
        // Finish manual polygon
        function finishManualPolygon() {
            console.log('📍 finishManualPolygon called, mode:', manualPolygonMode, 'points:', manualPolygonPoints.length);
            if (manualPolygonMode && manualPolygonPoints.length > 2) {
                const closedRing = [...manualPolygonPoints, manualPolygonPoints[0]];
                const polygon = L.polygon(closedRing, {
                    color: '#2E8B57',
                    weight: 4,
                    opacity: 1,
                    fillColor: '#90EE90',
                    fillOpacity: 0.15
                });
                
                polygon.addTo(map);
                drawnItems.addLayer(polygon);
                
                const geoJson = polygon.toGeoJSON();
                window.currentPolygon = polygon;
                manualPolygonMode = false;
                manualPolygonPoints = [];
                
                // Clean up preview layer
                if (manualPolygonLayer) {
                    map.removeLayer(manualPolygonLayer);
                    manualPolygonLayer = null;
                }
                
                console.log('✅ Polygon created, triggering spatial search...');
                // Trigger spatial search
                if (window.SpatialAnalysis && typeof window.SpatialAnalysis.performSpatialSearch === 'function') {
                    window.SpatialAnalysis.performSpatialSearch(geoJson.geometry);
                } else {
                    console.warn('❌ SpatialAnalysis.performSpatialSearch not available');
                }
                
                // Fire draw:created event
                map.fire('draw:created', { layer: polygon });
            } else {
                console.warn('⚠️ finishManualPolygon: mode=' + manualPolygonMode + ', points=' + manualPolygonPoints.length);
            }
        }

        // Event handlers for drawing
        map.on('draw:created', function(event) {
            const layer = event.layer;
            
            // Apply explicit polygon styling to ensure visibility
            if (layer instanceof L.Polygon) {
                layer.setStyle({
                    color: '#2E8B57',
                    weight: 4,
                    opacity: 1,
                    fillColor: '#90EE90',
                    fillOpacity: 0.15
                });
            }
            
            drawnItems.addLayer(layer);

            // Extract polygon coordinates
            const geoJson = layer.toGeoJSON();

            // Track current polygon for other modules
            window.currentPolygon = layer;

            // Trigger spatial analysis
            if (window.SpatialAnalysis && typeof window.SpatialAnalysis.performSpatialSearch === 'function') {
                window.SpatialAnalysis.performSpatialSearch(geoJson.geometry);
            } else if (window.SpatialAnalysis && typeof window.SpatialAnalysis.executeSpatialQuery === 'function') {
                window.SpatialAnalysis.executeSpatialQuery({ polygon: geoJson.geometry });
            }
        });

        map.on('draw:deleted', function(event) {
            // Clear current polygon reference and results
            window.currentPolygon = null;
            if (window.UIControls && typeof window.UIControls.clearResults === 'function') window.UIControls.clearResults();
        });

        map.on('draw:edited', function(event) {
            const layers = event.layers;
            layers.eachLayer(function(layer) {
                if (layer instanceof L.Polygon) {
                    layer.setStyle({
                        color: '#2E8B57',
                        weight: 4,
                        opacity: 1,
                        fillColor: '#90EE90',
                        fillOpacity: 0.15
                    });
                }
                const geoJson = layer.toGeoJSON();
                window.currentPolygon = layer;
                if (window.SpatialAnalysis && typeof window.SpatialAnalysis.performSpatialSearch === 'function') {
                    window.SpatialAnalysis.performSpatialSearch(geoJson.geometry);
                } else if (window.SpatialAnalysis && typeof window.SpatialAnalysis.executeSpatialQuery === 'function') {
                    window.SpatialAnalysis.executeSpatialQuery({ polygon: geoJson.geometry });
                }
            });
        });

        map.on('draw:drawstart', function() {
            const container = map.getContainer();
            if (container) {
                container.style.cursor = 'crosshair';
                container.classList.add('awmdrawing');
            }
        });

        map.on('draw:drawstop', function() {
            const container = map.getContainer();
            if (container) {
                container.style.cursor = '';
                container.classList.remove('awmdrawing');
            }
            // Fallback: some Leaflet builds may not emit draw:created reliably.
            // If no `window.currentPolygon` was set by draw:created but drawnItems
            // contains a new layer, use the last layer as the drawn polygon and
            // Fallback: trigger spatial search if draw:created didn't fire
            try {
                if (!window.currentPolygon && drawnItems && drawnItems.getLayers && drawnItems.getLayers().length > 0) {
                    const layers = drawnItems.getLayers();
                    const lastLayer = layers[layers.length - 1];
                    if (lastLayer) {
                        if (lastLayer instanceof L.Polygon) {
                            lastLayer.setStyle({
                                color: '#2E8B57',
                                weight: 4,
                                opacity: 1,
                                fillColor: '#90EE90',
                                fillOpacity: 0.15
                            });
                        }
                        const geoJson = lastLayer.toGeoJSON();
                        window.currentPolygon = lastLayer;
                        if (window.SpatialAnalysis && typeof window.SpatialAnalysis.performSpatialSearch === 'function') {
                            window.SpatialAnalysis.performSpatialSearch(geoJson.geometry);
                        } else if (window.SpatialAnalysis && typeof window.SpatialAnalysis.executeSpatialQuery === 'function') {
                            window.SpatialAnalysis.executeSpatialQuery({ polygon: geoJson.geometry });
                        }
                    }
                }
            } catch (fallbackErr) {
                // Fallback failed silently
            }
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
        // Display cities on map

        // Add new city markers into the citiesLayer
        cities.forEach(function(city, idx) {
            try {
                const lat = Number(city.latitude);
                const lng = Number(city.longitude);
                if (!isFinite(lat) || !isFinite(lng)) {
                    return;
                }

                const markerOpts = { cityMarker: true };
                if (window.resultMarkerIcon) markerOpts.icon = window.resultMarkerIcon;
                const marker = L.marker([lat, lng], markerOpts);
                marker.bindPopup(createCityPopupContent(city));
                if (window.citiesLayer) {
                    window.citiesLayer.addLayer(marker);
                } else {
                    marker.addTo(map);
                }
            } catch (e) {
                // Marker addition failed silently
            }
        });

        // Fit bounds to displayed cities
        try {
            if (window.citiesLayer && window.citiesLayer.getLayers().length > 0) {
                const bounds = window.citiesLayer.getBounds();
                if (bounds.isValid()) {
                    map.fitBounds(bounds.pad(0.1));
                }
            }
        } catch (e) {
            // Bounds fitting failed silently
        }

        // Fallback: if we had cities but no marker icons were added, use circleMarker
        try {
            const added = window.citiesLayer ? window.citiesLayer.getLayers().length : 0;
            if (cities.length > 0 && added === 0) {
                cities.forEach(function(city, idx) {
                    try {
                        const lat = Number(city.latitude);
                        const lng = Number(city.longitude);
                        if (!isFinite(lat) || !isFinite(lng)) return;
                        const cm = L.circleMarker([lat, lng], {
                            radius: 6,
                            color: '#ff5722',
                            fillColor: '#ff8a50',
                            fillOpacity: 0.9
                        }).bindPopup(createCityPopupContent(city));
                        if (window.citiesLayer) window.citiesLayer.addLayer(cm); else cm.addTo(map);
                    } catch (e) {
                        // Fallback marker addition failed silently
                    }
                });
                try {
                    if (window.citiesLayer && window.citiesLayer.getLayers().length > 0) map.fitBounds(window.citiesLayer.getBounds().pad(0.1));
                } catch (e) { }
            }
        } catch (e) {
            // Fallback logic failed silently
        }

    }

    /**
     * Fetch initial towns from the Trails API and add to `citiesLayer`.
     */
    async function loadInitialTowns() {
        try {
            const res = await fetch(`${API_BASE}/api/trails/towns/geojson/`);

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

                        const markerOpts = {};
                        if (window.resultMarkerIcon) markerOpts.icon = window.resultMarkerIcon;
                        const marker = L.marker([lat, lng], markerOpts);
                        const popup = `
                            <div class="city-popup">
                                <strong>${props.name || props.ENGLISH || 'Unknown'}</strong><br/>
                                <small>Population: ${props.population ? props.population.toLocaleString() : 'N/A'}</small>
                            </div>`;
                        marker.bindPopup(popup);
                        window.citiesLayer.addLayer(marker);
                    } catch (e) {
                        // Town marker addition failed silently
                    }
                });
            }
        } catch (err) {
            // Town loading failed silently
        }
    }

    function createCityPopupContent(city) {
        const imageUrl = `https://loremflickr.com/300/150/ireland,town/all?lock=${city.id || 1}`;

        return `
            <div class="city-popup" style="width: 200px;">
                <img src="${imageUrl}" class="img-fluid rounded mb-2" alt="${city.name}">
                <h6 class="fw-bold mb-1">${city.name}</h6>
                <div class="small text-muted mb-2">
                    <i class="bi bi-people"></i> Pop: ${city.population?.toLocaleString() || 'N/A'}
                </div>
                <a href="/towns/${city.id}" class="btn btn-sm btn-map-primary w-100" style="color:white; font-size:12px;">
                    View Trekking Routes
                </a>
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
