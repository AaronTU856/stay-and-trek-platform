/* Spatial analysis client module (trimmed/compat copy)
   Copied from temp advanced_js_mapping export and adjusted for project paths. */

console.log('🔬 Advanced JavaScript Mapping - Loading spatial analysis module...');

async function performSpatialSearch(polygonGeometry) {
    console.log('🔍 performSpatialSearch called with geometry:', polygonGeometry);
    if (window.AdvancedMapping && typeof window.AdvancedMapping.showLoading === 'function') {
        window.AdvancedMapping.showLoading(true);
    }

    try {
        const searchParams = { polygon: polygonGeometry };
        console.log('Spatial search payload:', searchParams);
        const response = await fetch('/advanced-js-mapping/api/polygon-search/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
            body: JSON.stringify(searchParams)
        });
        if (!response.ok) {
            console.error('Spatial search API returned error status:', response.status, response.statusText);
            throw new Error('API error ' + response.status);
        }

        const data = await response.json();
        // Verbose debug: log full response to help trace mismatches between server and client
        console.log('Spatial search response (full):', data);
        try {
            if (data && data.results && data.results.analysis && data.results.analysis.debug) {
                console.log('Spatial search debug counts:', data.results.analysis.debug);
            }
        } catch (e) {
            console.warn('No debug info in response', e);
        }

        // Support two server response shapes:
        // - data.results.geojson.features (GeoJSON feature collection)
        // - data.results.cities (pre-built city objects with latitude/longitude)
        let cities = [];
        try {
            if (data && data.results) {
                // prefer explicit cities array if present
                if (Array.isArray(data.results.cities) && data.results.cities.length > 0) {
                    cities = data.results.cities.map(c => ({
                        id: c.id,
                        name: c.name,
                        country: c.country,
                        population: c.population,
                        latitude: c.latitude || c.lat || c.latitude,
                        longitude: c.longitude || c.lng || c.lon || c.longitude,
                        city_type: c.city_type || c.town_type || ''
                    }));
                } else if (data.results.geojson && Array.isArray(data.results.geojson.features)) {
                    const features = data.results.geojson.features;
                    cities = features.map(f => ({
                        id: (f.properties && f.properties.id) || null,
                        name: (f.properties && (f.properties.name || f.properties.ENGLISH)) || 'Unknown',
                        country: (f.properties && f.properties.country) || '',
                        population: (f.properties && f.properties.population) || 0,
                        latitude: (f.geometry && f.geometry.coordinates) ? f.geometry.coordinates[1] : null,
                        longitude: (f.geometry && f.geometry.coordinates) ? f.geometry.coordinates[0] : null,
                        city_type: (f.properties && (f.properties.city_type || f.properties.town_type)) || ''
                    }));
                }
            }
        } catch (e) {
            console.warn('Error parsing spatial search response into cities array', e);
        }

        console.log('Parsed cities for map:', cities.length);
        if (window.AdvancedMapping && typeof window.AdvancedMapping.displayCitiesOnMap === 'function') {
            window.AdvancedMapping.displayCitiesOnMap(cities);
        }

        if (cities.length === 0) {
            // Informative message with debug counts if available
            try {
                const dbg = data.results && data.results.analysis && data.results.analysis.debug;
                if (dbg) {
                    const msg = `No towns found by polygon. bbox_count=${dbg.bbox_count}, within_count=${dbg.within_count}, intersects_count=${dbg.intersects_count}, used=${dbg.used_method}`;
                    console.warn(msg);
                    if (window.AdvancedMapping && typeof window.AdvancedMapping.showErrorMessage === 'function') window.AdvancedMapping.showErrorMessage(msg);
                } else {
                    if (window.AdvancedMapping && typeof window.AdvancedMapping.showErrorMessage === 'function') window.AdvancedMapping.showErrorMessage('No towns found in polygon');
                }
            } catch (e) {
                if (window.AdvancedMapping && typeof window.AdvancedMapping.showErrorMessage === 'function') window.AdvancedMapping.showErrorMessage('No towns found in polygon');
            }
        }

        // Update UI panels and list using the parsed `cities` array
        try {
            const analysisSummary = document.getElementById('analysisSummary');
            const citiesContainer = document.getElementById('citiesContainer');
            if (analysisSummary) analysisSummary.style.display = 'block';
            if (citiesContainer) citiesContainer.style.display = 'block';

            const totalCitiesEl = document.getElementById('totalCities');
            const totalPopEl = document.getElementById('totalPopulation');
            if (totalCitiesEl && data && data.results && data.results.analysis) totalCitiesEl.textContent = data.results.analysis.total_cities || 0;
            if (totalPopEl && data && data.results && data.results.analysis) totalPopEl.textContent = data.results.analysis.total_population || 0;

            const list = document.getElementById('citiesList');
            if (list) {
                list.innerHTML = '';
                cities.forEach(c => {
                    const li = document.createElement('a');
                    li.className = 'list-group-item list-group-item-action';
                    li.textContent = `${c.name} — ${c.population || 'N/A'}`;
                    list.appendChild(li);
                });
            }
        } catch (uiErr) {
            console.warn('Failed to update UI panels', uiErr);
        }

        // No automatic reload - user can click "New Search" button to start over
        console.log('✅ Search complete. User can click "New Search" button to perform another search.');
        if (cities.length > 0) {
            console.log('✅ Found ' + cities.length + ' towns. Showing results.');
        } else {
            console.log('❌ No towns found in polygon.');
        }

    } catch (e) {
        console.error('Spatial search failed', e);
        if (window.AdvancedMapping && typeof window.AdvancedMapping.showErrorMessage === 'function') {
            window.AdvancedMapping.showErrorMessage('Spatial search failed');
        }
    } finally {
        if (window.AdvancedMapping && typeof window.AdvancedMapping.showLoading === 'function') {
            window.AdvancedMapping.showLoading(false);
        }
    }
}

/**
 * Retrieve CSRF token from cookies for secure API requests
 * @returns {string} The CSRF token value from document cookies
 */
function getCsrfToken() {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue || '';
}

// Expose API for other modules (map-interface expects window.SpatialAnalysis.performSpatialSearch)
try {
    window.SpatialAnalysis = window.SpatialAnalysis || {};
    window.SpatialAnalysis.performSpatialSearch = performSpatialSearch;
    // backward-compatible alias used by some older code paths
    window.SpatialAnalysis.executeSpatialQuery = async function(params) {
        const polygon = params && params.polygon ? params.polygon : params;
        return performSpatialSearch(polygon);
    };
    console.log('SpatialAnalysis API attached to window');
} catch (e) {
    console.warn('Could not attach SpatialAnalysis to window', e);
}
