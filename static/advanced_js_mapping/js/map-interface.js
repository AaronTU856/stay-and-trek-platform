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
                console.warn('Could not set Leaflet default icon options:', e);
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
            try {
                window.resultMarkerIcon = L.icon({
                    iconUrl: '/static/leaflet/images/marker-icon.png',
                    iconRetinaUrl: '/static/leaflet/images/marker-icon-2x.png',
                    shadowUrl: '/static/leaflet/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                });
            } catch (e) {
                console.warn('Could not create explicit resultMarkerIcon', e);
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
                                    console.log('FinishDrawControl: found polygon, invoking spatial search');
                                    // Apply styling if not already applied
                                    lastPoly.setStyle({
                                        color: '#2E8B57',
                                        weight: 4,
                                        opacity: 1,
                                        fillColor: '#90EE90',
                                        fillOpacity: 0.15
                                    });
                                    const geoJson = lastPoly.toGeoJSON();
                                    // add to drawnItems if not already present
                                    try { if (drawnItems && drawnItems.getLayers && drawnItems.getLayers().indexOf(lastPoly) === -1) drawnItems.addLayer(lastPoly); } catch (e) {}
                                    if (window.SpatialAnalysis && typeof window.SpatialAnalysis.performSpatialSearch === 'function') {
                                        window.SpatialAnalysis.performSpatialSearch(geoJson.geometry);
                                    } else if (window.SpatialAnalysis && typeof window.SpatialAnalysis.executeSpatialQuery === 'function') {
                                        window.SpatialAnalysis.executeSpatialQuery({ polygon: geoJson.geometry });
                                    }
                                } else {
                                    console.warn('FinishDrawControl: no polygon layer found on the map');
                                }
                            } catch (err) {
                                console.warn('FinishDrawControl error', err);
                            }
                        });
                    return container;
                }
            });
            map.addControl(new FinishDrawControl());

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
        
        console.log('✓ Created drawnItems FeatureGroup');

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
        console.log('✓ Added draw control to map');

        // Manually trigger polygon drawing mode immediately after control is added
        // This ensures Leaflet.Draw properly initializes the polygon handler
        setTimeout(() => {
            try {
                console.log('Initializing polygon drawing mode...');
                if (drawControl._modes && drawControl._modes.polygon) {
                    console.log('  Polygon mode available, enabling...');
                    // The draw control button click will trigger the mode
                    const polygonBtn = document.querySelector('.leaflet-draw-draw-polygon');
                    if (polygonBtn) {
                        console.log('  Found polygon button, clicking to initialize mode');
                        polygonBtn.click();
                        // Then cancel to return to default state, but with mode initialized
                        setTimeout(() => {
                            const cancelBtn = document.querySelector('.leaflet-draw-actions a[title="Cancel drawing"]');
                            if (cancelBtn) {
                                console.log('  Auto-canceling to return to idle state');
                                cancelBtn.click();
                            }
                        }, 100);
                    }
                } else {
                    console.warn('Polygon mode not available - checking for L.Draw.Polygon');
                    if (L.Draw && L.Draw.Polygon) {
                        console.log('  L.Draw.Polygon found, it should be usable');
                    }
                }
            } catch (e) {
                console.warn('Could not pre-initialize polygon mode:', e);
            }
        }, 500);

        // Add explicit polygon event listeners to catch draw events
        map.on('draw:drawstart', function(event) {
            console.log('draw:drawstart - mode:', event);
        });
        
        map.on('draw:drawVertex', function(event) {
            console.log('draw:drawVertex - vertex added');
        });
        
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
                    // After official button handler runs, enable our manual mode
                    setTimeout(() => {
                        manualPolygonMode = true;
                        manualPolygonPoints = [];
                        console.log('✓ Manual polygon drawing mode ENABLED');
                        
                        // NOW attach finish button handler (button appears after polygon mode activates)
                        attachFinishButtonHandler();
                    }, 50);
                });
            }
        }, 600);
        
        // Function to attach finish button handler (called after polygon mode activates)
        function attachFinishButtonHandler() {
            console.log('Looking for finish button to attach handler...');
            
            // Give DOM time to update with the finish button
            setTimeout(() => {
                let finishBtn = document.querySelector('.leaflet-draw-actions a');
                
                if (finishBtn && !finishBtn._hasFinishHandler) {
                    finishBtn._hasFinishHandler = true;
                    console.log('✓ Attaching click handler to finish button');
                    finishBtn.addEventListener('click', function(e) {
                        console.log('✓ Finish button clicked, calling finishManualPolygon()');
                        e.preventDefault();
                        e.stopPropagation();
                        finishManualPolygon();
                    });
                } else if (finishBtn) {
                    console.log('Finish button already has handler');
                } else {
                    console.warn('Finish button still not found');
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
                console.log(`✓ Polygon vertex map-interface.js:347 added (${manualPolygonPoints.length}): [${e.latlng.lat}, ${e.latlng.lng}]`);
                
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
        
        // Also support double-click to finish polygon
        map.on('dblclick', function(e) {
            if (manualPolygonMode && manualPolygonPoints.length > 2) {
                console.log('✓ Double-click detected, finishing polygon via dblclick');
                // Trigger the finish logic directly
                finishManualPolygon();
            }
        });
        
        // Helper function to finish manual polygon
        function finishManualPolygon() {
            if (manualPolygonMode && manualPolygonPoints.length > 2) {
                console.log(`✓ finishManualPolygon() called with ${manualPolygonPoints.length} vertices`);
                
                // Create final polygon and add to drawnItems
                const closedRing = [...manualPolygonPoints, manualPolygonPoints[0]]; // Close the ring
                const polygon = L.polygon(closedRing, {
                    color: '#2E8B57',
                    weight: 4,
                    opacity: 1,
                    fillColor: '#90EE90',
                    fillOpacity: 0.15
                });
                
                polygon.addTo(map);
                drawnItems.addLayer(polygon);
                
                // Create GeoJSON for spatial search
                const geoJson = polygon.toGeoJSON();
                console.log('✓ Created polygon GeoJSON:', geoJson);
                
                window.currentPolygon = polygon;
                manualPolygonMode = false;
                manualPolygonPoints = [];
                
                // Clean up preview layer
                if (manualPolygonLayer) {
                    map.removeLayer(manualPolygonLayer);
                    manualPolygonLayer = null;
                }
                
                // Trigger spatial search
                if (window.SpatialAnalysis && typeof window.SpatialAnalysis.performSpatialSearch === 'function') {
                    console.log('✓ Calling performSpatialSearch with geometry:', geoJson.geometry);
                    window.SpatialAnalysis.performSpatialSearch(geoJson.geometry);
                } else {
                    console.warn('⚠️ SpatialAnalysis.performSpatialSearch not available');
                }
                
                // Simulate draw:created event for compatibility
                map.fire('draw:created', { layer: polygon });
            } else {
                console.warn('Cannot finish: manualPolygonMode=', manualPolygonMode, 'points=', manualPolygonPoints.length);
            }
        }

        // Attach click listeners to draw toolbar buttons as a fallback
        // Some Leaflet/Draw builds don't emit drawstart reliably in this environment
        setTimeout(() => {
            try {
                const toolbar = document.querySelector('.leaflet-draw-toolbar');
                if (toolbar) {
                    toolbar.addEventListener('click', function(e) {
                        const btn = e.target.closest('a');
                        if (!btn) return;
                        // If polygon button clicked, set drawing class
                        if (btn.classList.contains('leaflet-draw-draw-polygon')) {
                            const container = map.getContainer();
                            if (container) {
                                container.classList.add('awmdrawing');
                                console.log('toolbar: polygon button clicked - awmdrawing class added');
                            }
                        }
                    });
                }
            } catch (e) {
                console.warn('Could not attach draw toolbar listeners', e);
            }
        }, 500);

        // Event handlers for drawing
        map.on('draw:created', function(event) {
            const layer = event.layer;
            
            // Apply explicit polygon styling to ensure visibility
            // (shapeOptions may not apply correctly in some Leaflet.Draw versions)
            if (layer instanceof L.Polygon) {
                layer.setStyle({
                    color: '#2E8B57',      // Green (brand color)
                    weight: 4,              // Thicker line
                    opacity: 1,             // Fully opaque
                    fillColor: '#90EE90',   // Light green
                    fillOpacity: 0.15
                });
                console.log('  Applied explicit polygon styles to layer');
            }
            
            drawnItems.addLayer(layer);

            // Extract polygon coordinates
            const geoJson = layer.toGeoJSON();
            console.log('✓ draw:created fired - Polygon drawn:', geoJson);
            console.log('  Layer type:', layer.constructor.name);
            console.log('  drawnItems layer count:', drawnItems.getLayers ? drawnItems.getLayers().length : 'unknown');
            console.log('  Polygon color:', layer.options?.color, 'Weight:', layer.options?.weight);

            // Track current polygon for other modules
            window.currentPolygon = layer;

            // Trigger spatial analysis (use performSpatialSearch which prepares params)
            if (window.SpatialAnalysis && typeof window.SpatialAnalysis.performSpatialSearch === 'function') {
                console.log('  Calling performSpatialSearch...');
                window.SpatialAnalysis.performSpatialSearch(geoJson.geometry);
            } else if (window.SpatialAnalysis && typeof window.SpatialAnalysis.executeSpatialQuery === 'function') {
                // Fallback to direct execute (wrap geometry)
                console.log('  Calling executeSpatialQuery fallback...');
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
                // Re-apply styling after edit (may be lost during edit operations)
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

        // Improve drawing UX: set crosshair cursor while drawing, restore after
        map.on('draw:drawstart', function() {
            try {
                const container = map.getContainer();
                if (container) {
                    container.style.cursor = 'crosshair';
                    container.classList.add('awmdrawing');
                }
                console.log('draw:start - cursor set and class added');
            } catch (e) {
                console.warn('Could not set draw cursor', e);
            }
        });

        map.on('draw:drawstop', function() {
            try {
                const container = map.getContainer();
                if (container) {
                    container.style.cursor = '';
                    container.classList.remove('awmdrawing');
                }
                console.log('draw:stop - cursor restored and class removed');
            } catch (e) {
                console.warn('Could not restore cursor after drawing', e);
            }
            // Fallback: some Leaflet builds may not emit draw:created reliably.
            // If no `window.currentPolygon` was set by draw:created but drawnItems
            // contains a new layer, use the last layer as the drawn polygon and
            // trigger the spatial search to ensure results are requested.
            try {
                if (!window.currentPolygon && drawnItems && drawnItems.getLayers && drawnItems.getLayers().length > 0) {
                    const layers = drawnItems.getLayers();
                    const lastLayer = layers[layers.length - 1];
                    if (lastLayer) {
                        // Apply styling if not already applied
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
                        console.log('⚠️ draw:drawstop fallback - draw:created did not fire, using last drawn layer');
                        console.log('  Layer type:', lastLayer.constructor.name);
                        console.log('  Polygon:', geoJson);
                        window.currentPolygon = lastLayer;
                        if (window.SpatialAnalysis && typeof window.SpatialAnalysis.performSpatialSearch === 'function') {
                            console.log('  Calling performSpatialSearch via fallback...');
                            window.SpatialAnalysis.performSpatialSearch(geoJson.geometry);
                        } else if (window.SpatialAnalysis && typeof window.SpatialAnalysis.executeSpatialQuery === 'function') {
                            window.SpatialAnalysis.executeSpatialQuery({ polygon: geoJson.geometry });
                        }
                    }
                }
            } catch (fallbackErr) {
                console.warn('draw:drawstop fallback failed', fallbackErr);
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

        console.log('displayCitiesOnMap received', cities.length, 'cities');

        // Add new city markers into the citiesLayer
        cities.forEach(function(city, idx) {
            try {
                const lat = Number(city.latitude);
                const lng = Number(city.longitude);
                if (!isFinite(lat) || !isFinite(lng)) {
                    console.warn('Invalid coordinates for city', city);
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

                // Debug log per marker
                console.log(`Added marker ${idx} for ${city.name} at [${lat}, ${lng}]`);
            } catch (e) {
                console.warn('Failed to add city marker', e, city);
            }
        });

        // If we added markers, fit bounds to them to ensure visibility
        try {
            if (window.citiesLayer && window.citiesLayer.getLayers().length > 0) {
                const bounds = window.citiesLayer.getBounds();
                if (bounds.isValid()) {
                    map.fitBounds(bounds.pad(0.1));
                    console.log('Fitted map to results bounds');
                }
            }
        } catch (e) {
            console.warn('Could not fit bounds to results', e);
        }

        // Defensive fallback: if we had cities but no marker icons were added
        try {
            const added = window.citiesLayer ? window.citiesLayer.getLayers().length : 0;
            if (cities.length > 0 && added === 0) {
                console.warn('No markers added with default icons; using circleMarker fallback');
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
                        console.warn('Fallback marker failed for city', city, e);
                    }
                });
                try {
                    if (window.citiesLayer && window.citiesLayer.getLayers().length > 0) map.fitBounds(window.citiesLayer.getBounds().pad(0.1));
                } catch (e) { console.warn('Could not fit bounds to fallback results', e); }
            }
        } catch (e) {
            console.warn('Fallback marker logic failed', e);
        }

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
