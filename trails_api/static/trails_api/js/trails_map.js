/* global loadTrails, setupEventListeners, enableProximitySearch, loadAllTrails */
/* eslint-disable no-unused-vars */



console.log("✅ trails_map.js loaded");
let map;
let allTrailsData = [];


document.addEventListener("DOMContentLoaded", function () {
  console.log("📍 DOM loaded, initializing map...");
  initializeMap();
  loadTrails();
  loadTrailPaths();
  setupEventListeners();
  enableProximitySearch();
});

// Initialize map
function initializeMap() {
  console.log("🗺️ Map initializing...");

  // If already created, skip
  if (window.trailsMap instanceof L.Map) {
    console.warn("Map already exists — skipping reinitialization");
    return;
  }

  // Create and store globally
  window.trailsMap = L.map("map").setView([53.5, -7.7], 7);
  console.log(
    " Created trailsMap:",
    window.trailsMap instanceof L.Map,
    window.trailsMap
  );

  // Add tile layer
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
    {
      attribution:
        '&copy; <a href="https://carto.com/">CartoDB</a> contributors',
      subdomains: "abcd",
      maxZoom: 19,
    }
  ).addTo(window.trailsMap);

  // Initialize marker layer
  window.trailMarkers = L.layerGroup().addTo(window.trailsMap);
  console.log("✅ Trail marker layer added to map");

  //  Custom green icon
  const defaultGreenIcon = L.icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  console.log("✅ Map and base layer ready!");
}

// Load trails from GeoJSON endpoint
function loadTrails() {
  console.log("🚀 Loading trails...");
  showLoading(true);

  fetch("/api/trails/geojson/")
    .then((response) => {
      console.log("Response status:", response.status);
      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status} - ${response.statusText}`
        );
      }
      return response.json();
    })
    .then((data) => {
      console.log("Raw API response:", data);
      console.log("Data type:", typeof data);
      console.log("Data keys:", Object.keys(data || {}));

      let features = [];

      // ✅ Handle GeoJSON FeatureCollection
      if (
        data &&
        data.type === "FeatureCollection" &&
        Array.isArray(data.features)
      ) {
        features = data.features;

        // ✅ Handle nested FeatureCollection (rare)
      } else if (
        data &&
        data.features &&
        Array.isArray(data.features.features)
      ) {
        features = data.features.features;

        // ✅ Handle plain array (non-GeoJSON response)
      } else if (Array.isArray(data)) {
        console.warn("Converting non-GeoJSON array to GeoJSON format...");
        features = data.map((trail) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [
              parseFloat(trail.longitude || 0),
              parseFloat(trail.latitude || 0),
            ],
          },
          properties: trail,
        }));
      }

      // ✅ Handle results
      if (features.length > 0) {
        console.log(`✅ Loaded ${features.length} trail features`);
        allTrailsData = features;
        displayTrailsOnMap(features);
        updateTrailCount(features.length);
      } else {
        console.warn(
          "⚠️ No valid features found in API response, trying fallback..."
        );
        return loadTrailsFromRegularAPI();
      }
    })
    .catch((error) => {
      console.error("❌ Error with geojson endpoint:", error);
      return loadTrailsFromRegularAPI();
    })
    .finally(() => {
      showLoading(false);
    });
}

fetch("/api/trails/towns/geojson/")
  .then((res) => res.json())
  .then((data) => {
    const townIcon = L.icon({
      iconUrl:
        "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    L.geoJSON(data, {
      pointToLayer: (feature, latlng) => L.marker(latlng, { icon: townIcon }),
      onEachFeature: (feature, layer) => {
        layer.bindPopup(
          `<b>${feature.properties.name}</b><br>Click to find nearby trails`
        );
        layer.on("click", () => {
          const [lng, lat] = feature.geometry.coordinates;

          // Weather fetch on click
          fetch(`/api/trails/weather-town/?lat=${lat}&lng=${lng}`)
            .then(res => res.json())
            .then((weather) => {
              const description = weather.weather?.[0]?.description || "N/A";
              const temp = weather.main?.temp ?? "N/A";
              const wind = weather.wind?.speed ?? "N/A";

              const weatherHtml = `
                <b>${feature.properties.name}</b><br>
                <strong>Weather:</strong> ${description}</br>
                Temp: ${temp} °C<br>
                Wind: ${wind} m/s<br><br>
                `;
                layer.bindPopup(weatherHtml + "<em>Finding nearby trails...</em>").openPopup();
            }
          )
            .catch((err) => {
              console.error("❌ Weather fetch error:", err);
              layer.bindPopup('<b>${feature.properties.name}</b><br><em>Weather data unavailable.</em><br>Finding nearby trails...').openPopup();

            });
          performProximitySearch(lat, lng);
        });
      },
    }).addTo(window.trailsMap);
  });

// Load trails paths
let trailPathsLayer;


function loadTrailPaths() {
  fetch("/api/trails/paths/geojson/")
    .then((res) => res.json())
    .then((data) => {
      console.log("🟧 Trail paths loaded:", data.features?.length || 0);

      if (trailPathsLayer) window.trailsMap.removeLayer(trailPathsLayer);

      trailPathsLayer = L.geoJSON(data, {
        style: {
          color: "#ff6600",
          weight: 4,
          opacity: 0.9,
        },
        onEachFeature: (feature, layer) => {
          const p = feature.properties || {};
          layer.bindPopup(`
            <b>${p.trail_name || "Unnamed Trail"}</b><br>
            County: ${p.county || "Unknown"}<br>
            Distance: ${p.distance_km || "?"} km<br>
            Difficulty: ${p.difficulty || "N/A"}
          `);
        },
      }).addTo(window.trailsMap);

      
      trailPathsLayer.bringToFront(); // ensure it’s visible on top
    })
    .catch((err) => console.error("❌ Error loading trail paths:", err));
}


function loadTrailsFromRegularAPI() {
  console.log("Trying regular API endpoint...");

  return fetch("/api/trails/")
    .then((response) => {
      console.log("Regular API response status:", response.status);

      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status} - ${response.statusText}`
        );
      }

      return response.json();
    })

    .then((data) => {
      console.log("Regular API response:", data);

      let trailsArray;

      // Handle different response formats

      if (data && data.results && Array.isArray(data.results)) {
        // Paginated response

        trailsArray = data.results;
      } else if (Array.isArray(data)) {
        // Direct array response

        trailsArray = data;
      } else {
        throw new Error("Unexpected response format from regular API");
      }

      // Convert to GeoJSON format

      const geojsonFeatures = trailsArray.map((trail) => ({
        type: "Feature",

        geometry: {
          type: "Point",

          coordinates: [
            parseFloat(trail.longitude || 0),
            parseFloat(trail.latitude || 0),
          ],
        },

        properties: trail,
      }));

      allTrailsData = geojsonFeatures;

      displayTrailsOnMap(allTrailsData);

      updateTrailCount(allTrailsData.length);

      console.log(
        `Successfully loaded ${allTrailsData.length} trails from regular API`
      );
    })

    .catch((error) => {
      console.error("Error loading trails from both endpoints:", error);

      // Show specific error messages
      if (error.message.includes("404")) {
        showAlert(
          "API endpoints not found. Please check your URLs configuration.",
          "danger"
        );
      } else if (error.message.includes("500")) {
        showAlert(
          "Server error. Please check your API views and database.",
          "danger"
        );
      } else if (error.message.includes("Failed to fetch")) {
        showAlert(
          "Network error. Please check if the server is running.",
          "danger"
        );
      } else {
        showAlert(`Error loading trails: ${error.message}`, "danger");
      }
    });
}

// Display trails on map
function displayTrailsOnMap(trails) {
  if (!window.trailsMap) {
    console.error("❌ trailsMap not initialized before displaying trails");
    return;
  }

  if (!window.trailMarkers || !(window.trailMarkers instanceof L.LayerGroup)) {
    console.log("🧭 Creating new trailMarkers LayerGroup...");
    window.trailMarkers = L.layerGroup().addTo(window.trailsMap);
  } else {
    console.log("🧹 Clearing existing trail markers...");
    window.trailMarkers.clearLayers();
  }

  let validMarkers = 0;
  const trailArray = Array.isArray(trails) ? trails : trails.features || [];

  trailArray.forEach((trail) => {
    try {
      const geometry = trail.geometry || null;
      const props = trail.properties || trail;

      let lat, lng;
      if (geometry?.coordinates && Array.isArray(geometry.coordinates)) {
        [lng, lat] = geometry.coordinates;
      } else {
        lat = parseFloat(props.latitude);
        lng = parseFloat(props.longitude);
      }

      if (isNaN(lat) || isNaN(lng)) {
        console.warn(
          `⚠️ Invalid coordinates for ${
            props.name || props.trail_name || "Unnamed Trail"
          }`
        );
        return;
      }

      const markerIcon = L.icon({
        iconUrl:
          "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      // ✅ Use the correct name field from your data
      const name = props.name || props.trail_name || "Unnamed Trail";
      const county = props.county || "Unknown";
      const distance = props.distance_km || "?";
      const difficulty = props.difficulty || "Unknown";

      const popupHTML = `
                <strong>${name}</strong><br>
                County: ${county}<br>
                Parking: ${
                  props.parking_available === "Yes" ? "✅ Yes" : "❌ No"
                }<br>
                Dogs Allowed: ${
                  props.dogs_allowed === "Yes" ? "✅ Yes" : "❌ No"
                }<br>
                Distance: ${distance} km<br>
                Difficulty: ${difficulty}
            `;

      const marker = L.marker([lat, lng], {
        icon: markerIcon,
        title: name,
        county: props.county || "",
      }).bindPopup(popupHTML);

      window.trailMarkers.addLayer(marker);
      validMarkers++;
    } catch (err) {
      console.error("❌ Error creating marker:", err);
    }
  });

  if (validMarkers > 0 && typeof window.trailMarkers.getBounds === "function") {
    const bounds = window.trailMarkers.getBounds();
    window.trailsMap.fitBounds(bounds, { padding: [30, 30] });
    console.log(`✅ Displayed ${validMarkers} valid trail markers`);
  } else {
    console.warn("⚠️ No valid markers to display or invalid trailMarkers type");
  }

  // ✅ Add search controls only when markers exist
  setTimeout(() => {
    if (
      typeof L.Control.Search === "function" &&
      window.trailMarkers.getLayers().length > 0
    ) {
      addSearchControls();
      console.log("✅ Search controls initialized after markers loaded");
    } else {
      console.warn("❌ Search plugin or markers not ready yet");
    }
  }, 1000);
}

function addSearchControls() {
  if (!window.trailsMap) return;
  if (window.searchTrail) return;

  // ✅ Collect only existing, non-empty layers
  const layers = [];
  if (window.trailMarkers && window.trailMarkers.getLayers().length > 0)
    layers.push(window.trailMarkers);
  if (
    window.nearestTrailsLayer &&
    window.nearestTrailsLayer.getLayers().length > 0
  )
    layers.push(window.nearestTrailsLayer);

  // 🔁 Merge into one searchable group
  const searchableLayer = L.layerGroup(layers);

  // 🔍 Trail name search
  window.searchTrail = new L.Control.Search({
    layer: searchableLayer,
    propertyName: "title",
    initial: false,
    casesensitive: false,
    textPlaceholder: "Search trail…",
    marker: false,
    position: "topleft",
    collapsed: false,
    moveToLocation: function (latlng, title, map) {
      map.setView(latlng, 13); // zoom level 13 or adjust as you like

      // Highlights the marker briefly
      const circle = L.circleMarker(latlng, {
        radius: 20,
        color: "orange",
        weight: 3,
        fillColor: "yellow",
        fillOpacity: 0.4,
      }).addTo(map);

      setTimeout(() => {
        map.removeLayer(circle);
      }, 4000);
    },
  }).addTo(window.trailsMap);
}


function performSearch() {
  const query = document.getElementById("trail-search").value.trim();

  if (!query) {
    displayTrailsOnMap(allTrailsData);

    updateTrailCount(allTrailsData.length);

    return;
  }

  showLoading(true);

  fetch(`/api/trails/search/?q=${encodeURIComponent(query)}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    })

    .then((data) => {
      console.log("Search response:", data);

      let filteredTrails;

      if (Array.isArray(data)) {
        // If search returns array of trail objects, convert to GeoJSON
        filteredTrails = data.map((trail) => ({
          type: "Feature",

          geometry: {
            type: "Point",

            coordinates: [
              parseFloat(trail.longitude || 0),
              parseFloat(trail.latitude || 0),
            ],
          },

          properties: trail,
        }));
      } else if (data.features && Array.isArray(data.features)) {
        // If search returns GeoJSON
        filteredTrails = data.features;
      } else {
        // Filter from existing data as fallback

        filteredTrails = allTrailsData.filter(
          (trail) =>
            trail.properties.name.toLowerCase().includes(query.toLowerCase()) ||
            trail.properties.country.toLowerCase().includes(query.toLowerCase())
        );
      }

      displayTrailsOnMap(filteredTrails);
      updateTrailCount(filteredTrails.length);

      if (filteredTrails.length === 0) {
        showAlert("No trails found matching your search.", "info");
      }
    })

    .catch((error) => {
      console.error("Error searching trails:", error);

      // Fallback to client-side search

      const filteredTrails = allTrailsData.filter(
        (trail) =>
          trail.properties.name.toLowerCase().includes(query.toLowerCase()) ||
          trail.properties.country.toLowerCase().includes(query.toLowerCase())
      );

      displayTrailsOnMap(filteredTrails);

      updateTrailCount(filteredTrails.length);

      if (filteredTrails.length === 0) {
        showAlert("No trails found matching your search.", "info");
      } else {
        showAlert(
          "Search performed offline due to connection issues.",
          "warning"
        );
      }
    })

    .finally(() => {
      showLoading(false);
    });
}

function getMarkerSize(population) {
  const pop = parseInt(population) || 0;

  if (pop < 100000) return 8;

  if (pop < 500000) return 12;

  if (pop < 1000000) return 16;

  if (pop < 5000000) return 20;

  return 24;
}

function showTrailInfo(trail) {
  const infoPanel = document.getElementById("trail-info");

  const infoContent = document.getElementById("trail-info-content");

  if (!infoPanel || !infoContent) {
    console.warn("Trail info panel elements not found");

    return;
  }
  // Safely handle missing properties
  const name =
    trail.name ||
    trail.trail_name ||
    trail.properties?.trail_name ||
    "Unnamed Trail";

  const country = trail.country || "Unknown Country";

  const population = trail.population
    ? trail.population.toLocaleString()
    : "Unknown";

  const latitude = trail.latitude || 0;

  const longitude = trail.longitude || 0;

  infoContent.innerHTML = `

        <div class="row">

            <div class="col-12">

                <h5 class="text-primary">${name}, ${country}</h5>

            </div>

        </div>

        <div class="trail-info-grid">

            <div class="info-item">

                <label>Population</label>

                <div class="value">${population}</div>

            </div>

            ${
              trail.founded_year
                ? `

                <div class="info-item">

                    <label>Founded</label>

                    <div class="value">${trail.founded_year}</div>

                </div>

            `
                : ""
            }

            ${
              trail.area_km2
                ? `

                <div class="info-item">

                    <label>Area</label>

                    <div class="value">${trail.area_km2} km²</div>

                </div>

            `
                : ""
            }

            ${
              trail.timezone
                ? `

                <div class="info-item">

                    <label>Timezone</label>

                    <div class="value">${trail.timezone}</div>

                </div>

            `
                : ""
            }

            <div class="info-item">

                <label>Coordinates</label>

                <div class="value">${parseFloat(latitude).toFixed(
                  6
                )}, ${parseFloat(longitude).toFixed(6)}</div>

            </div>

        </div>

        ${
          trail.description
            ? `

            <div class="mt-3">

                <label><strong>Description</strong></label>

                <div class="value">${trail.description}</div>

            </div>

        `
            : ""
        }

        <div class="mt-3">

            <button class="btn btn-primary btn-sm me-2" onclick="zoomToTrail(${
              trail.id
            })">Zoom to Trail</button>

            <button class="btn btn-outline-secondary btn-sm" onclick="copyCoordinates('${latitude}', '${longitude}')">Copy Coordinates</button>

        </div>

    `;

  infoPanel.style.display = "block";

  infoPanel.scrollIntoView({ behavior: "smooth" });
}

function setupEventListeners() {
  // Search functionality

  const searchBtn = document.getElementById("search-btn");
  const searchInput = document.getElementById("trail-search");
  const clearSearchBtn = document.getElementById("clear-search");
  const refreshBtn = document.getElementById("refresh-map");
  const closeInfoBtn = document.getElementById("close-info");
  const addTrailBtn = document.getElementById("add-trail-btn");
  const saveTrailBtn = document.getElementById("save-trail");

  if (searchBtn) {
    searchBtn.addEventListener("click", performSearch);
  }
  if (searchInput) {
    searchInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        performSearch();
      }
    });
  }
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", function () {
      if (searchInput) {
        searchInput.value = "";
      }

      displayTrailsOnMap(allTrailsData);
      updateTrailCount(allTrailsData.length);
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", loadTrails);
  }
  if (closeInfoBtn) {
    closeInfoBtn.addEventListener("click", function () {
      const infoPanel = document.getElementById("trail-info");

      if (infoPanel) {
        infoPanel.style.display = "none";
      }
    });
  }
  if (addTrailBtn) {
    addTrailBtn.addEventListener("click", function () {
      const modalElement = document.getElementById("addTrailModal");

      if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);

        modal.show();
      }
    });
  }

  if (saveTrailBtn) {
    saveTrailBtn.addEventListener("click", saveNewTrail);
  }
}

function saveNewTrail() {
  const nameInput = document.getElementById("trail-name");
  const countryInput = document.getElementById("trail-country");
  const latInput = document.getElementById("trail-lat");
  const lngInput = document.getElementById("trail-lng");
  const foundedInput = document.getElementById("trail-founded");
  const descriptionInput = document.getElementById("trail-description");
  const townInput = document.getElementById("trail-town");

  if (!nameInput || !countryInput || !latInput || !lngInput || !townInput) {
    showAlert("Required form elements not found.", "danger");
    return;
  }

  const formData = {
    name: nameInput.value.trim(),
    country: countryInput.value.trim(),
    latitude: parseFloat(latInput.value),
    longitude: parseFloat(lngInput.value),
    founded_year: foundedInput?.value ? parseInt(foundedInput.value) : null,
    description: descriptionInput?.value?.trim() || "",
    nearest_town: townInput.value.trim(),
  };

  // ✅ Validation
  if (
    !formData.name ||
    !formData.country ||
    isNaN(formData.latitude) ||
    isNaN(formData.longitude) ||
    !formData.nearest_town
  ) {
    showAlert(
      "Please fill in all required fields with valid values.",
      "warning"
    );
    return;
  }

  if (
    formData.latitude < -90 ||
    formData.latitude > 90 ||
    formData.longitude < -180 ||
    formData.longitude > 180
  ) {
    showAlert(
      "Please enter valid coordinates (latitude: -90 to 90, longitude: -180 to 180).",
      "warning"
    );
    return;
  }

  // Proceed with saving via API
  fetch("/api/trails/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCsrfToken(),
    },
    body: JSON.stringify(formData),
  })
    .then((response) => {
      if (!response.ok) throw new Error("Network response was not ok.");
      return response.json();
    })
    .then((data) => {
      showAlert("Trail added successfully!", "success");
      console.log("✅ New Trail Saved:", data);
      loadAllTrails(); // refresh map
    })
    .catch((error) => {
      console.error("❌ Error saving trail:", error);
      showAlert("Error saving trail. Please try again.", "danger");
    });
}

// Utility functions
function zoomToTrail(trailId) {
  const trail = allTrailsData.find(
    (c) => c.properties.id === parseInt(trailId)
  );

  if (trail && trail.geometry && trail.geometry.coordinates) {
    const [lng, lat] = trail.geometry.coordinates;

    if (!isNaN(lat) && !isNaN(lng)) {
      map.setView([lat, lng], 12);
    }
  }
}

function updateTrailCount(count) {
  const countElement = document.getElementById("trail-count");

  if (countElement) {
    countElement.textContent = `${count} trails loaded`;
  }
}

function showLoading(show) {
  const searchBtn = document.getElementById("search-btn");
  if (searchBtn) {
    if (show) {
      searchBtn.innerHTML = '<span class="loading"></span> Loading...';

      searchBtn.disabled = true;
    } else {
      searchBtn.innerHTML = "🔍 Search";

      searchBtn.disabled = false;
    }
  }
}

function showAlert(message, type) {
  // Create alert element

  const alertDiv = document.createElement("div");
  alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
  alertDiv.style.top = "20px";
  alertDiv.style.right = "20px";
  alertDiv.style.zIndex = "9999";
  alertDiv.style.minWidth = "300px";
  alertDiv.innerHTML = `

        ${message}

        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>

    `;

  document.body.appendChild(alertDiv);

  // Auto remove after 5 seconds

  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.remove();
    }
  }, 5000);
}

function getCsrfToken() {
  // Try multiple methods to get CSRF token

  // Method 1: From cookie

  const cookies = document.cookie.split(";");

  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split("=");

    if (name === "csrftoken") {
      return value;
    }
  }

  // Method 2: From meta tag

  const metaTag = document.querySelector('meta[name="csrf-token"]');

  if (metaTag) {
    return metaTag.getAttribute("content");
  }

  // Method 3: From form input

  const csrfInput = document.querySelector('input[name="csrfmiddlewaretoken"]');

  if (csrfInput) {
    return csrfInput.value;
  }

  console.warn("CSRF token not found");
  return "";
}

console.log("✅ trails_map.js fully loaded");

// Proximity Search Functionality
function enableProximitySearch() {
  const toggleBtn = document.getElementById("toggle-search");
  const radiusInput = document.getElementById("radius-input");

  if (!toggleBtn || !radiusInput) {
    console.warn("⚠️ Proximity UI elements missing");
    return;
  }

  let searchEnabled = false;

  toggleBtn.addEventListener("click", () => {
    searchEnabled = !searchEnabled;
    toggleBtn.textContent = searchEnabled ? "Disable Search" : "Enable Search";
    toggleBtn.classList.toggle("btn-danger", searchEnabled);
    toggleBtn.classList.toggle("btn-success", !searchEnabled);

    if (searchEnabled) {
      showAlert("🧭 Click on the map to search trails within radius", "info");
    } else {
      clearProximityResults();
    }
  });

  // Map click handler
  window.trailsMap.on("click", (e) => {
    if (!searchEnabled) return;
    performProximitySearch(e.latlng.lat, e.latlng.lng);
  });
}

// Main proximity search
async function performProximitySearch(lat, lng) {
  clearProximityResults();

  const radiusKm = parseFloat(
    document.getElementById("radius-input").value || 10
  );

  // 🔴 Red search marker
  window.searchMarker = L.marker([lat, lng], {
    icon: L.icon({
      iconUrl:
        "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    }),
  }).addTo(window.trailsMap);

  window.searchMarker
    .bindPopup(
      `<strong>Search Point</strong><br>Lat: ${lat.toFixed(
        5
      )}<br>Lng: ${lng.toFixed(5)}`
    )
    .openPopup();

  // 🔵 Add or update the search radius circle
  if (window.searchCircle) {
    window.trailsMap.removeLayer(window.searchCircle);
  }

  window.searchCircle = L.circle([lat, lng], {
    radius: radiusKm * 1000, // convert km → meters
    color: "blue",
    weight: 2,
    fillColor: "blue",
    fillOpacity: 0.1,
  }).addTo(window.trailsMap);

  showLoading(true);

  try {
    const response = await fetch("/api/trails/within-radius/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCsrfToken(),
      },
      body: JSON.stringify({
        latitude: lat,
        longitude: lng,
        radius_km: radiusKm,
      }),
    });

    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const data = await response.json();

    if (!data.nearest_trails?.length) {
      showAlert(`⚠️ No trails found within ${radiusKm} km.`, "warning");
      // 🔹 Still find the nearest town even if no trails found
      await findNearestTown(lat, lng);
      return;
    }

    displayNearestTrails(data.nearest_trails);
    updateResultsPanel(data);
    showAlert(`✅ Found ${data.nearest_trails.length} trails`, "success");

    // ✅ Always call this after trail results are shown
    await findNearestTown(lat, lng);
  } catch (err) {
    console.error("❌ Proximity search failed:", err);
    showAlert("Error performing proximity search.", "danger");
  } finally {
    showLoading(false);
  }

  // Find closect town to trails
  async function findNearestTown(lat, lng) {
    try {
      const response = await fetch("/api/trails/nearest-town/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });

      if (!response.ok) throw new Error("Request failed");
      const town = await response.json();

      L.popup()
        .setLatLng([lat, lng])
        .setContent(
          `🏙️ <strong>${town.name}</strong><br>
                         ${town.distance_km} km away<br>
                         Type: ${town.town_type || "N/A"}`
        )
        .openOn(window.trailsMap);

      console.log("Nearest town:", town);
    } catch (err) {
      console.error("Nearest town error:", err);
    }
  }
}

// Display numbered trail markers
function displayNearestTrails(trails) {
  if (!window.nearestTrailsLayer)
    window.nearestTrailsLayer = L.layerGroup().addTo(window.trailsMap);

  window.nearestTrailsLayer.clearLayers();

  trails.forEach((trail, index) => {
    trail.distance_to_user =
      trail.distance_to_user || trail.distance_from_point_km;

    const lat = parseFloat(trail.latitude || trail.coordinates?.lat);
    const lng = parseFloat(trail.longitude || trail.coordinates?.lng);
    if (isNaN(lat) || isNaN(lng)) return;

    const name = trail.name || trail.trail_name || "Unnamed Trail";
    const town = trail.nearest_town || trail.town || "";
    const county = trail.county || "Unknown";

    const marker = L.marker([lat, lng], {
      icon: getNumberedIcon(index + 1),
      title: name,
      town: town,
      county: county,
    }).bindPopup(`
            <strong>#${index + 1} ${name}</strong><br>
            County: ${trail.county || "Unknown"}<br>
            Difficulty: ${trail.difficulty || "N/A"}<br>
            Distance: ${trail.distance_km || "?"} km<br>
            From You: ${trail.distance_to_user?.toFixed(1) || "?"} km
            
        `);

    window.nearestTrailsLayer.addLayer(marker);
  });

  const group = new L.featureGroup([
    window.searchMarker,
    ...window.nearestTrailsLayer.getLayers(),
  ]);
  window.trailsMap.fitBounds(group.getBounds().pad(0.2));
}

// Simple numbered marker icon
function getNumberedIcon(number) {
  return L.divIcon({
    className: "numbered-marker",
    html: `<div class="marker-number">${number}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

// Side results panel
function updateResultsPanel(data) {
  let resultsPanel = document.getElementById("proximity-results");
  if (!resultsPanel) {
    resultsPanel = document.createElement("div");
    resultsPanel.id = "proximity-results";
    resultsPanel.className = "proximity-results-panel";
    document.body.appendChild(resultsPanel);
  }

  const trails = (data.nearest_trails || []).map((t) => ({
    ...t,
    distance_to_user: t.distance_to_user || t.distance_from_point_km,
  }));
  resultsPanel.innerHTML = `
        <div class="card shadow">
            <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
                <h5 class="mb-0">Nearest Trails</h5>
                <button type="button" class="btn-close btn-close-white" onclick="clearProximityResults()"></button>
            </div>
            <div class="card-body" style="max-height:300px; overflow-y:auto;">
                <p><strong>Search Point:</strong> ${data.search_point.lat.toFixed(
                  4
                )}, ${data.search_point.lng.toFixed(4)}</p>
                <p><strong>Found:</strong> ${trails.length}</p>
                ${trails
                  .map(
                    (trail, i) => `
                    <div class="result-item border-bottom py-2" onclick="zoomToTrail(${
                      trail.latitude
                    }, ${trail.longitude})">
                        <strong>#${i + 1} ${
                      trail.name || trail.trail_name || "Unnamed Trail"
                    }</strong><br>
                        <small>${trail.county || "Unknown"} • ${
                      trail.difficulty || "N/A"
                    } • ${
                      trail.distance_to_user?.toFixed(1) || "?"
                    } km away</small>
                    </div>`
                  )
                  .join("")}
            </div>
        </div>`;
  resultsPanel.style.display = "block";
}

// Clear markers and panel
function clearProximityResults() {
  if (window.searchMarker) {
    window.trailsMap.removeLayer(window.searchMarker);
    window.searchMarker = null;
  }
  if (window.nearestTrailsLayer) window.nearestTrailsLayer.clearLayers();

  const panel = document.getElementById("proximity-results");
  if (panel) panel.style.display = "none";
}

// Drawing Tool for Trail Paths

// Initialize the draw control
const drawControl = new L.Control.Draw({
  draw: {
    marker: false,
    circle: false,
    rectangle: false,
    polygon: false,
    polyline: {
      shapeOptions: {
        color: "orange",
        weight: 4,
      },
    },
  },
  edit: {
    featureGroup: L.featureGroup().addTo(window.trailsMap),
  },
});
window.trailsMap.addControl(drawControl);

// Handle created trail
window.trailsMap.on(L.Draw.Event.CREATED, function (e) {
  const layer = e.layer;
  window.trailsMap.addLayer(layer);

  const coordinates = layer.getLatLngs().map((p) => [p.lat, p.lng]);
  console.log("Trail coordinates:", coordinates);

  // POST these to Django API
  fetch("/api/trails/add-path/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCsrfToken(),
    },
    body: JSON.stringify({ path: coordinates }),
  }).then(() => showAlert("Trail path saved!", "success"));
});


function onTrailClick(e) {
    const trailId = e.target.options.trailId;

    fetch(`/api/trails/weather/${trailId}/`)
        .then(response => response.json())
        .then(data => {
            const weatherHtml = `
                <strong>Weather:</strong><br>
                ${data.weather[0].description}<br>
                Temp: ${data.main.temp} °C<br>
                Wind: ${data.wind.speed} m/s
            `;

            L.popup()
                .setLatLng(e.latlng)
                .setContent(weatherHtml)
                .openOn(map);
        })
        .catch(error => console.error('Weather error:', error));
}

