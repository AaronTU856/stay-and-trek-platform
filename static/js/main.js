// Keeps track of the shared map and any markers added by the user.
let map;
let userMarkers = [];

// Starts the map page once the DOM is ready.
document.addEventListener('DOMContentLoaded', function() {
    console.log('🗺️ Initializing Hello Map application...');
    initializeMap();
    setupEventListeners();
    loadSampleData();
});

// Builds the Leaflet map and adds the base controls.
function initializeMap() {
    try {
        map = L.map('map').setView([54.0, -8.0], 7);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20,
            minZoom: 2
        }).addTo(map);
        
        L.control.scale({
            position: 'bottomright',
            imperial: false
        }).addTo(map);
        
        console.log('Map initialized successfully with CartoDB tiles');
        
    } catch (error) {
        console.error('Failed to initialize map:', error);
        showAlert('danger', 'Failed to initialize map. Please refresh the page.');
    }
}

// Connects clicks, form actions, and layer toggles to the map.
function setupEventListeners() {
    map.on('click', function(e) {
        const lat = e.latlng.lat.toFixed(6);
        const lng = e.latlng.lng.toFixed(6);
        
        document.getElementById('map-coordinates').textContent = 
            `Coordinates: ${lat}, ${lng}`;
        
        document.getElementById('location-lat').value = lat;
        document.getElementById('location-lng').value = lng;
        
        showTemporaryMarker(e.latlng);
    });
    
    document.getElementById('quick-add-form').addEventListener('submit', function(e) {
        e.preventDefault();
        addUserLocation();
    });
    
    document.getElementById('locations-layer').addEventListener('change', function(e) {
        toggleSampleLocations(e.target.checked);
    });
    
    document.getElementById('user-locations').addEventListener('change', function(e) {
        toggleUserLocations(e.target.checked);
    });
    
    document.getElementById('reset-view').addEventListener('click', function() {
        resetMapView();
    });
}

// Drops in sample places so the map has something to show straight away.
function loadSampleData() {
    showMapLoading(true);
    
    const sampleLocations = [
        { name: "Dublin, Ireland", lat: 53.3498, lng: -6.2603 },
        { name: "London, UK", lat: 51.5074, lng: -0.1278 },
        { name: "Paris, France", lat: 48.8566, lng: 2.3522 },
        { name: "Berlin, Germany", lat: 52.5200, lng: 13.4050 },
        { name: "Madrid, Spain", lat: 40.4168, lng: -3.7038 },
        { name: "Rome, Italy", lat: 41.9028, lng: 12.4964 },
        { name: "Amsterdam, Netherlands", lat: 52.3676, lng: 4.9041 }
    ];
    
    sampleLocations.forEach((location, index) => {
        setTimeout(() => {
            addSampleMarker(location);
        }, index * 200);
    });
    
    setTimeout(() => {
        showMapLoading(false);
        showAlert('success', `Loaded ${sampleLocations.length} sample locations successfully!`);
    }, sampleLocations.length * 200 + 500);
}

// Adds one sample marker with a simple popup and entry animation.
function addSampleMarker(location) {
    const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            background-color: #0d6efd;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });
    
    const marker = L.marker([location.lat, location.lng], { icon }).addTo(map);
    
    const popupContent = `
        <div class="custom-popup">
            <h6>${location.name}</h6>
            <div class="coordinates">${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}</div>
            <small class="text-muted">Sample location from database</small>
        </div>
    `;
    
    marker.bindPopup(popupContent);
    marker.location = location;
    
    setTimeout(() => {
        const element = marker.getElement();
        if (element) {
            element.classList.add('bounce-in');
        }
    }, 100);
}

// Validates the quick-add form and places a new marker on the map.
function addUserLocation() {
    const name = document.getElementById('location-name').value.trim();
    const lat = parseFloat(document.getElementById('location-lat').value);
    const lng = parseFloat(document.getElementById('location-lng').value);
    
    if (!name) {
        showAlert('warning', 'Please enter a location name');
        return;
    }
    
    if (isNaN(lat) || isNaN(lng)) {
        showAlert('warning', 'Please enter valid coordinates');
        return;
    }
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        showAlert('danger', 'Coordinates are out of valid range');
        return;
    }
    
    const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            background-color: #198754;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        "></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
    });
    
    const marker = L.marker([lat, lng], { icon }).addTo(map);
    
    const popupContent = `
        <div class="custom-popup">
            <h6><i class="fas fa-user-plus me-2 text-success"></i>${name}</h6>
            <div class="coordinates">${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
            <small class="text-muted">Added by user</small>
            <hr>
            <button class="btn btn-danger btn-sm" onclick="removeUserMarker(${userMarkers.length})">
                <i class="fas fa-trash me-1"></i>Remove
            </button>
        </div>
    `;
    
    marker.bindPopup(popupContent);
    marker.userIndex = userMarkers.length;
    userMarkers.push(marker);
    
    document.getElementById('quick-add-form').reset();
    
    map.setView([lat, lng], Math.max(map.getZoom(), 10));
    marker.openPopup();
    
    showAlert('success', `Added "${name}" to the map!`);
}

// Removes a marker that was added through the quick-add form.
function removeUserMarker(index) {
    if (userMarkers[index]) {
        map.removeLayer(userMarkers[index]);
        userMarkers[index] = null;
        showAlert('info', 'Location removed from map');
    }
}

// Shows a short-lived marker where the user clicks on the map.
function showTemporaryMarker(latlng) {
    if (window.tempMarker) {
        map.removeLayer(window.tempMarker);
    }
    
    const tempIcon = L.divIcon({
        className: 'temp-marker',
        html: `<div style="
            background-color: #ffc107;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            animation: pulse 1s infinite;
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
    });
    
    window.tempMarker = L.marker(latlng, { icon }).addTo(map);
    
    setTimeout(() => {
        if (window.tempMarker) {
            map.removeLayer(window.tempMarker);
            window.tempMarker = null;
        }
    }, 3000);
}

// Shows or hides the built-in sample markers.
function toggleSampleLocations(show) {
    map.eachLayer(function(layer) {
        if (layer.location && !layer.userIndex !== undefined) {
            if (show) {
                layer.addTo(map);
            } else {
                map.removeLayer(layer);
            }
        }
    });
}

// Shows or hides markers that came from the quick-add form.
function toggleUserLocations(show) {
    userMarkers.forEach(marker => {
        if (marker) {
            if (show) {
                marker.addTo(map);
            } else {
                map.removeLayer(marker);
            }
        }
    });
}

// Sends the map back to its default view and clears the coordinate prompt.
function resetMapView() {
    map.setView([54.0, 15.0], 4);
    document.getElementById('map-coordinates').textContent = 'Click on map to see coordinates';
    showAlert('info', 'Map view reset to default');
}

// Switches the loading overlay on and off.
function showMapLoading(show) {
    const overlay = document.getElementById('map-loading');
    if (show) {
        overlay.classList.remove('d-none');
    } else {
        overlay.classList.add('d-none');
    }
}

// Shows a temporary Bootstrap alert near the top of the page.
function showAlert(type, message) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alert.style.cssText = 'top: 80px; right: 20px; z-index: 9999; min-width: 300px;';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        if (alert.parentNode) {
            alert.classList.remove('show');
            setTimeout(() => alert.remove(), 150);
        }
    }, 5000);
}

// Adds the pulse animation used by the temporary click marker.
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.2); opacity: 0.7; }
        100% { transform: scale(1); opacity: 1; }
    }
`;
document.head.appendChild(style);
