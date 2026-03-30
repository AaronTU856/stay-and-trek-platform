// Picks the right API root for production and local development.
let API_BASE = "";

if (window.location.hostname.includes("run.app")) {
    API_BASE = "https://stay-and-trek-service-642845720185.europe-west1.run.app";
} else {
    API_BASE = "";
}


// Manages the advanced townland map, drawing tools, and map feedback.
window.AdvancedMapping = (function() {
    let map = null;
    let drawControl = null;
    let drawnItems = null;
    let lastToastMessage = '';
    let lastToastAt = 0;

    const townImagePool = [
        '/static/images/irish_town.jpg',
        '/static/images/towns.jpg',
        '/static/images/road.jpg',
        '/static/images/hiking.jpeg',
        '/static/images/hike_2.jpg'
    ];

    function getTownImage(city) {
        const seed = city && (city.id || (city.name && city.name.length) || 0);
        const imageIndex = Math.abs(seed) % townImagePool.length;
        return townImagePool[imageIndex];
    }

    // Shows a short toast message without repeating the same one too quickly.
    function showToast(message, variant, delay) {
        const toastEl = document.getElementById('routeToast');
        const toastBody = document.getElementById('routeToastBody');
        const now = Date.now();
        const tone = variant || 'success';

        if (!toastEl || !toastBody || typeof bootstrap === 'undefined' || !bootstrap.Toast) {
            return;
        }

        if (message === lastToastMessage && now - lastToastAt < 1500) {
            return;
        }

        lastToastMessage = message;
        lastToastAt = now;

        toastBody.textContent = message;
        toastEl.className = 'toast align-items-center border-0 text-white';

        if (tone === 'error') {
            toastEl.classList.add('bg-danger');
        } else if (tone === 'info') {
            toastEl.classList.add('bg-dark');
        } else {
            toastEl.classList.add('bg-success');
        }

        bootstrap.Toast.getOrCreateInstance(toastEl, {
            autohide: true,
            delay: delay || 2600
        }).show();
    }

    // Builds the popup content for a town marker.
    function createTownPopupContent(city, imageUrl) {
        const townImage = imageUrl || getTownImage(city);
        const population = Number(city && city.population);
        const populationLabel = Number.isFinite(population) ? population.toLocaleString() : 'N/A';
        const townName = city && city.name ? city.name : 'Unknown town';

        return `
            <div class="city-popup" style="width: 220px;">
                <img src="${townImage}" class="img-fluid rounded mb-3" alt="${townName}" style="width: 100%; height: 110px; object-fit: cover;">
                <div class="small text-uppercase fw-bold mb-1" style="letter-spacing: 0.08em; color: #2E8B57;">Townland Explorer</div>
                <h6 class="fw-bold mb-2" style="color: #23624A;">${townName}</h6>
                <div class="small text-muted mb-1">Population</div>
                <div class="fw-bold" style="color: #213F35;">${populationLabel}</div>
            </div>
        `;
    }

    // Moves the map to a town and opens its popup.
    function focusTown(city, imageUrl) {
        if (!map || !city) return;

        const lat = Number(city.latitude);
        const lng = Number(city.longitude);

        if (!isFinite(lat) || !isFinite(lng)) return;

        map.flyTo([lat, lng], 14);
        L.popup()
            .setLatLng([lat, lng])
            .setContent(createTownPopupContent(city, imageUrl))
            .openOn(map);
    }

    // Builds the map, shared layers, and drawing tools for the explorer page.
    function initializeMap(containerId) {
        try {
            const irelandBounds = L.latLngBounds(
                [50.8, -12.8],
                [56.3, -4.8]
            );

            map = L.map(containerId, {
                maxBounds: irelandBounds,
                maxBoundsViscosity: 1.0,
                minZoom: 7
            }).setView([53.3598, -7.7603], 7.4);

           L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 20
            }).addTo(map);

            // Adds a short fly-in when the map first appears.
            setTimeout(() => {
                map.flyTo([53.35, -7.8], 7, {
                    duration: 2.5,
                    easeLinearity: 0.1
                });
            }, 1000);

            window.map = map;

            // Points Leaflet at the local marker images so icons render reliably.
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

            // Sets up shared layers used by the search and results panels.
            window.citiesLayer = L.featureGroup().addTo(map);
            window.resultsLayer = L.featureGroup().addTo(map);

            loadInitialTowns();

            window.MARKERS = window.MARKERS || {
                result: {
                    color: '#ff5722',
                    weight: 1,
                    fillColor: '#ff8a50',
                    fillOpacity: 0.8,
                    radius: 6
                }
            };

            // Sets a shared marker icon for search results and town markers.
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

            window.currentPolygon = null;
            window.currentResults = null;

            initializeDrawingControls();


            // Adds a small map key for towns and polygon searches.
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


            // Adds a fallback finish button for browsers where draw events can miss.
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

    // Sets up drawing tools and the fallback manual polygon flow.
    function initializeDrawingControls() {
        drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);

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
                        color: '#2E8B57',
                        weight: 4,
                        opacity: 1,
                        fillColor: '#90EE90',
                        fillOpacity: 0.15
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

        // Falls back to manual point collection if the built-in draw flow misbehaves.
        let manualPolygonMode = false;
        let manualPolygonPoints = [];
        let manualPolygonLayer = null;
        
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
        
        map.on('draw:drawstop', function() {
            manualPolygonMode = false;
            manualPolygonPoints = [];
        });
        
        map.on('click', function(e) {
            if (manualPolygonMode && e.originalEvent) {
                if (e.originalEvent.target.closest('.leaflet-draw')) return;
                
                manualPolygonPoints.push([e.latlng.lat, e.latlng.lng]);
                
                if (manualPolygonLayer) {
                    map.removeLayer(manualPolygonLayer);
                }
                
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
        
        map.on('dblclick', function(e) {
            if (manualPolygonMode && manualPolygonPoints.length > 2) {
                finishManualPolygon();
            }
        });
        
        // Turns the collected manual points into a real polygon and runs the search.
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
                
                if (manualPolygonLayer) {
                    map.removeLayer(manualPolygonLayer);
                    manualPolygonLayer = null;
                }
                
                console.log('✅ Polygon created, triggering spatial search...');
                if (window.SpatialAnalysis && typeof window.SpatialAnalysis.performSpatialSearch === 'function') {
                    window.SpatialAnalysis.performSpatialSearch(geoJson.geometry);
                } else {
                    console.warn('❌ SpatialAnalysis.performSpatialSearch not available');
                }
                
                map.fire('draw:created', { layer: polygon });
            } else {
                console.warn('⚠️ finishManualPolygon: mode=' + manualPolygonMode + ', points=' + manualPolygonPoints.length);
            }
        }

        // Event handlers for drawing
        map.on('draw:created', function(event) {
            const layer = event.layer;
            
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

            const geoJson = layer.toGeoJSON();

            window.currentPolygon = layer;

            if (window.SpatialAnalysis && typeof window.SpatialAnalysis.performSpatialSearch === 'function') {
                window.SpatialAnalysis.performSpatialSearch(geoJson.geometry);
            } else if (window.SpatialAnalysis && typeof window.SpatialAnalysis.executeSpatialQuery === 'function') {
                window.SpatialAnalysis.executeSpatialQuery({ polygon: geoJson.geometry });
            }
        });

        map.on('draw:deleted', function(event) {
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

            // Falls back to the latest drawn shape if the normal draw event was missed.
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
            }
        });
    }

    // Replaces the current town markers with the latest polygon-search results.
    function displayCitiesOnMap(cities) {
        if (window.citiesLayer) {
            window.citiesLayer.clearLayers();
        }

        cities.forEach(function(city, idx) {
            try {
                const lat = Number(city.latitude);
                const lng = Number(city.longitude);
                if (!isFinite(lat) || !isFinite(lng)) {
                    return;
                }

                const markerOpts = { cityMarker: true };
                if (window.resultMarkerIcon) markerOpts.icon = window.resultMarkerIcon;
                // Rebuild each returned town as a Leaflet marker so the map and
                // results panel stay in sync after every polygon search.
                const marker = L.marker([lat, lng], markerOpts);
                marker.bindPopup(createTownPopupContent(city));
                if (window.citiesLayer) {
                    window.citiesLayer.addLayer(marker);
                } else {
                    marker.addTo(map);
                }
            } catch (e) {
            }
        });

        try {
            if (window.citiesLayer && window.citiesLayer.getLayers().length > 0) {
                const bounds = window.citiesLayer.getBounds();
                if (bounds.isValid()) {
                    map.fitBounds(bounds.pad(0.1));
                }
            }
        } catch (e) {
        }

        // Fall back to simple circle markers if the standard marker path fails.
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
                        }).bindPopup(createTownPopupContent(city));
                        if (window.citiesLayer) window.citiesLayer.addLayer(cm); else cm.addTo(map);
                    } catch (e) {
                    }
                });
                try {
                    if (window.citiesLayer && window.citiesLayer.getLayers().length > 0) map.fitBounds(window.citiesLayer.getBounds().pad(0.1));
                } catch (e) {}
            }
        } catch (e) {
        }

    }

    // Loads the starting town markers before any polygon search is run.
    async function loadInitialTowns() {
        try {
            const res = await fetch(`${API_BASE}/api/trails/towns/geojson/`);

            if (!res.ok) throw new Error('Failed to fetch towns');
            const geojson = await res.json();

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
                        marker.bindPopup(createTownPopupContent({
                            id: props.id,
                            name: props.name || props.ENGLISH || 'Unknown',
                            population: props.population || 0,
                            latitude: lat,
                            longitude: lng
                        }));
                        window.citiesLayer.addLayer(marker);
                    } catch (e) {
                    }
                });
            }
        } catch (err) {
        }
    }

    // Returns the current Leaflet map instance for other modules.
    function getMap() {
        return map;
    }

    // Exposes the map helpers used by the search and UI modules.
    return {
        initializeMap: initializeMap,
        displayCitiesOnMap: displayCitiesOnMap,
        getMap: getMap,
        getTownImage: getTownImage,
        createTownPopupContent: createTownPopupContent,
        focusTown: focusTown,
        showToast: showToast,
        showLoading: function(show) {
            if (window.UIControls && typeof window.UIControls.setLoadingState === 'function') {
                window.UIControls.setLoadingState(show);
            } else {
                const el = document.getElementById('loadingIndicator');
                if (el) el.style.display = show ? 'block' : 'none';
            }

            if (show) {
                showToast('Searching your selected area...', 'info', 1800);
            }
        },
        showSuccessMessage: function(msg) {
            showToast(msg, 'success', 2600);
        },
        showErrorMessage: function(msg) {
            showToast(msg, 'error', 3600);
        }
    };
})();
