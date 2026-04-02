/* global loadTrails, setupEventListeners, enableProximitySearch, loadAllTrails */
/* eslint-disable no-unused-vars */



console.log("✅ trails_map.js loaded");
let map;
let allTrailsData = [];

// Keeps track of the trail, stay, and route currently being used for planning.
let accommodationRequestId = 0;
let selectedTrail = null;
let selectedAccommodation = null;
let routeLayer = null;
let routingInProgress = false;
let proximityTownPopup = null;
let proximityTownPopupTimer = null;

// Builds the hover tooltip shown on accommodation markers.
function getAccommodationTooltipHtml(details) {
  if (!details) return "Accommodation";

  const parts = [
    `<div class="accommodation-tooltip-name">${details.name || "Accommodation"}</div>`
  ];

  if (details.price_per_night) {
    parts.push(
      `<div class="accommodation-tooltip-meta">From €${details.price_per_night} per night</div>`
    );
  }

  if (details.rating) {
    parts.push(
      `<div class="accommodation-tooltip-meta">Guest rating: ${details.rating}/5</div>`
    );
  }

  if (details.source) {
    const sourceLabels = {
      booking: "Booking.com",
      airbnb: "Airbnb",
      trivago: "Trivago",
      manual: "Local listing"
    };

    parts.push(
      `<div class="accommodation-tooltip-meta">${sourceLabels[details.source] || "Stay listing"}</div>`
    );
  }

  return `<div class="accommodation-tooltip-card">${parts.join("")}</div>`;
}

// Adds the richer hover tooltip to one accommodation marker.
function bindAccommodationHoverTooltip(marker, details) {
  if (!marker) return;
  marker.unbindTooltip();
  marker.bindTooltip(getAccommodationTooltipHtml(details), {
    direction: "top",
    offset: [0, -18],
    opacity: 1,
    sticky: true,
    className: "accommodation-hover-tooltip"
  });
}

// Swaps the hover tooltip for a route-distance label once a route is found.
function bindAccommodationDistanceTooltip(marker, routeDistanceKm) {
  if (!marker) return;
  marker.unbindTooltip();
  marker.bindTooltip(`${routeDistanceKm} km`, {
    direction: "top",
    offset: [0, -18],
    opacity: 1,
    permanent: true,
    className: "accommodation-distance-label"
  }).openTooltip();
}

// Starts the main trails map workflow when the page is ready.
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
  
  loadTrailPaths();
  setupEventListeners();
  enableProximitySearch();
  
  // Loads every trail into the hidden search layer used by the global search box.
  loadAllTrailsForSearch();

  if (!window.trailsMap) {
    console.error("❌ trailsMap not found during initialization");
  }
});

 



// Loads trail start points for the search-driven flow.
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


// Loads every trail into an invisible layer so the search box can find them.
function loadAllTrailsForSearch() {
  console.log("📚 Loading all trails for global search...");
  
  if (!window.allSearchableTrails) {
    window.allSearchableTrails = L.layerGroup();
    console.log("✅ Created allSearchableTrails layer");
  }
  
  let allTrails = [];
  let currentPage = 1;
  
  // Pulls every page of trail data before building the search layer.
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
          
          if (data.next) {
            currentPage++;
            fetchPage(currentPage);
          } else {
            createSearchableMarkers(allTrails);
          }
        }
      })
      .catch((err) => {
        console.error(`❌ Error loading page ${pageNum}:`, err);
      });
  }
  
  // Builds invisible markers that can be searched without cluttering the map.
  function createSearchableMarkers(trailsArray) {
    console.log(`📚 Creating markers for ${trailsArray.length} total trails...`);
    
    trailsArray.forEach((trail) => {
      try {
        const lat = parseFloat(trail.latitude);
        const lng = parseFloat(trail.longitude);
        
        if (isNaN(lat) || isNaN(lng)) return;
        
        const name = trail.name || trail.trail_name || "Unnamed Trail";
        const county = trail.county || "Unknown";
        const trailId = trail.id || trail.pk;
        
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
    
    addSearchControls();
  }
  
  fetchPage(1);
}

// Shows one searched trail on the map and opens its details.
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
      
      const popupContent = `
        <div class="trail-popup">
          <h5>${name}</h5>
          <p><strong>County:</strong> ${county}</p>
          <p><strong>Distance:</strong> ${distance} km</p>
          <p><strong>Difficulty:</strong> ${difficulty}</p>
          ${description ? `<p><strong>Description:</strong> ${description}</p>` : ""}
        </div>
      `;
      
      const greenIcon = L.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      
      const marker = L.marker([lat, lng], { icon: greenIcon })
        .bindPopup(popupContent)
        .addTo(window.trailMarkers)
        .openPopup();
      
      window.trailsMap.setView([lat, lng], 12);
      
      console.log(`✅ Trail ${name} (ID: ${trailId}) displayed on map`);
    })
    .catch((err) => {
      console.error(`❌ Error displaying trail ${trailId}:`, err);
    });
}

// Builds the map, shared layers, and base controls for the trails page.
function initializeMap() {
  console.log("🗺️ Map initializing...");

  const irelandBounds = L.latLngBounds(
    [50.8, -12.8],
    [56.3, -4.8]
  );

  if (window.trailsMap instanceof L.Map) {
    console.warn("Map already exists — skipping reinitialization");
    return;
  }

  window.trailsMap = L.map("map", {
    maxBounds: irelandBounds,
    maxBoundsViscosity: 1.0,
    minZoom: 7,
  }).setView([53.5, -7.7], 7);
  console.log(
    " Created trailsMap:",
    window.trailsMap instanceof L.Map,
    window.trailsMap
  );

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
    {
      attribution:
        '&copy; <a href="https://carto.com/">CartoDB</a> contributors',
      subdomains: "abcd",
      maxZoom: 19,
    }
  ).addTo(window.trailsMap);

  window.trailMarkers = L.layerGroup().addTo(window.trailsMap);
  console.log("✅ Trail marker layer added to map");

  window.accommodationLayer = L.layerGroup().addTo(window.trailsMap);
  console.log("✅ Accommodation layer added to map");

  // Uses a quieter marker style for accommodation so it stays secondary to trails.
  window.hotelIcon = L.divIcon({
    className: "custom-marker",
    html: '<div class="accommodation-map-marker"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
  });

  const overlayMaps = {
    "Trail Start Points": window.trailMarkers,
    "Accommodations": window.accommodationLayer,
  };
  L.control.layers(null, overlayMaps).addTo(window.trailsMap);


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

// Loads trail start points and shows them as markers.
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

      if (
        data &&
        data.type === "FeatureCollection" &&
        Array.isArray(data.features)
      ) {
        features = data.features;

      } else if (
        data &&
        data.features &&
        Array.isArray(data.features.features)
      ) {
        features = data.features.features;

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

// Loads the town markers and weather popups used alongside the trail search flow.
fetch("/api/trails/towns/geojson/")
  .then((res) => res.json())
  .then((data) => {
    const townIconQuiet = L.icon({
      iconUrl:
        "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
      iconSize: [20, 33],
      iconAnchor: [10, 33],
      popupAnchor: [1, -28],
      shadowSize: [33, 33],
    });

    const townIconZoomed = L.icon({
      iconUrl:
        "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
      iconSize: [24, 39],
      iconAnchor: [12, 39],
      popupAnchor: [1, -32],
      shadowSize: [39, 39],
    });

    window.townMarkersLayer = L.geoJSON(data, {
      pointToLayer: (feature, latlng) =>
        L.marker(latlng, {
          icon: townIconQuiet,
          opacity: 0.58
        }),
      onEachFeature: (feature, layer) => {
        layer._townActive = false;

        layer.bindPopup(
          `<b>${feature.properties.name}</b><br>Click to find nearby trails`
        ).bindTooltip(feature.properties.name || "Town", {
          direction: "top",
          offset: [0, -16],
          opacity: 0.95,
          sticky: true
        });

        layer.on("mouseover", () => {
          layer.setOpacity(0.9);
        });

        layer.on("mouseout", () => {
          layer.setOpacity(layer._townActive ? 0.95 : 0.58);
        });

        layer.on("popupopen", () => {
          layer._townActive = true;
          layer.setOpacity(0.95);
        });

        layer.on("popupclose", () => {
          layer._townActive = false;
          layer.setOpacity(0.58);
        });

        layer.on("click", () => {
          const [lng, lat] = feature.geometry.coordinates;

          const loadingHtml = `
            <b>${feature.properties.name}</b><br>
            <strong>Weather:</strong> Loading...
          `;
          layer.bindPopup(loadingHtml).openPopup();

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

    const updateTownMarkerIcons = () => {
      if (!window.townMarkersLayer) return;

      const zoomedIn = window.trailsMap.getZoom() >= 9;
      window.townMarkersLayer.eachLayer((layer) => {
        if (layer && typeof layer.setIcon === "function") {
          layer.setIcon(zoomedIn ? townIconZoomed : townIconQuiet);
        }
      });
    };

    updateTownMarkerIcons();
    window.trailsMap.on("zoomend", updateTownMarkerIcons);
  });

// Loads the full trail paths so routes are visible as lines instead of just points.
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

      trailPathsLayer.bringToFront();
    })
    .catch((err) => console.error("❌ Error loading trail paths:", err));
}

// Falls back to the regular trail API if GeoJSON loading fails.
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

      if (data && data.results && Array.isArray(data.results)) {
        trailsArray = data.results;
      } else if (Array.isArray(data)) {
        trailsArray = data;
      } else {
        throw new Error("Unexpected response format from regular API");
      }

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

// Rebuilds the visible trail markers from the supplied trail list.
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
      }).bindPopup(popupHTML).bindTooltip(name, {
        direction: "top",
        offset: [0, -16],
        opacity: 0.95,
        sticky: true
      });

      marker.on("click", async function () {

        const lat = marker.getLatLng().lat
        const lng = marker.getLatLng().lng

        selectedTrail = {
          lat: lat,
          lng: lng,
          name: name
        };

        console.log("Selected trail:", selectedTrail)

        const countEl = document.getElementById("accommodation-count");
        if (countEl) {
          countEl.textContent = "Trail selected. Choose a stay to preview the road route.";
        }
        showRouteToast("Trail selected. Choose a stay to preview the road route.", "info");

       
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

// Adds the trail-name search box to the map once the search layer is ready.
function addSearchControls() {
  if (!window.trailsMap) return;

  console.log("📌 Initializing search controls...");

  if (!window.allSearchableTrails || !(window.allSearchableTrails instanceof L.LayerGroup)) {
    console.warn("⚠️ allSearchableTrails layer not ready yet");
    return;
  }
  
  const trailLayers = window.allSearchableTrails.getLayers();
  console.log(`✅ Using allSearchableTrails with ${trailLayers.length} trails for search`);

  if (window.searchTrail) {
    window.trailsMap.removeControl(window.searchTrail);
  }

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
      
      let trailId = null;
      window.allSearchableTrails.eachLayer((layer) => {
        if (layer.options.title === title) {
          trailId = layer.options.trailId;
        }
      });
      
      if (trailId) {
        displaySearchedTrail(trailId);
      } else {
        console.warn("Trail ID not found for:", title);
        map.setView(latlng, 13);
      }
    },
  }).addTo(window.trailsMap);
  
  console.log("✨ Search control created and added to map");
}



// Runs a typed trail search and redraws the map with the results.
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
        filteredTrails = data.features;
      } else {
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

// Keeps compatibility with older marker sizing logic.
function getMarkerSize(population) {
  const pop = parseInt(population) || 0;

  if (pop < 100000) return 8;

  if (pop < 500000) return 12;

  if (pop < 1000000) return 16;

  if (pop < 5000000) return 20;

  return 24;
}

// Fills the side panel with one trail's details.
function showTrailInfo(trail) {
  const infoPanel = document.getElementById("trail-info");

  const infoContent = document.getElementById("trail-info-content");

  if (!infoPanel || !infoContent) {
    console.warn("Trail info panel elements not found");

    return;
  }
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

// Hooks the main trail, stay, and search controls into the page.
function setupEventListeners() {
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
      const countEl = document.getElementById("accommodation-count");

      if (this.checked) {
        if (!window.trailsMap.hasLayer(window.accommodationLayer)) {
          window.trailsMap.addLayer(window.accommodationLayer);
        }

        const hasLoadedAccommodations = window.accommodationLayer.getLayers().length > 0;
        if (countEl && !hasLoadedAccommodations) {
          countEl.textContent = "Use Find nearby stays to load options for the current map view.";
        }
      } else {
        if (window.trailsMap.hasLayer(window.accommodationLayer)) {
          window.trailsMap.removeLayer(window.accommodationLayer);
        }
        if (countEl) {
          countEl.textContent = "Stay markers are hidden. Turn Show stays on map back on to view loaded results.";
        }
      }
    });
  }

  if (fetchStaysBtn) {
    fetchStaysBtn.addEventListener("click", function () {
      console.log("Fetching accommodations for currrent map area...");

      // Makes sure the accommodation layer is visible before loading stays.
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

// Saves a new trail from the add-trail form.
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

// Zooms the map to one stored trail marker.
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

// Updates the loaded-trail count in the UI.
function updateTrailCount(count) {
  const countElement = document.getElementById("trail-count");

  if (countElement) {
    countElement.textContent = `${count} trails loaded`;
  }
}

// Switches the loading state on the search button.
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

// Shows a temporary Bootstrap alert.
function showAlert(message, type) {
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

  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.remove();
    }
  }, 5000);
}

// Reads the CSRF token before API writes.
function getCsrfToken() {
  const cookies = document.cookie.split(";");

  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split("=");

    if (name === "csrftoken") {
      return value;
    }
  }

  const metaTag = document.querySelector('meta[name="csrf-token"]');

  if (metaTag) {
    return metaTag.getAttribute("content");
  }

  const csrfInput = document.querySelector('input[name="csrfmiddlewaretoken"]');

  if (csrfInput) {
    return csrfInput.value;
  }

  console.warn("CSRF token not found");
  return "";
}

function clearProximityTownPopup() {
  if (proximityTownPopupTimer) {
    clearTimeout(proximityTownPopupTimer);
    proximityTownPopupTimer = null;
  }

  if (window.trailsMap && proximityTownPopup) {
    window.trailsMap.closePopup(proximityTownPopup);
    proximityTownPopup = null;
  }
}

async function fetchTownWeather(lat, lng) {
  const response = await fetch(`/api/trails/weather-town/?lat=${lat}&lng=${lng}`);
  if (!response.ok) {
    throw new Error(`Weather request failed with ${response.status}`);
  }
  return response.json();
}

function buildTownWeatherHtml(weather) {
  const description = weather.weather?.[0]?.description || "Unavailable";
  const temp = weather.main?.temp ?? "N/A";
  const feelsLike = weather.main?.feels_like ?? "N/A";
  const wind = weather.wind?.speed ?? "N/A";

  return `
    <div class="mt-2 p-2 rounded" style="background:#f8f9fa; font-size:12px;">
      <div><strong>Live weather</strong></div>
      <div>${description}</div>
      <div>Temp: ${temp} °C</div>
      <div>Feels like: ${feelsLike} °C</div>
      <div>Wind: ${wind} m/s</div>
    </div>
  `;
}

console.log("✅ trails_map.js fully loaded");

// Turns the click-to-search mode on and off.
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

  window.trailsMap.on("click", (e) => {
    if (!searchEnabled) return;
    performProximitySearch(e.latlng.lat, e.latlng.lng);
  });
}

// Finds nearby trails from the clicked search point.
async function performProximitySearch(lat, lng) {
  clearProximityResults();

  const radiusKm = parseFloat(
    document.getElementById("radius-input").value || 10
  );

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
      // Still shows the nearest town even when no trails are returned.
      const town = await findNearestTown(lat, lng);
      await updateResultsPanel(data, town);
      return;
    }

    displayNearestTrails(data.nearest_trails);
    updateAccommodations(lat, lng); // Passes the orange search marker location
    const town = await findNearestTown(lat, lng);
    await updateResultsPanel(data, town);
    showAlert(`✅ Found ${data.nearest_trails.length} trails`, "success");
  } catch (err) {
    console.error("❌ Proximity search failed:", err);
    showAlert("Error performing proximity search.", "danger");
  } finally {
    showLoading(false);
  }

  // Adds the nearest town popup for extra context around the search point.
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

      clearProximityTownPopup();
      proximityTownPopup = L.popup()
        .setLatLng([lat, lng])
        .setContent(
          `🏙️ <strong>${town.name}</strong><br>
                         ${town.distance_km} km away<br>
                         Type: ${town.town_type || "N/A"}`
        )
        .openOn(window.trailsMap);

      proximityTownPopupTimer = setTimeout(() => {
        clearProximityTownPopup();
      }, 4000);

      console.log("Nearest town:", town);
      return town;
    } catch (err) {
      console.error("Nearest town error:", err);
      return null;
    }
  }
}

// Shows the nearby trail results with numbered markers.
function displayNearestTrails(trails) {
  if (!window.nearestTrailsLayer)
    window.nearestTrailsLayer = L.layerGroup().addTo(window.trailsMap);

  window.nearestTrailsLayer.clearLayers();

  trails.forEach((trail, index) => {
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
            
        `).bindTooltip(name, {
            direction: "top",
            offset: [0, -16],
            opacity: 0.95,
            sticky: true
        });

        // Stores the selected trail so the next accommodation click can route from it.
        marker.on("click", function () {
        clearProximityTownPopup();
        selectedTrail = {
          lat: lat,
          lng: lng,
          name: name
        };
        console.log("Selected trail for routing:", selectedTrail);

        const countEl = document.getElementById("accommodation-count");
        if (countEl) {
          countEl.textContent = "Trail selected. Choose an accommodation next.";
        }
        showRouteToast("Trail selected. Choose an accommodation next.", "info");

      });

    window.nearestTrailsLayer.addLayer(marker);
  });

  const group = new L.featureGroup([
    window.searchMarker,
    ...window.nearestTrailsLayer.getLayers(),
  ]);
  window.trailsMap.fitBounds(group.getBounds().pad(0.2));
}

// Builds a numbered marker icon for search results.
function getNumberedIcon(number) {
  return L.divIcon({
    className: "numbered-marker",
    html: `<div class="marker-number">${number}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

// Fills the floating results panel with the latest nearby trails.
async function updateResultsPanel(data, town = null) {
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

  let townSummaryHtml = "";
  if (town) {
    let weatherHtml = `
      <div class="mt-2 p-2 rounded" style="background:#f8f9fa; font-size:12px;">
        <div><strong>Live weather</strong></div>
        <div>Weather unavailable.</div>
      </div>
    `;

    if (typeof town.latitude === "number" && typeof town.longitude === "number") {
      try {
        const weather = await fetchTownWeather(town.latitude, town.longitude);
        weatherHtml = buildTownWeatherHtml(weather);
      } catch (err) {
        console.error("Nearest town weather error:", err);
      }
    }

    townSummaryHtml = `
      <div class="mb-3 p-2 rounded border" style="background:#fffdf5;">
        <div><strong>Nearest town:</strong> ${town.name}</div>
        <div><small>${town.distance_km} km away • ${town.town_type || "N/A"}</small></div>
        ${weatherHtml}
      </div>
    `;
  }

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
                ${townSummaryHtml}
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

// Clears the search point, nearby trail markers, and results panel.
function clearProximityResults() {
  clearProximityTownPopup();
  if (window.searchMarker) {
    window.trailsMap.removeLayer(window.searchMarker);
    window.searchMarker = null;
  }
  if (window.nearestTrailsLayer) window.nearestTrailsLayer.clearLayers();

  const panel = document.getElementById("proximity-results");
  if (panel) panel.style.display = "none";
  
  const accommodationCard = document.getElementById("accommodation-card");
  if (accommodationCard) {
    accommodationCard.style.display = "block";
  }
}

// Shows weather details for a clicked trail marker.
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

// Loads accommodation near the selected search area or trail.
function updateAccommodations(searchLat = null, searchLng = null) {
  console.log("updateAccommodations called");
  
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
  const countEl = document.getElementById("accommodation-count");
  const fetchBtn = document.getElementById("fetch-stays-btn");

  const requestId = ++accommodationRequestId;

  console.log(`Fetching accommodations for lat=${lat}, lng=${lng}`);

      if (countEl) {
        countEl.textContent = "Searching for nearby stays around your selected area...";
      }

      if (fetchBtn) {
        fetchBtn.disabled = true;
        fetchBtn.textContent = "Searching stays...";
  }
  
  fetch(`/api/trails/accommodations/nearby/?lat=${lat}&lng=${lng}&radius=10`)
    .then(res => {
      console.log("Response status:", res.status);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    })
    .then(data => {
      if (requestId !== accommodationRequestId) {
        return;
      }
      console.log("API Response:", data);
      
      console.log("RAW DATA:", JSON.stringify(data, null, 2));

      const features = data.results?.features || data.features || [];

      console.log("Features extracted:", features);

      window.accommodationLayer.clearLayers();
      selectedAccommodation = null;
      console.log("Cleared old accommodation markers");

      let addedCount = 0;
      features.forEach((feature) => {
        const coords = feature?.geometry?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) {
          return;
        }
        const [accLng, accLat] = coords;
      const props = feature.properties || {};
      const tooltipDetails = {
        name: props.name || "Accommodation",
        price_per_night: props.price_per_night,
        rating: props.rating,
        source: props.source
      };

        const marker = L.marker([accLat, accLng], {
            icon: window.hotelIcon
        });
        marker.accommodationTooltipDetails = tooltipDetails;

        bindAccommodationHoverTooltip(marker, tooltipDetails);

        marker.on("click", function () {
          clearProximityTownPopup();
          if (
            selectedAccommodation &&
            selectedAccommodation.marker &&
            selectedAccommodation.marker !== marker
          ) {
            bindAccommodationHoverTooltip(
              selectedAccommodation.marker,
              selectedAccommodation.marker.accommodationTooltipDetails
            );
          }

          selectedAccommodation = {
            lat: marker.getLatLng().lat,
            lng: marker.getLatLng().lng,
            marker: marker,
            name: props.name || "Accommodation"
          };

          console.log("Selected accommodation:", selectedAccommodation);

          tryRoute();
        });

        marker.addTo(window.accommodationLayer);
        addedCount += 1;
      });

      console.log(`Added ${addedCount} accommodation markers`);

        if (typeof window.accommodationLayer.bringToFront === "function") {
          window.accommodationLayer.bringToFront();
        } else {
          window.accommodationLayer.eachLayer((layer) => {
            if (layer && typeof layer.bringToFront === "function") {
              layer.bringToFront();
            }
          });
        }

        if (countEl) {
          countEl.textContent = features.length > 0
            ? `Showing ${features.length} nearby stays. Select one to map the route.`
            : "No nearby stays found in the current map area.";
        }
    })
    .catch(err => {
      console.error("❌ API Error:", err);
      if (countEl) {
        countEl.textContent = "Unable to load nearby stays.";
      }
    })
    .finally(() => {
      if (fetchBtn) {
        fetchBtn.disabled = false;
        fetchBtn.textContent = "Find nearby stays";
      }
    });
}



// Draws the routed GeoJSON and uses different styles for snapped connector
// segments versus the main road-network path.
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

  routeLayer = L.geoJSON(geojson, {

    style: function(feature) {
      
      const segmentType = feature.properties ? feature.properties.segment : null;
      console.log("Styling segment:", segmentType);

      if  (segmentType == 'connector_start' || segmentType == 'connector_end') {
        return {
          color: "#118240", // A vibrant green
          weight: 5,
          dashArray: "10, 10",
          lineCap: "round",
          opacity: 0.9
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

  // Keep a simple status message on the page after the map has been updated.
  const routeNote = geojson.route_note || (geojson.features[0] && geojson.features[0].properties.note);
  const routeStatus = document.getElementById("route-status");
  if (routeStatus) {
    routeStatus.textContent = routeNote || "Route calculated successfully";
  }
}

// Shows the routing status toast at the top of the page.
function showRouteToast(message, type = "success") {
  const toastEl = document.getElementById("routeToast");
  const toastBody = document.getElementById("routeToastBody");

toastEl.className = "toast align-items-center border-0";

if (type === "success") {
  toastEl.style.backgroundColor = "#198754";
  toastEl.style.color = "#fff";
} else if (type === "warning") {
  toastEl.style.backgroundColor = "#ffb703";
  toastEl.style.color = "#000";
} else if (type === "danger") {
  toastEl.style.backgroundColor = "#c1121f";
  toastEl.style.color = "#fff";
}

  if (!toastEl || !toastBody) return;

  toastBody.textContent = message;
  toastEl.className = `toast align-items-center border-0 text-bg-${type}`;

  const toast = new bootstrap.Toast(toastEl, {
    delay: 15000
  });

  toast.show();
}


// Requests a road route for the currently selected trail and accommodation,
// then updates both the map and the route-distance feedback.
function tryRoute() {

  if (!selectedTrail || !selectedAccommodation) return;

  routingInProgress = true;
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
    console.log("Parsed Route Data:", data);
  
    if (data && ["success", "success_v2", "fallback"].includes(data.status)) {
      
      let geojson = null;

      if (data.feature) {
          geojson = data.feature;
      } else if (data.type === "Feature") {
          geojson = {
              type: "FeatureCollection",
              features: [data]
          };
      } else if (data.type === "FeatureCollection") {
          geojson = data;
      }
      if (geojson && geojson.features) {
        console.log(`🎨 Drawing ${geojson.features.length} segments`);
        drawRoute(geojson);

        if (data.status === "fallback") {
          showRouteToast("Route could not be found. Showing straight-line connection.", "warning");
        } else {
          // Reuse the returned distance in both the marker label and the
          // sidebar summary so the route result is obvious at a glance.
          if (
            typeof data.route_distance_km === "number" &&
            selectedAccommodation &&
            selectedAccommodation.marker
          ) {
            bindAccommodationDistanceTooltip(
              selectedAccommodation.marker,
              data.route_distance_km
            );
            // If available, also shows the estimated travel times walking/driving for more context around the route.
            const timeSummary =
              data.estimated_times &&
              data.estimated_times.walking_label &&
              data.estimated_times.driving_label
                ? ` • Estimated Walking Distance: ${data.estimated_times.walking_label} • Estimated Driving Distance: ${data.estimated_times.driving_label}`
                : "";

            const countEl = document.getElementById("accommodation-count");
            if (countEl) {
              countEl.textContent = `Route distance to ${selectedAccommodation.name}: ${data.route_distance_km} km${timeSummary}`;
            }

            showRouteToast(
              `Shortest road route shown. Distance: ${data.route_distance_km} km${timeSummary}.`,
              "success"
            );
          } else {
            showRouteToast("Shortest road route to your accommodation shown.", "success");
          }
        }

      } else {
          console.warn("⚠️ Data was successful but no geometry found:", data);
      }

    } else {
      console.error("❌ Routing error:", data.message || "Unknown");
      showRouteToast("Route could not be calculated.", "danger");
    }
  })
  .catch(err => console.error("🛑 Fetch error:", err))
  .finally(() => {
    routingInProgress = false;
  });
}
