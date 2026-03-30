console.log('🔬 Advanced JavaScript Mapping - Loading spatial analysis module...');

// Sends the drawn polygon to the backend search endpoint, then feeds the
// returned towns into both the workflow panel and the Leaflet map.
async function performSpatialSearch(polygonGeometry) {
    console.log('performSpatialSearch called with geometry:', polygonGeometry);
    if (window.AdvancedMapping && typeof window.AdvancedMapping.showLoading === 'function') {
        window.AdvancedMapping.showLoading(true);
    }

    try {
        // Keep the payload simple: the backend only needs the polygon geometry
        // to run the spatial containment query.
        const searchParams = { polygon: polygonGeometry };
        const response = await fetch('/advanced-js-mapping/api/polygon-search/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
            body: JSON.stringify(searchParams)
        });
        
        if (!response.ok) throw new Error('API error ' + response.status);

        const data = await response.json();
        let cities = [];

        // Normalise the response into one town list so the UI can work with a
        // consistent structure regardless of which result branch was returned.
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

        // Push the same result set into the summary cards and the map markers.
        if (window.UIControls && typeof window.UIControls.updateResultsUI === 'function') {
            window.UIControls.updateResultsUI(cities, data.results.analysis);
        }

        // Refreshes the map markers to match the new result set.
        if (window.AdvancedMapping && typeof window.AdvancedMapping.displayCitiesOnMap === 'function') {
            window.AdvancedMapping.displayCitiesOnMap(cities);
        }

        // Shows a simple success or empty-state message.
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

// Reads the CSRF token from cookies before the polygon search request is sent.
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

// Exposes the search helpers for the map and older code paths.
try {
    window.SpatialAnalysis = window.SpatialAnalysis || {};
    window.SpatialAnalysis.performSpatialSearch = performSpatialSearch;

    window.SpatialAnalysis.executeSpatialQuery = async function(params) {
        const polygon = params && params.polygon ? params.polygon : params;
        return performSpatialSearch(polygon);
    };
    console.log('SpatialAnalysis API attached to window');
} catch (e) {
    console.warn('Could not attach SpatialAnalysis to window', e);
}
