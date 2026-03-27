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
        const response = await fetch('/advanced-js-mapping/api/polygon-search/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
            body: JSON.stringify(searchParams)
        });
        
        if (!response.ok) throw new Error('API error ' + response.status);

        const data = await response.json();
        let cities = [];

        // 1. Parse the data into a standard city array
        if (data && data.results) {
            if (Array.isArray(data.results.cities) && data.results.cities.length > 0) {
                cities = data.results.cities.map(c => ({
                    id: c.id,
                    name: c.name,
                    population: c.population || 0,
                    latitude: c.latitude || c.lat,
                    longitude: c.longitude || c.lng,
                    country: c.country || '',
                    city_type: c.city_type || ''
                }));
            } else if (data.results.geojson && Array.isArray(data.results.geojson.features)) {
                cities = data.results.geojson.features.map(f => ({
                    id: f.properties.id,
                    name: f.properties.name || f.properties.ENGLISH || 'Unknown',
                    population: f.properties.population || 0,
                    latitude: f.geometry.coordinates[1],
                    longitude: f.geometry.coordinates[0],
                    country: f.properties.country || '',
                    city_type: f.properties.city_type || ''
                }));
            }
        }

        // 2. TRIGGER THE UI 
        if (window.UIControls && typeof window.UIControls.updateResultsUI === 'function') {
            window.UIControls.updateResultsUI(cities, data.results.analysis);
        }

        // 3. Update Markers on Map
        if (window.AdvancedMapping && typeof window.AdvancedMapping.displayCitiesOnMap === 'function') {
            window.AdvancedMapping.displayCitiesOnMap(cities);
        }

        // 4. Handle Empty Results
        if (cities.length === 0) {
            if (window.AdvancedMapping && typeof window.AdvancedMapping.showErrorMessage === 'function') {
                window.AdvancedMapping.showErrorMessage('No towns found in this area. Try a larger selection.');
            }
        } else if (window.AdvancedMapping && typeof window.AdvancedMapping.showSuccessMessage === 'function') {
            const townLabel = cities.length === 1 ? 'town' : 'towns';
            window.AdvancedMapping.showSuccessMessage(cities.length + ' ' + townLabel + ' found in your selected area.');
        }

    } catch (e) {
        console.error('Spatial search failed', e);
        if (window.UIControls && typeof window.UIControls.showWorkflowState === 'function') {
            window.UIControls.showWorkflowState();
        }
        if (window.AdvancedMapping && typeof window.AdvancedMapping.showErrorMessage === 'function') {
            window.AdvancedMapping.showErrorMessage('Search failed. Please try drawing the area again.');
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
