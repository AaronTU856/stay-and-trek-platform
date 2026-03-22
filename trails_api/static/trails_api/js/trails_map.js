/* global loadTrails, setupEventListeners, enableProximitySearch, loadAllTrails */
/* eslint-disable no-unused-vars */



console.log("✅ trails_map.js loaded");
let map;
let allTrailsData = [];

// Global variables for route planning
let accommodationRequestId = 0; // API request control
let selectedTrail = null; // Store the currently selected trail for route planning
let selectedAccommodation = null; // Store the currently selected accommodation for route planning
let routeLayer = null; // Layer to display the generated route
let routingInProgress = false;

document.addEventListener("DOMContentLoaded", function () {
  console.log("📍 DOM loaded, initializing map...");
  initializeMap();
  fetch("/api/trails/route-test/")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Route test failed: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      if (!data) {
        return;
      }

      if (Array.isArray(data)) {
        data.forEach((line) => {
          const parsed = typeof line === "string" ? JSON.parse(line) : line;
          L.geoJSON(parsed).addTo(window.trailsMap);
        });
        return;
      }

      if (data.type === "Feature" || data.type === "FeatureCollection") {
        L.geoJSON(data).addTo(window.trailsMap);
        return;
      }

      console.warn("Route test skipped: unexpected payload");
    })
    .catch((error) => {
      console.warn("Route test skipped:", error.message);
    });
  
  //loadTrails(); // Don't load all trails by default
  loadTrailPaths();
  setupEventListeners();
  enableProximitySearch();
  
  // Load all trails into searchable layer (hidden from map view)
  // addSearchControls() will be called automatically when trails finish loading
  loadAllTrailsForSearch();

  if (window.trailsMap) {
        window.trailsMap.on('moveend', () => {

            if (routingInProgress) return;

            console.log("🔄 Map moved, updating accommodations...");
            updateAccommodations();
        });
        setTimeout(() => {
          console.log("🚀 Initial accommodation check...");
          updateAccommodations();
        }, 500);
    } else {
        console.error("❌ trailsMap not found during initialization");
    }
});

 



/*Load trails from the start point when search radius is performed
  This calls performProximitySearch instead*/

  function loadTrailsForSearch() {
    console.log("Loading trails for proximity search...");

    return fetch("/api/trails/geojson/")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        let features = [];

        if (data && data.type === "FeatureCollection" && Array.isArray(data.features)) {
          features = data.features.features
        } else if (Array.isArray(data)) {
          features = data.map((trail) => ({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [parseFloat(trail.longitude || 0), parseFloat(trail.latitude || 0)],
            },
            properties: trail,
          }));
        }

        if (features.length > 0) {
          console.log(`✅ Loaded ${features.length} trail features for search`);
          allTrailsData = features;
          return allTrailsData;
        }
        throw new Error("No valid features found in API response for search");
      })
      .catch((error) => {
        console.error("❌ Error loading trails for search:", error);
        return [];
      });

}


/**
 * Load all trails into a searchable layer (invisible on map)
 */
function loadAllTrailsForSearch() {
  console.log("📚 Loading all trails for global search...");
  
  // Create searchable layer if it doesn't exist
  if (!window.allSearchableTrails) {
    window.allSearchableTrails = L.layerGroup();
    console.log("✅ Created allSearchableTrails layer");
  }
  
  // Fetch all pages of trails since API is paginated
  let allTrails = [];
  let currentPage = 1;
  
  function fetchPage(pageNum) {
    fetch(`/api/trails/?page=${pageNum}`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (data && data.results && Array.isArray(data.results)) {
          allTrails = allTrails.concat(data.results);
          console.log(`📄 Loaded page ${pageNum}: ${data.results.length} trails (total: ${allTrails.length})`);
          
          // Check if there are more pages
          if (data.next) {
            currentPage++;
            fetchPage(currentPage);
          } else {
            // All pages loaded, now create markers
            createSearchableMarkers(allTrails);
          }
        }
      })
      .catch((err) => {
        console.error(`❌ Error loading page ${pageNum}:`, err);
      });
  }
  
  function createSearchableMarkers(trailsArray) {
    console.log(`📚 Creating markers for ${trailsArray.length} total trails...`);
    
    // Add each trail to the searchable layer but not displayed
    trailsArray.forEach((trail) => {
      try {
        const lat = parseFloat(trail.latitude);
        const lng = parseFloat(trail.longitude);
        
        if (isNaN(lat) || isNaN(lng)) return;
        
        const name = trail.name || trail.trail_name || "Unnamed Trail";
        const county = trail.county || "Unknown";
        const trailId = trail.id || trail.pk;
        
        // Create an invisible marker that can be searched but won't show on the map
        const marker = L.marker([lat, lng], {
          title: name,
          county: county,
          trailId: trailId,
          opacity: 0, // Make invisible
          interactive: false, // Don't respond to clicks
        }).bindPopup(`<b>${name}</b><br/>📍 ${county}`);
        
        window.allSearchableTrails.addLayer(marker);
      } catch (err) {
        console.error("Error adding trail to searchable layer:", err);
      }
    });
    
    console.log(`✅ ${window.allSearchableTrails.getLayers().length} trails loaded for search`);
    
    // Update the search control to include these trails
    addSearchControls();
  }
  
  // Start fetching from page 1
  fetchPage(1);
}

/**
 * Display a specific trail on the map when selected from search results
 * @param {number} trailId - The ID of the trail to display
 */
function displaySearchedTrail(trailId) {
  console.log(`🎯 Displaying trail with ID: ${trailId}`);
  
  fetch(`/api/trails/${trailId}/`)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then((trail) => {
      const lat = parseFloat(trail.latitude);
      const lng = parseFloat(trail.longitude);
      
      if (isNaN(lat) || isNaN(lng)) {
        console.error("Invalid coordinates for trail:", trail);
        return;
      }
      
      const name = trail.name || trail.trail_name || "Unnamed Trail";
      const county = trail.county || "Unknown";
      const distance = trail.distance_km || "?";
      const difficulty = trail.difficulty || "Unknown";
      const description = trail.description || "";
      
      // Create a popup with trail information
      const popupContent = `
        <div class="trail-popup">
          <h5>${name}</h5>
          <p><strong>County:</strong> ${county}</p>
          <p><strong>Distance:</strong> ${distance} km</p>
          <p><strong>Difficulty:</strong> ${difficulty}</p>
          ${description ? `<p><strong>Description:</strong> ${description}</p>` : ""}
        </div>
      `;
      
      // Use the green icon for highlighted trails
      const greenIcon = L.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      
      // Create and add marker to the map
      const marker = L.marker([lat, lng], { icon: greenIcon })
        .bindPopup(popupContent)
        .addTo(window.trailMarkers)
        .openPopup();
      
      // Zoom to the trail with some padding
      window.trailsMap.setView([lat, lng], 12);
      
      console.log(`✅ Trail ${name} (ID: ${trailId}) displayed on map`);
    })
    .catch((err) => {
      console.error(`❌ Error displaying trail ${trailId}:`, err);
    });
}


// Initialize map
/**
 * Initialize the Leaflet map with base tiles, zoom controls, and event listeners
 * Creates a global reference at window.trailsMap for use throughout the application
 */
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

  window.accommodationLayer = L.layerGroup().addTo(window.trailsMap);
  console.log("✅ Accommodation layer added to map");

  // Custom icon for hotels
  window.hotelIcon = L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  // Define layers for the toggle control
  const overlayMaps = {
    "Trail Start Points": window.trailMarkers,
    "Accommodations": window.accommodationLayer,
  };
  //Add control box to the map
  L.control.layers(null, overlayMaps).addTo(window.trailsMap);


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

/**
 * Load trail start points from the GeoJSON API endpoint
 * Fetches all trails and displays them as markers on the map
 * Handles loading state and error reporting
 */
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

          // Show weather popup with loading state
          const loadingHtml = `
            <b>${feature.properties.name}</b><br>
            <strong>Weather:</strong> Loading...
          `;
          layer.bindPopup(loadingHtml).openPopup();

          // Weather fetch on click
          fetch(`/api/trails/weather-town/?lat=${lat}&lng=${lng}`)
            .then(res => res.json())
            .then((weather) => {
              const description = weather.weather?.[0]?.description || "N/A";
              const temp = weather.main?.temp ?? "N/A";
              const wind = weather.wind?.speed ?? "N/A";

              const weatherHtml = `
                <b>${feature.properties.name}</b><br>
                <strong>Weather:</strong> ${description}<br>
                Temp: ${temp} °C<br>
                Wind: ${wind} m/s
              `;
              layer.bindPopup(weatherHtml).openPopup();
            }
          )
            .catch((err) => {
              console.error("❌ Weather fetch error:", err);
              layer.bindPopup(`<b>${feature.properties.name}</b><br><em>Weather data unavailable.</em>`).openPopup();
            });
        });
      },
    }).addTo(window.trailsMap);
  });

/**
 * Load trail path geometries from the GeoJSON API endpoint
 * Displays full trail routes as polylines on the map
 * Creates a layer that can be toggled on and off
 */
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

/**
 * Load trail data from the regular API endpoint (fallback method)
 * Used as a backup when the GeoJSON endpoint is unavailable
 * @returns {Promise} Promise resolving to the trail data
 */
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

/**
 * Display trail markers and popups on the Leaflet map
 * @param {Array} trails - Array of trail objects to display
 */
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

      marker.on("click", async function () {

        const lat = marker.getLatLng().lat
        const lng = marker.getLatLng().lng

        selectedTrail = {
          lat: lat,
          lng: lng,
          name: name
        };

        console.log("Selected trail:", selectedTrail)

        alert("Trail selected. Now click an accommodation to generate route")

       
    })
    

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

/**
 * Add search control panel to the map sidebar
 * Creates input field and search button for trail name searches
 */
function addSearchControls() {
  if (!window.trailsMap) return;

  console.log("📌 Initializing search controls...");

  // Use the all searchable trails layer that was loaded on page init
  if (!window.allSearchableTrails || !(window.allSearchableTrails instanceof L.LayerGroup)) {
    console.warn("⚠️ allSearchableTrails layer not ready yet");
    return;
  }
  
  const trailLayers = window.allSearchableTrails.getLayers();
  console.log(`✅ Using allSearchableTrails with ${trailLayers.length} trails for search`);

  // Remove old control if it exists
  if (window.searchTrail) {
    window.trailsMap.removeControl(window.searchTrail);
  }

  // Create search control with all loaded trails
  window.searchTrail = new L.Control.Search({
    layer: window.allSearchableTrails,
    propertyName: "title",
    initial: false,
    casesensitive: false,
    textPlaceholder: "Search trails by name (e.g Clara Esker)...",
    marker: false,
    position: "topleft",
    collapsed: false,
    moveToLocation: function (latlng, title, map) {
      console.log(`🎯 Search result selected: ${title}`);
      
      // Find the trail ID from the markers
      let trailId = null;
      window.allSearchableTrails.eachLayer((layer) => {
        if (layer.options.title === title) {
          trailId = layer.options.trailId;
        }
      });
      
      if (trailId) {
        // Display the selected trail
        displaySearchedTrail(trailId);
      } else {
        // Fallback: just zoom to the location
        console.warn("Trail ID not found for:", title);
        map.setView(latlng, 13);
      }
    },
  }).addTo(window.trailsMap);
  
  console.log("✨ Search control created and added to map");
}



/**
 * Execute a trail search based on user input from the search field
 * Filters trails by name and updates the map display
 */
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

/**
 * Calculate appropriate marker size based on population
 * @param {number} population - The population value
 * @returns {number} Marker radius in pixels
 */
function getMarkerSize(population) {
  const pop = parseInt(population) || 0;

  if (pop < 100000) return 8;

  if (pop < 500000) return 12;

  if (pop < 1000000) return 16;

  if (pop < 5000000) return 20;

  return 24;
}

/**
 * Display detailed information about a trail in a sidebar popup
 * @param {Object} trail - The trail object to display
 */
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

/**
 * Set up event listeners for map interactions and form controls
 * Binds button clicks and form submissions to their respective handlers
 */
function setupEventListeners() {
  // Search functionality

  const searchBtn = document.getElementById("search-btn");
  const searchInput = document.getElementById("trail-search");
  const clearSearchBtn = document.getElementById("clear-search");
  const refreshBtn = document.getElementById("refresh-map");
  const closeInfoBtn = document.getElementById("close-info");
  const addTrailBtn = document.getElementById("add-trail-btn");
  const saveTrailBtn = document.getElementById("save-trail");
  const toggleAccommodations = document.getElementById("toggle-accommodations");
  const fetchStaysBtn = document.getElementById("fetch-stays-btn");

  if (toggleAccommodations) {
    toggleAccommodations.addEventListener("change", function () {
      console.log("Accommodation toggle changed:", this.checked);

      if (this.checked) {
        // Show accommodations
        if (!window.trailsMap.hasLayer(window.accommodationLayer)) {
          window.trailsMap.addLayer(window.accommodationLayer);
        }
        updateAccommodations();
      } else {
        // Hide accommodations
        if (window.trailsMap.hasLayer(window.accommodationLayer)) {
          window.trailsMap.removeLayer(window.accommodationLayer);
        }
        window.accommodationLayer.clearLayers();
      }
    });
  }

  if (fetchStaysBtn) {
    fetchStaysBtn.addEventListener("click", function () {
      console.log("Fetching accommodations for currrent map area...");
      const center = window.trailsMap.getCenter();

      // Ensure checkbox is checked and layerv visible
      if (toggleAccommodations && !toggleAccommodations.checked) {
        toggleAccommodations.checked = true;
      }
      if (!window.trailsMap.hasLayer(window.accommodationLayer)) {
        window.trailsMap.addLayer(window.accommodationLayer);
      }
      updateAccommodations();
    });
  }

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

/**
 * Save a new trail to the database via the API
 * Validates form input and sends POST request with trail data
 */
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
/**
 * Center and zoom the map to a specific trail's start point
 * @param {number} trailId - The ID of the trail to zoom to
 */
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

/**
 * Update the trail count display in the UI
 * @param {number} count - The number of trails to display
 */
function updateTrailCount(count) {
  const countElement = document.getElementById("trail-count");

  if (countElement) {
    countElement.textContent = `${count} trails loaded`;
  }
}

/**
 * Show or hide the loading indicator
 * @param {boolean} show - true to display loading indicator, false to hide
 */
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

/**
 * Display an alert message to the user
 * @param {string} message - The message text to display
 * @param {string} type - The alert type (success, error, info, warning)
 */
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

/**
 * Retrieve CSRF token from page cookies for secure API requests
 * @returns {string} The CSRF token value
 */
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
/**
 * Enable proximity-based trail search functionality
 * Allows users to find trails within a specified radius of a clicked point
 */
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
    );

  // 🔵 Add or update the search radius circle
  if (window.searchCircle) {
    window.trailsMap.removeLayer(window.searchCircle);
  }

  window.searchCircle = L.circle([lat, lng], {
    radius: radiusKm * 1000, // convert km to meters
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
    updateAccommodations(lat, lng); // Passes the orange search marker location
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
/**
 * Display nearest trails found in proximity search with numbered markers
 * @param {Array} trails - Array of trail objects to display
 */
function displayNearestTrails(trails) {
  if (!window.nearestTrailsLayer)
    window.nearestTrailsLayer = L.layerGroup().addTo(window.trailsMap);

  window.nearestTrailsLayer.clearLayers();

  trails.forEach((trail, index) => {
    // Use distance_from_point_km which is returned by the API
    const distanceKm = trail.distance_from_point_km || trail.distance_to_user || 0;

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
            From Search: ${distanceKm.toFixed(1)} km
            
        `);

        // Routing store selected trail
        marker.on("click", function () {
        selectedTrail = {
          lat: lat,
          lng: lng,
          name: name
        };
        console.log("Selected trail for routing:", selectedTrail);

      });

    window.nearestTrailsLayer.addLayer(marker);
  });

  const group = new L.featureGroup([
    window.searchMarker,
    ...window.nearestTrailsLayer.getLayers(),
  ]);
  window.trailsMap.fitBounds(group.getBounds().pad(0.2));
}

// Simple numbered marker icon
/**
 * Create a numbered icon for numbered markers
 * @param {number} number - The number to display on the icon
 * @returns {L.DivIcon} A Leaflet icon object with the number
 */
function getNumberedIcon(number) {
  return L.divIcon({
    className: "numbered-marker",
    html: `<div class="marker-number">${number}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

// Side results panel
/**
 * Update the results panel with nearest trails information
 * @param {Object} data - The search results data containing trails array
 */
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
    distanceFromSearch: t.distance_from_point_km || 0,
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
                      trail.distanceFromSearch.toFixed(1)
                    } km away</small>
                    </div>`
                  )
                  .join("")}
            </div>
        </div>`;
  resultsPanel.style.display = "block";
  
  // Hide accommodation card when showing trail results
  const accommodationCard = document.getElementById("accommodation-card");
  if (accommodationCard) {
    accommodationCard.style.display = "block";
  }
}

// Clear markers and panel
/**
 * Clear proximity search results and remove temporary markers from the map
 */
function clearProximityResults() {
  if (window.searchMarker) {
    window.trailsMap.removeLayer(window.searchMarker);
    window.searchMarker = null;
  }
  if (window.nearestTrailsLayer) window.nearestTrailsLayer.clearLayers();

  const panel = document.getElementById("proximity-results");
  if (panel) panel.style.display = "none";
  
  // Show accommodation card again when clearing results
  const accommodationCard = document.getElementById("accommodation-card");
  if (accommodationCard) {
    accommodationCard.style.display = "block";
  }
}

// Weather popup for trail markers
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

function updateAccommodations(searchLat = null, searchLng = null) {
  console.log("🏨 updateAccommodations called");
  
  if (!window.trailsMap) {
    console.error("❌ trailsMap not initialized");
    return;
  }

  if (!window.accommodationLayer) {
    console.error("❌ Accommodation layer not initialized");
    return;
  }

  const accommodationsToggle = document.getElementById("toggle-accommodations");
  if (accommodationsToggle && !accommodationsToggle.checked) {
    accommodationsToggle.checked = true;
  }

  if (!window.trailsMap.hasLayer(window.accommodationLayer)) {
    window.trailsMap.addLayer(window.accommodationLayer);
  }

  const lat = searchLat || window.trailsMap.getCenter().lat;
  const lng = searchLng || window.trailsMap.getCenter().lng;

  const requestId = ++accommodationRequestId;

  console.log(`🏨 Fetching accommodations for lat=${lat}, lng=${lng}`);
  
  fetch(`/api/trails/accommodations/nearby/?lat=${lat}&lng=${lng}&radius=10`)
    .then(res => {
      console.log("🏨 Response status:", res.status);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    })
    .then(data => {
      if (requestId !== accommodationRequestId) {
        return;
      }
      console.log("🏨 API Response:", data);
      
      // Handle both GeoJSON (features) and direct results format

      console.log("RAW DATA:", JSON.stringify(data, null, 2));

      const features = data.results?.features || data.features || [];

      console.log("🏨 Features extracted:", features);

      window.accommodationLayer.clearLayers();
      console.log("🏨 Cleared old accommodation markers");

      let addedCount = 0;
      features.forEach((feature) => {
        const coords = feature?.geometry?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) {
          return;
        }
        const [accLng, accLat] = coords;
        const props = feature.properties || {};

        const marker = L.marker([accLat, accLng], {
            icon: window.hotelIcon
        }).bindPopup(`
            <div style="font-size: 12px;">
              <strong>${props.name || "Accommodation"}</strong><br>
              ${props.price_per_night ? '💰 €' + props.price_per_night + '/night<br>' : ''}
              ${props.rating ? '⭐ ' + props.rating : ''}
            </div>
        `);

        marker.on("click", function () {
          selectedAccommodation = {
            lat: marker.getLatLng().lat,
            lng: marker.getLatLng().lng
          };

          console.log("Selected accommodation:", selectedAccommodation);

          tryRoute();
        });

        marker.addTo(window.accommodationLayer);
        addedCount += 1;
      });

      console.log(`🏨 Added ${addedCount} accommodation markers`);

        if (typeof window.accommodationLayer.bringToFront === "function") {
          window.accommodationLayer.bringToFront();
        } else {
          window.accommodationLayer.eachLayer((layer) => {
            if (layer && typeof layer.bringToFront === "function") {
              layer.bringToFront();
            }
          });
        }

        const countEl = document.getElementById("accommodation-count");
        if (countEl) {
          countEl.textContent = `Found ${features.length} accommodations nearby`;
        }
    })
    .catch(err => {
      console.error("❌ API Error:", err);
      const countEl = document.getElementById("accommodation-count");
      if (countEl) {
        countEl.textContent = "❌ Error loading accommodations";
      }
    });
}



function drawRoute(geojson) {

  console.log("Total segments to draw:", geojson.features.length);
  geojson.features.forEach((f, i) => {
      console.log(`Segment ${i}: ${f.properties.segment}`, f.geometry.coordinates);
  });
  
  if (routeLayer) {
    window.trailsMap.removeLayer(routeLayer);
  }

  if (geojson.features) {
    console.log("Checking segment properties:");
    console.table(geojson.features.map(f => ({
      type: f.geometry.type,
      segment: f.properties.segment
    })));
  }

  // cretae GeoJSON layer
  routeLayer = L.geoJSON(geojson, {

    style: function(feature) {
      
      const segmentType = feature.properties ? feature.properties.segment : null;
      console.log("Styling segment:", segmentType);

      if  (segmentType == 'connector_start' || segmentType == 'connector_end') {
        return {
          color: "#118240", // A vibrant green
          weight: 4,
          dashArray: "5, 10",
          lineCap: "round",
          opacity: 0.8
        };
      }


      return {
        color: "#2b74b0", // Nice blue
        weight: 6,
        opacity: 1
      };
    }
  }).addTo(window.trailsMap);
  
 

  if (routeLayer && typeof routeLayer.getBounds === "function") {
    routeLayer.bringToFront(); // Moves the whole collection to the top
    
    const bounds = routeLayer.getBounds();
    if (bounds.isValid()) {
      window.trailsMap.fitBounds(bounds, { padding: [50, 50] });
    }
  }

  // Handle Tooltips/Status
  const routeNote = geojson.route_note || (geojson.features[0] && geojson.features[0].properties.note);
  const routeStatus = document.getElementById("route-status");
  if (routeStatus) {
    routeStatus.textContent = routeNote || "Route calculated successfully";
  }
}





function tryRoute() {
  if (!selectedTrail || !selectedAccommodation) return;

  routingInProgress = true;
  console.log("🚀 Requesting route...");

  fetch("/api/trails/route/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCsrfToken()
    },
    body: JSON.stringify({
      trail_lat: selectedTrail.lat,
      trail_lng: selectedTrail.lng,
      acc_lat: selectedAccommodation.lat,
      acc_lng: selectedAccommodation.lng
    })
  })
  .then(response => response.json())

  
  .then(data => {
    console.log("📦 Parsed Route Data:", data);
  
    if (data && ["success", "success_v2", "fallback"].includes(data.status)) {
      
      // --- SAFETY WRAPPER START ---
      let geojson = null;

      if (data.feature) {
          // If the backend updated to the new 'feature' key
          geojson = data.feature;
      } else if (data.type === "Feature") {
          // If backend is still sending the old 'flat' Feature format
          // We wrap it in a FeatureCollection so .length exists
          geojson = {
              type: "FeatureCollection",
              features: [data]
          };
      } else if (data.type === "FeatureCollection") {
          geojson = data;
      }
      // --- SAFETY WRAPPER END ---

      if (geojson && geojson.features) {
          console.log(`🎨 Drawing ${geojson.features.length} segments`);
          drawRoute(geojson);
      } else {
          console.warn("⚠️ Data was successful but no geometry found:", data);
      }

    } else {
      console.error("❌ Routing error:", data.message || "Unknown");
    }
  })
  .catch(err => console.error("🛑 Fetch error:", err))
  .finally(() => {
    routingInProgress = false;
  });
}