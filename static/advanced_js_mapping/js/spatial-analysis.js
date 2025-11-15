/* Spatial analysis client module (trimmed/compat copy)
   Copied from temp advanced_js_mapping export and adjusted for project paths. */

console.log('🔬 Advanced JavaScript Mapping - Loading spatial analysis module...');

async function performSpatialSearch(polygonGeometry) {
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

        if (!response.ok) throw new Error('API error');
        const data = await response.json();

        if (data && data.results && data.results.geojson) {
            const features = data.results.geojson.features;
            // show on map
            if (window.AdvancedMapping && typeof window.AdvancedMapping.displayCitiesOnMap === 'function') {
                const cities = features.map(f => ({
                    id: f.properties.id,
                    name: f.properties.name,
                    country: f.properties.country,
                    population: f.properties.population,
                    latitude: f.geometry.coordinates[1],
                    longitude: f.geometry.coordinates[0],
                    city_type: f.properties.city_type
                }));
                window.AdvancedMapping.displayCitiesOnMap(cities);
            }

            // Update UI panels
            document.getElementById('analysisSummary').style.display = 'block';
            document.getElementById('citiesContainer').style.display = 'block';

            const totalCitiesEl = document.getElementById('totalCities');
            const totalPopEl = document.getElementById('totalPopulation');
            totalCitiesEl.textContent = data.results.analysis.total_cities || 0;
            totalPopEl.textContent = data.results.analysis.total_population || 0;

            // Populate list
            const list = document.getElementById('citiesList');
            list.innerHTML = '';
            features.forEach(f => {
                const li = document.createElement('a');
                li.className = 'list-group-item list-group-item-action';
                li.textContent = `${f.properties.name} — ${f.properties.population || 'N/A'}`;
                list.appendChild(li);
            });
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
