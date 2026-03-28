// Drives the older city map page, including loading, search, and add-city tools.

let map;

let cityMarkers = L.layerGroup();

let allCitiesData = [];

 

// Starts the map page once the DOM is ready.

document.addEventListener('DOMContentLoaded', function() {

    initializeMap();

    loadCities();

    setupEventListeners();

});

 

// Builds the map, tile layer, and click-to-add flow.
function initializeMap() {

    map = L.map('map').setView([53.5, -7.7], 6);

  
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);
 

    cityMarkers.addTo(map);

 

    map.on('click', function(e) {

        const { lat, lng } = e.latlng;

        document.getElementById('city-lat').value = lat.toFixed(6);

        document.getElementById('city-lng').value = lng.toFixed(6);

       

        const modal = new bootstrap.Modal(document.getElementById('addCityModal'));

        modal.show();

    });

}

 

// Loads city data from the GeoJSON endpoint and falls back if needed.
function loadCities() {

    console.log('Loading cities...');

    showLoading(true);

   

    fetch('/api/cities/geojson/')

        .then(response => {

            console.log('Response status:', response.status);

            console.log('Response headers:', response.headers);

            if (!response.ok) {

                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);

            }

            return response.json();

        })

        .then(data => {

            console.log('Raw API response:', data);

            console.log('Data type:', typeof data);

            console.log('Data keys:', Object.keys(data || {}));

           

            if (data && data.features) {
                const features = Array.isArray(data.features)
                    ? data.features
                    : Array.isArray(data.features.features)
                        ? data.features.features
                        : [];
            
                console.log('Loaded', features.length, 'features (after flattening nested GeoJSON)');
            
                allCitiesData = features;
                displayCitiesOnMap(allCitiesData);
                updateCityCount(allCitiesData.length);
                console.log(`Successfully loaded ${allCitiesData.length} cities`);

            } else if (data && data.error) {
                throw new Error(`API Error: ${data.error}`);

            } else if (Array.isArray(data)) {
                console.log('Converting array to GeoJSON format');

                const geojsonFeatures = data.map(city => ({

                    type: "Feature",

                    geometry: {

                        type: "Point",

                        coordinates: [parseFloat(city.longitude || 0), parseFloat(city.latitude || 0)]

                    },

                    properties: city

                }));

                allCitiesData = geojsonFeatures;

                displayCitiesOnMap(allCitiesData);

                updateCityCount(allCitiesData.length);

                console.log(`Successfully converted and loaded ${allCitiesData.length} cities`);

            } else {
                console.warn('Unexpected API response format, trying regular endpoint');

                return loadCitiesFromRegularAPI();

            }

        })

        .catch(error => {

            console.error('Error with geojson endpoint:', error);

            return loadCitiesFromRegularAPI();

        })

        .finally(() => {

            showLoading(false);

        });

}

 

// Loads city data from the regular API when GeoJSON is not available.
function loadCitiesFromRegularAPI() {

    console.log('Trying regular API endpoint...');

   

    return fetch('/api/cities/')

        .then(response => {

            console.log('Regular API response status:', response.status);

            if (!response.ok) {

                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);

            }

            return response.json();

        })

        .then(data => {

            console.log('Regular API response:', data);

           

            let citiesArray;

           

            if (data && data.results && Array.isArray(data.results)) {
                citiesArray = data.results;

            } else if (Array.isArray(data)) {
                citiesArray = data;

            } else {

                throw new Error('Unexpected response format from regular API');

            }

           

            const geojsonFeatures = citiesArray.map(city => ({

                type: "Feature",

                geometry: {

                    type: "Point",

                    coordinates: [parseFloat(city.longitude || 0), parseFloat(city.latitude || 0)]

                },

                properties: city

            }));

           

            allCitiesData = geojsonFeatures;

            displayCitiesOnMap(allCitiesData);

            updateCityCount(allCitiesData.length);

            console.log(`Successfully loaded ${allCitiesData.length} cities from regular API`);

        })

        .catch(error => {

            console.error('Error loading cities from both endpoints:', error);

           

            if (error.message.includes('404')) {

                showAlert('API endpoints not found. Please check your URLs configuration.', 'danger');

            } else if (error.message.includes('500')) {

                showAlert('Server error. Please check your API views and database.', 'danger');

            } else if (error.message.includes('Failed to fetch')) {

                showAlert('Network error. Please check if the server is running.', 'danger');

            } else {

                showAlert(`Error loading cities: ${error.message}`, 'danger');

            }

        });

}

 

 

// Clears the current markers and redraws the supplied city set.
function displayCitiesOnMap(cities) {
    cityMarkers.clearLayers();

   

    cities.forEach(city => {

        try {

            const { geometry, properties } = city;

           

            if (!geometry || !geometry.coordinates || !Array.isArray(geometry.coordinates)) {

                console.warn('Invalid geometry for city:', properties?.name || 'Unknown');

                return;

            }

           

            const [lng, lat] = geometry.coordinates;

           

            if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {

                console.warn('Invalid coordinates for city:', properties?.name, lat, lng);

                return;

            }

           

            const populationSize = getMarkerSize(properties.population || 0);

            const customIcon = L.divIcon({

                className: 'custom-marker',

                html: `<div style="background-color: #007bff; border-radius: 50%; width: ${populationSize}px; height: ${populationSize}px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,

                iconSize: [populationSize, populationSize],

                iconAnchor: [populationSize/2, populationSize/2]

            });

           

            const marker = L.marker([lat, lng], { icon: customIcon })

                .bindPopup(createPopupContent(properties), {

                    maxWidth: 300,

                    className: 'custom-popup'

                });

           

            marker.on('click', function() {

                showCityInfo(properties);

            });

           

            marker.cityData = properties;

           

            cityMarkers.addLayer(marker);

           

        } catch (error) {

            console.error('Error creating marker for city:', city, error);

        }

    });

   

    if (cities.length > 0) {

        try {

            const group = new L.featureGroup(cityMarkers.getLayers());

            if (group.getLayers().length > 0) {

                map.fitBounds(group.getBounds().pad(0.1));

            }

        } catch (error) {

            console.error('Error fitting bounds:', error);

        }

    }

}

 

// Builds the popup content for one city marker.
function createPopupContent(city) {
    const name = city.name || 'Unknown City';

    const country = city.country || 'Unknown Country';

    const population = city.population ? city.population.toLocaleString() : 'Unknown';

    const latitude = city.latitude || 'Unknown';

    const longitude = city.longitude || 'Unknown';

   

    return `

        <div class="city-popup">

            <h6>${name}, ${country}</h6>

            <div class="city-popup-info">

                <span class="population">👥 Population: ${population}</span>

                ${city.founded_year ? `<span>📅 Founded: ${city.founded_year}</span>` : ''}

                ${city.area_km2 ? `<span>📏 Area: ${city.area_km2} km²</span>` : ''}

                <span class="coordinates">📍 ${latitude}, ${longitude}</span>

                ${city.description ? `<div style="margin-top: 8px; font-style: italic;">${city.description}</div>` : ''}

            </div>

            <div class="popup-buttons">

                <button class="btn btn-sm btn-primary" onclick="zoomToCity(${city.id})">Zoom</button>

                <button class="btn btn-sm btn-info" onclick="showCityDetails(${city.id})">Details</button>

            </div>

        </div>

    `;

}

 

// Runs the city search and falls back to local filtering if needed.
function performSearch() {

    const query = document.getElementById('city-search').value.trim();

    if (!query) {

        displayCitiesOnMap(allCitiesData);

        updateCityCount(allCitiesData.length);

        return;

    }

   

    showLoading(true);

   

    fetch(`/api/cities/search/?q=${encodeURIComponent(query)}`)

        .then(response => {

            if (!response.ok) {

                throw new Error(`HTTP error! status: ${response.status}`);

            }

            return response.json();

        })

        .then(data => {

            console.log('Search response:', data);

           

            let filteredCities;

           

            if (Array.isArray(data)) {

                // If search returns array of city objects, convert to GeoJSON

                filteredCities = data.map(city => ({

                    type: "Feature",

                    geometry: {

                        type: "Point",

                        coordinates: [parseFloat(city.longitude || 0), parseFloat(city.latitude || 0)]

                    },

                    properties: city

                }));

            } else if (data.features && Array.isArray(data.features)) {

                // If search returns GeoJSON

                filteredCities = data.features;

            } else {

                // Filter from existing data as fallback

                filteredCities = allCitiesData.filter(city =>

                    city.properties.name.toLowerCase().includes(query.toLowerCase()) ||

                    city.properties.country.toLowerCase().includes(query.toLowerCase())

                );

            }

           

            displayCitiesOnMap(filteredCities);

            updateCityCount(filteredCities.length);

           

            if (filteredCities.length === 0) {

                showAlert('No cities found matching your search.', 'info');

            }

        })

        .catch(error => {

            console.error('Error searching cities:', error);

           

            // Fallback to client-side search

            const filteredCities = allCitiesData.filter(city =>

                city.properties.name.toLowerCase().includes(query.toLowerCase()) ||

                city.properties.country.toLowerCase().includes(query.toLowerCase())

            );

           

            displayCitiesOnMap(filteredCities);

            updateCityCount(filteredCities.length);

           

            if (filteredCities.length === 0) {

                showAlert('No cities found matching your search.', 'info');

            } else {

                showAlert('Search performed offline due to connection issues.', 'warning');

            }

        })

        .finally(() => {

            showLoading(false);

        });

}

 

// Chooses a marker size based on population.
function getMarkerSize(population) {

    const pop = parseInt(population) || 0;

    if (pop < 100000) return 8;

    if (pop < 500000) return 12;

    if (pop < 1000000) return 16;

    if (pop < 5000000) return 20;

    return 24;

}

 

// Fills the side panel with details for the selected city.
function showCityInfo(city) {

    const infoPanel = document.getElementById('city-info');

    const infoContent = document.getElementById('city-info-content');

   

    if (!infoPanel || !infoContent) {

        console.warn('City info panel elements not found');

        return;

    }

   

    const name = city.name || 'Unknown City';

    const country = city.country || 'Unknown Country';

    const population = city.population ? city.population.toLocaleString() : 'Unknown';

    const latitude = city.latitude || 0;

    const longitude = city.longitude || 0;

   

    infoContent.innerHTML = `

        <div class="row">

            <div class="col-12">

                <h5 class="text-primary">${name}, ${country}</h5>

            </div>

        </div>

        <div class="city-info-grid">

            <div class="info-item">

                <label>Population</label>

                <div class="value">${population}</div>

            </div>

            ${city.founded_year ? `

                <div class="info-item">

                    <label>Founded</label>

                    <div class="value">${city.founded_year}</div>

                </div>

            ` : ''}

            ${city.area_km2 ? `

                <div class="info-item">

                    <label>Area</label>

                    <div class="value">${city.area_km2} km²</div>

                </div>

            ` : ''}

            ${city.timezone ? `

                <div class="info-item">

                    <label>Timezone</label>

                    <div class="value">${city.timezone}</div>

                </div>

            ` : ''}

            <div class="info-item">

                <label>Coordinates</label>

                <div class="value">${parseFloat(latitude).toFixed(6)}, ${parseFloat(longitude).toFixed(6)}</div>

            </div>

        </div>

        ${city.description ? `

            <div class="mt-3">

                <label><strong>Description</strong></label>

                <div class="value">${city.description}</div>

            </div>

        ` : ''}

        <div class="mt-3">

            <button class="btn btn-primary btn-sm me-2" onclick="zoomToCity(${city.id})">Zoom to City</button>

            <button class="btn btn-outline-secondary btn-sm" onclick="copyCoordinates('${latitude}', '${longitude}')">Copy Coordinates</button>

        </div>

    `;

   

    infoPanel.style.display = 'block';

    infoPanel.scrollIntoView({ behavior: 'smooth' });

}

 

// Hooks the search, refresh, modal, and info-panel buttons into the page.
function setupEventListeners() {
    const searchBtn = document.getElementById('search-btn');

    const searchInput = document.getElementById('city-search');

    const clearSearchBtn = document.getElementById('clear-search');

    const refreshBtn = document.getElementById('refresh-map');

    const closeInfoBtn = document.getElementById('close-info');

    const addCityBtn = document.getElementById('add-city-btn');

    const saveCityBtn = document.getElementById('save-city');

   

    if (searchBtn) {

        searchBtn.addEventListener('click', performSearch);

    }

   

    if (searchInput) {

        searchInput.addEventListener('keypress', function(e) {

            if (e.key === 'Enter') {

                performSearch();

            }

        });

    }

   

    if (clearSearchBtn) {

        clearSearchBtn.addEventListener('click', function() {

            if (searchInput) {

                searchInput.value = '';

            }

            displayCitiesOnMap(allCitiesData);

            updateCityCount(allCitiesData.length);

        });

    }

   

    if (refreshBtn) {

        refreshBtn.addEventListener('click', loadCities);

    }

   

    if (closeInfoBtn) {

        closeInfoBtn.addEventListener('click', function() {

            const infoPanel = document.getElementById('city-info');

            if (infoPanel) {

                infoPanel.style.display = 'none';

            }

        });

    }

   

    if (addCityBtn) {

        addCityBtn.addEventListener('click', function() {

            const modalElement = document.getElementById('addCityModal');

            if (modalElement) {

                const modal = new bootstrap.Modal(modalElement);

                modal.show();

            }

        });

    }

   

    if (saveCityBtn) {

        saveCityBtn.addEventListener('click', saveNewCity);

    }

}

 

// Saves a new city from the add-city form.
function saveNewCity() {

    const nameInput = document.getElementById('city-name');

    const countryInput = document.getElementById('city-country');

    const latInput = document.getElementById('city-lat');

    const lngInput = document.getElementById('city-lng');

    const populationInput = document.getElementById('city-population');

    const foundedInput = document.getElementById('city-founded');

    const descriptionInput = document.getElementById('city-description');

   

    if (!nameInput || !countryInput || !latInput || !lngInput || !populationInput) {

        showAlert('Required form elements not found.', 'danger');

        return;

    }

   

    const formData = {

        name: nameInput.value.trim(),

        country: countryInput.value.trim(),

        latitude: parseFloat(latInput.value),

        longitude: parseFloat(lngInput.value),

        population: parseInt(populationInput.value),

        founded_year: foundedInput?.value ? parseInt(foundedInput.value) : null,

        description: descriptionInput?.value?.trim() || ''

    };

   

    if (!formData.name || !formData.country || isNaN(formData.latitude) || isNaN(formData.longitude) || isNaN(formData.population)) {

        showAlert('Please fill in all required fields with valid values.', 'warning');

        return;

    }

   

    if (formData.latitude < -90 || formData.latitude > 90 || formData.longitude < -180 || formData.longitude > 180) {

        showAlert('Please enter valid coordinates (latitude: -90 to 90, longitude: -180 to 180).', 'warning');

        return;

    }

   

    fetch('/api/cities/', {

        method: 'POST',

        headers: {

            'Content-Type': 'application/json',

            'X-CSRFToken': getCsrfToken()

        },

        body: JSON.stringify(formData)

    })

    .then(response => {

        if (!response.ok) {

            throw new Error(`HTTP error! status: ${response.status}`);

        }

        return response.json();

    })

    .then(data => {

        showAlert('City added successfully!', 'success');

       

        const modalElement = document.getElementById('addCityModal');

        if (modalElement) {

            const modal = bootstrap.Modal.getInstance(modalElement);

            if (modal) {

                modal.hide();

            }

        }

       

        const form = document.getElementById('add-city-form');

        if (form) {

            form.reset();

        }

       

        loadCities();

    })

    .catch(error => {

        console.error('Error saving city:', error);

        showAlert('Error saving city. Please try again.', 'danger');

    });

}

 

// Zooms the map to one city from the loaded dataset.
function zoomToCity(cityId) {

    const city = allCitiesData.find(c => c.properties.id === parseInt(cityId));

    if (city && city.geometry && city.geometry.coordinates) {

        const [lng, lat] = city.geometry.coordinates;

        if (!isNaN(lat) && !isNaN(lng)) {

            map.setView([lat, lng], 12);

        }

    }

}

 

// Opens the detail panel for one city from the loaded dataset.
function showCityDetails(cityId) {

    const city = allCitiesData.find(c => c.properties.id === parseInt(cityId));

    if (city) {

        showCityInfo(city.properties);

    }

}

 

// Copies a latitude and longitude pair to the clipboard.
function copyCoordinates(lat, lng) {

    const coords = `${lat}, ${lng}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {

        navigator.clipboard.writeText(coords).then(() => {

            showAlert('Coordinates copied to clipboard!', 'info');

        }).catch(() => {

            showAlert('Failed to copy coordinates to clipboard.', 'warning');

        });

    } else {

        const textArea = document.createElement('textarea');

        textArea.value = coords;

        document.body.appendChild(textArea);

        textArea.select();

        try {

            document.execCommand('copy');

            showAlert('Coordinates copied to clipboard!', 'info');

        } catch (err) {

            showAlert('Failed to copy coordinates to clipboard.', 'warning');

        }

        document.body.removeChild(textArea);

    }

}

 

// Updates the loaded-city count on the page.
function updateCityCount(count) {

    const countElement = document.getElementById('city-count');

    if (countElement) {

        countElement.textContent = `${count} cities loaded`;

    }

}

 

// Switches the loading state on the search button.
function showLoading(show) {

    const searchBtn = document.getElementById('search-btn');

    if (searchBtn) {

        if (show) {

            searchBtn.innerHTML = '<span class="loading"></span> Loading...';

            searchBtn.disabled = true;

        } else {

            searchBtn.innerHTML = '🔍 Search';

            searchBtn.disabled = false;

        }

    }

}

 

// Shows a temporary Bootstrap alert.
function showAlert(message, type) {
    const alertDiv = document.createElement('div');

    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;

    alertDiv.style.top = '20px';

    alertDiv.style.right = '20px';

    alertDiv.style.zIndex = '9999';

    alertDiv.style.minWidth = '300px';

   

    alertDiv.innerHTML = `

        ${message}

        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>

    `;

   

    document.body.appendChild(alertDiv);

   

    setTimeout(() => {

        if (alertDiv.parentNode) {

            alertDiv.remove();

        }

    }, 5000);

}

 

// Reads the CSRF token from cookies, meta tags, or form inputs.
function getCsrfToken() {

    const cookies = document.cookie.split(';');

    for (let cookie of cookies) {

        const [name, value] = cookie.trim().split('=');

        if (name === 'csrftoken') {

            return value;

        }

    }

   

    const metaTag = document.querySelector('meta[name="csrf-token"]');

    if (metaTag) {

        return metaTag.getAttribute('content');

    }

   

    const csrfInput = document.querySelector('input[name="csrfmiddlewaretoken"]');

    if (csrfInput) {

        return csrfInput.value;

    }

   

    console.warn('CSRF token not found');

    return '';

}


// Adds the click-to-search-nearby workflow on top of the city map.
class ProximitySearch {
    constructor(map) {
        this.map = map;
        this.searchMarker = null;
        this.nearestCitiesLayer = L.layerGroup().addTo(this.map);
        this.radiusCircle = null;
        this.isProximityMode = false;
       
        this.initializeProximityFeatures();
    }
   
    // Sets up the extra controls and map click handler.
    initializeProximityFeatures() {
        this.addProximityControls();

        this.map.on('click', (e) => {
            if (this.isProximityMode) {
                this.performProximitySearch(e.latlng.lat, e.latlng.lng);
            }
        });
    }
   
    // Adds the proximity toggle and radius input to the page.
    addProximityControls() {
        const proximityToggle = document.createElement('button');
        proximityToggle.id = 'proximity-toggle';
        proximityToggle.className = 'btn btn-outline-primary';
        proximityToggle.innerHTML = '📍 Proximity Search';
        proximityToggle.onclick = () => this.toggleProximityMode();
       
        const controlPanel = document.querySelector('.map-controls') || document.body;
        controlPanel.appendChild(proximityToggle);

        const radiusInput = document.createElement('input');
        radiusInput.id = 'radius-input';
        radiusInput.type = 'number';
        radiusInput.value = '100';
        radiusInput.placeholder = 'Radius (km)';
        radiusInput.className = 'form-control d-none';
        radiusInput.style.width = '120px';
        radiusInput.style.display = 'inline-block';
        radiusInput.style.marginLeft = '10px';
       
        controlPanel.appendChild(radiusInput);
    }
   
    // Turns proximity search mode on or off.
    toggleProximityMode() {
        this.isProximityMode = !this.isProximityMode;
        const toggleBtn = document.getElementById('proximity-toggle');
        const radiusInput = document.getElementById('radius-input');
       
        if (this.isProximityMode) {
            toggleBtn.innerHTML = 'Exit Proximity';
            toggleBtn.className = 'btn btn-danger';
            radiusInput.classList.remove('d-none');
            this.map.getContainer().style.cursor = 'crosshair';
            showAlert('Click anywhere on the map to find nearest cities', 'info');
        } else {
            toggleBtn.innerHTML = 'Proximity Search';
            toggleBtn.className = 'btn btn-outline-primary';
            radiusInput.classList.add('d-none');
            this.map.getContainer().style.cursor = '';
            this.clearProximityResults();
        }
    }
   
    // Finds the nearest cities to the clicked point.
    async performProximitySearch(lat, lng) {
        this.clearProximityResults();

        this.searchMarker = L.marker([lat, lng], {
            icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34]
            })
        }).addTo(this.map);
       
        this.searchMarker.bindPopup(`
            <strong>Search Point</strong><br>
            Lat: ${lat.toFixed(6)}<br>
            Lng: ${lng.toFixed(6)}
        `).openPopup();
       
        showLoading(true);
       
        try {
            const response = await fetch('/query/api/nearest/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({ lat, lng })
            });
           
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
           
            const data = await response.json();
            this.displayNearestCities(data.nearest_cities);
            this.updateResultsPanel(data);
           
        } catch (error) {
            console.error('Error finding nearest cities:', error);
            showAlert('Error performing proximity search. Please try again.', 'danger');
        } finally {
            showLoading(false);
        }
    }
   
    // Draws the nearest-city results on the map.
    displayNearestCities(cities) {
        cities.forEach((city, index) => {
            const marker = L.marker([city.coordinates.lat, city.coordinates.lng], {
                icon: this.getNumberedIcon(city.rank)
            });
           
            const popupContent = `
                <div class="city-popup proximity-result">
                    <h6>#${city.rank} ${city.name}</h6>
                    <p><strong>Country:</strong> ${city.country}</p>
                    <p><strong>Population:</strong> ${city.population.toLocaleString()}</p>
                    <p><strong>Distance:</strong> ${city.distance_km} km (${city.distance_miles} mi)</p>
                    ${city.founded_year ? `<p><strong>Founded:</strong> ${city.founded_year}</p>` : ''}
                    ${city.description ? `<p><em>${city.description}</em></p>` : ''}
                    <button class="btn btn-sm btn-primary" onclick="proximitySearch.zoomToCity(${city.coordinates.lat}, ${city.coordinates.lng})">
                        Zoom Here
                    </button>
                </div>
            `;
           
            marker.bindPopup(popupContent);
            this.nearestCitiesLayer.addLayer(marker);
        });
       
        if (cities.length > 0) {
            const group = new L.featureGroup([
                this.searchMarker,
                ...this.nearestCitiesLayer.getLayers()
            ]);
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }
   
    getNumberedIcon(number) {
        return L.divIcon({
            className: 'numbered-marker',
            html: `<div class="marker-number">${number}</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
    }
   
    // Builds or refreshes the results panel for proximity search.
    updateResultsPanel(data) {
        let resultsPanel = document.getElementById('proximity-results');
        if (!resultsPanel) {
            resultsPanel = document.createElement('div');
            resultsPanel.id = 'proximity-results';
            resultsPanel.className = 'proximity-results-panel';
            document.body.appendChild(resultsPanel);
        }
       
        resultsPanel.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h5>Nearest Cities Results</h5>
                    <button type="button" class="btn-close" onclick="proximitySearch.clearProximityResults()"></button>
                </div>
                <div class="card-body">
                    <p><strong>Search Point:</strong> ${data.search_point.lat.toFixed(4)}, ${data.search_point.lng.toFixed(4)}</p>
                    <p><strong>Cities Found:</strong> ${data.total_found}</p>
                    <div class="results-list">
                        ${data.nearest_cities.map(city => `
                            <div class="result-item" onclick="proximitySearch.zoomToCity(${city.coordinates.lat}, ${city.coordinates.lng})">
                                <strong>#${city.rank} ${city.name}, ${city.country}</strong><br>
                                <small>${city.distance_km} km away • Population: ${city.population.toLocaleString()}</small>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
       
        resultsPanel.style.display = 'block';
    }
   
    zoomToCity(lat, lng) {
        this.map.setView([lat, lng], 12);
    }
   
    // Clears the current proximity search markers and panel.
    clearProximityResults() {
        if (this.searchMarker) {
            this.map.removeLayer(this.searchMarker);
            this.searchMarker = null;
        }
       
        this.nearestCitiesLayer.clearLayers();
       
        if (this.radiusCircle) {
            this.map.removeLayer(this.radiusCircle);
            this.radiusCircle = null;
        }
       
        const resultsPanel = document.getElementById('proximity-results');
        if (resultsPanel) {
            resultsPanel.style.display = 'none';
        }
    }
}
 
// Starts proximity search after the base map has had time to appear.
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (window.map) {
            window.proximitySearch = new ProximitySearch(window.map);
        }
    }, 1000);
});
 
