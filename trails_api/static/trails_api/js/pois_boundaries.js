/**
 * POI and Geographic Boundary Map Visualization
 * Adds Points of Interest (parking, cafes, attractions) and boundaries to the Leaflet map
 */

console.log("✅ pois_boundaries.js loaded");

// Get CSRF token from cookie
function getCookie(name) {
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
  return cookieValue;
}

const csrftoken = getCookie('csrftoken');

// POI Type colors and icons
const POI_TYPES = {
  parking: { color: "#FF6B6B", icon: "🅿️", label: "Parking" },
  cafe: { color: "#FFD93D", icon: "☕", label: "Café" },
  restaurant: { color: "#FFA500", icon: "🍽️", label: "Restaurant" },
  attraction: { color: "#6BCB77", icon: "⭐", label: "Attraction" },
  viewpoint: { color: "#4D96FF", icon: "👁️", label: "Viewpoint" },
  toilet: { color: "#9D84B7", icon: "🚻", label: "Toilet" },
  shelter: { color: "#A8D8D8", icon: "🏕️", label: "Shelter" },
  picnic: { color: "#FFC93C", icon: "🧺", label: "Picnic Area" },
  information: { color: "#95B8D1", icon: "ℹ️", label: "Information" },
  accommodation: { color: "#E8B4B8", icon: "🏨", label: "Accommodation" },
};

// Layer groups for different POI types
let poiLayerGroups = {};
let boundaryLayer = L.layerGroup();
let selectedPOITypes = new Set(Object.keys(POI_TYPES)); // All POI types visible by default

/**
 * Initialize POI layers on the map
 */
function initializePOILayers() {
  if (!window.trailsMap) {
    console.warn("⚠️ trailsMap not initialized yet");
    return;
  }

  console.log("🎯 Initializing POI layers...");

  // Create a layer group for each POI type
  Object.keys(POI_TYPES).forEach((type) => {
    poiLayerGroups[type] = L.layerGroup().addTo(window.trailsMap);
  });

  // Add boundary layer
  boundaryLayer.addTo(window.trailsMap);

  console.log("✅ POI layers initialized");
}

/**
 * Load all POIs from the API and add to map
 */
function loadAllPOIs() {
  console.log("📍 Loading all POIs...");

  fetch("/api/trails/pois/")
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((data) => {
      console.log(`Found ${data.results ? data.results.length : 0} POIs`);

      // Handle pagination
      const pois = data.results || data;
      pois.forEach((poi) => addPOIMarker(poi));

      console.log("✅ All POIs loaded");
    })
    .catch((err) => console.error("❌ Error loading POIs:", err));
}

/**
 * Add a single POI marker to the map
 */
function addPOIMarker(poi) {
  if (!poi.latitude || !poi.longitude) return;

  const poiType = poi.poi_type || "attraction";
  const typeInfo = POI_TYPES[poiType] || POI_TYPES.attraction;

  // Create custom HTML icon with emoji
  const iconHtml = `
    <div style="
      background: ${typeInfo.color};
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    ">
      ${typeInfo.icon}
    </div>
  `;

  const customIcon = L.divIcon({
    html: iconHtml,
    iconSize: [32, 32],
    className: "poi-marker",
  });

  // Create popup content
  const popupContent = `
    <div style="min-width: 200px;">
      <h6 style="margin: 0 0 8px 0;">${poi.name}</h6>
      <p style="margin: 4px 0; font-size: 12px;">
        <strong>Type:</strong> ${typeInfo.label}
      </p>
      ${poi.county ? `<p style="margin: 4px 0; font-size: 12px;"><strong>County:</strong> ${poi.county}</p>` : ""}
      ${poi.description ? `<p style="margin: 4px 0; font-size: 12px;">${poi.description}</p>` : ""}
      ${poi.phone ? `<p style="margin: 4px 0; font-size: 12px;">📞 ${poi.phone}</p>` : ""}
      ${poi.website ? `<p style="margin: 4px 0; font-size: 12px;"><a href="${poi.website}" target="_blank">🌐 Website</a></p>` : ""}
      ${poi.opening_hours ? `<p style="margin: 4px 0; font-size: 12px;">⏰ ${poi.opening_hours}</p>` : ""}
    </div>
  `;

  const marker = L.marker([poi.latitude, poi.longitude], {
    icon: customIcon,
  }).bindPopup(popupContent);

  // Add to appropriate layer group
  if (poiLayerGroups[poiType]) {
    marker.addTo(poiLayerGroups[poiType]);
  }

  return marker;
}

/**
 * Load POIs of a specific type near a trail
 */
function loadPOIsNearTrail(trailId, poiType = null) {
  console.log(`📍 Loading POIs near trail ${trailId}...`);

  fetch("/api/trails/pois/near-trail/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrftoken,
    },
    body: JSON.stringify({ trail_id: trailId }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (!data.pois) return;

      console.log(`Found ${data.pois.length} POIs near trail`);

      // Clear existing POI markers and reload
      Object.values(poiLayerGroups).forEach((group) => group.clearLayers());

      // Add filtered POIs
      data.pois.forEach((intersection) => {
        const poi = intersection.poi;
        if (!poiType || poi.poi_type === poiType) {
          addPOIMarker(poi);
        }
      });
    })
    .catch((err) => console.error("❌ Error loading trail POIs:", err));
}

/**
 * Load POIs within a radius
 */
function loadPOIsInRadius(lat, lng, radiusKm = 5, poiType = null) {
  console.log(`📍 Loading POIs within ${radiusKm}km of (${lat}, ${lng})...`);

  fetch("/api/trails/pois/radius-search/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": csrftoken,
    },
    body: JSON.stringify({
      latitude: lat,
      longitude: lng,
      radius_km: radiusKm,
      poi_type: poiType,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (!data.pois) return;

      console.log(`Found ${data.pois.length} POIs in radius`);

      // Clear and reload
      Object.values(poiLayerGroups).forEach((group) => group.clearLayers());

      data.pois.forEach((poi) => addPOIMarker(poi));
    })
    .catch((err) => console.error("❌ Error loading radius POIs:", err));
}

/**
 * Load geographic boundaries (counties, protected areas, rivers)
 * Combines rivers and protected areas into a single efficient load
 */
function loadGeographicBoundaries() {
  console.log("🗺️ Loading geographic boundaries...");
  // Rivers are loaded separately via loadRivers() - skip duplicate call
}

/**
 * Load rivers from geographic boundaries API
 */
function loadRivers() {
  console.log("🌊 Loading rivers from API (nationwide coverage)...");
  console.log("Map object check:", window.trailsMap ? "✅ EXISTS" : "❌ MISSING");

  if (!window.trailsMap) {
    console.error("❌ Map object (window.trailsMap) not initialized!");
    return;
  }

  let allRivers = [];
  let nextUrl = "/api/trails/boundaries/?boundary_type=river&limit=100";
  let pageCount = 0;
  const maxPages = 10; // Load first 10 pages (~1000 rivers) for now

  function fetchPage(url) {
    if (pageCount >= maxPages) {
      console.warn(`⚠️ Reached max pages limit (${maxPages}), starting render...`);
      renderAllRivers(allRivers);
      return;
    }

    pageCount++;
    console.log(`📍 Fetching page ${pageCount}...`);
    
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        const rivers = data.results || [];
        console.log(`  ✓ Page ${pageCount}: Got ${rivers.length} rivers (total so far: ${allRivers.length + rivers.length})`);
        
        allRivers = allRivers.concat(rivers);

        // Check if there are more pages and we haven't hit max
        if (data.next && pageCount < maxPages) {
          // Continue fetching
          setTimeout(() => fetchPage(data.next), 100); // Small delay to prevent blocking
        } else {
          console.log(`✅ Finished loading rivers. Total: ${allRivers.length}`);
          renderAllRivers(allRivers);
        }
      })
      .catch((err) => {
        console.error("❌ Error fetching rivers:", err);
        if (allRivers.length > 0) {
          console.log(`Rendering ${allRivers.length} rivers collected so far`);
          renderAllRivers(allRivers);
        }
      });
  }

  function renderAllRivers(rivers) {
    console.log(`🎨 Rendering ${rivers.length} rivers on map (batch mode)...`);
    console.log("Map check before rendering:", window.trailsMap ? "✅ EXISTS" : "❌ MISSING");
    
    let renderedCount = 0;
    let skippedCount = 0;
    const batchSize = 50; // Render in batches of 50
    let batchIndex = 0;
    let firstRiverCoords = null;

    function renderBatch() {
      const start = batchIndex * batchSize;
      const end = Math.min(start + batchSize, rivers.length);
      
      for (let i = start; i < end; i++) {
        const river = rivers[i];
        try {
          if (!river.geom || river.geom.type !== "LineString") {
            skippedCount++;
            continue;
          }

          const coords = river.geom.coordinates; // Already in [lat, lon] format from API
          if (coords.length < 2) {
            console.warn(`⚠️ River ${river.name} has ${coords.length} coordinates`);
            skippedCount++;
            continue;
          }

          // Store first river's coords for debugging
          if (renderedCount === 0 && !firstRiverCoords) {
            firstRiverCoords = coords.slice(0, 3);
            console.log(`📍 First river: ${river.name}`);
            console.log(`   API coords (first 3): ${JSON.stringify(coords.slice(0, 3))}`);
          }

          const polyline = L.polyline(coords, {
            color: "#4D96FF",
            weight: 2,
            opacity: 0.6,
          }).bindPopup(`<b>${river.name}</b><br/><small>${river.boundary_type}</small>`);

          polyline.addTo(window.trailsMap);
          renderedCount++;
          
          if (i === start && renderedCount === 1) {
            console.log(`  ✅ First polyline added to map`);
            console.log(`     Polyline bounds:`, polyline.getBounds());
          }
        } catch (err) {
          console.warn(`⚠️ Error rendering ${river.name}: ${err.message}`);
          console.error(err);
          skippedCount++;
        }
      }

      console.log(`  ✓ Batch ${batchIndex + 1}: Rendered ${end - start} rivers (total: ${renderedCount})`);
      batchIndex++;

      // Continue next batch if there are more
      if (end < rivers.length) {
        setTimeout(renderBatch, 50); // 50ms delay between batches
      } else {
        console.log(`✅ Finished rendering! Total: ${renderedCount} rivers | Skipped: ${skippedCount}`);
        console.log(`   Map bounds:`, window.trailsMap.getBounds());
        console.log(`   Map center:`, window.trailsMap.getCenter());
      }
    }

    renderBatch();
  }

  fetchPage(nextUrl);
}

/**
 * Load trails that cross a specific boundary
 */
function loadTrailsCrossingBoundary(boundaryId) {
  console.log(`🗺️ Loading trails crossing boundary ${boundaryId}...`);

  fetch(`/api/trails/boundaries/${boundaryId}/trails-crossing/`)
    .then((response) => response.json())
    .then((data) => {
      console.log(`Trails crossing: ${data.trails_crossing_count}`);
      console.log(`Trails within: ${data.trails_within_count}`);

      // Could highlight these trails or display in a list
      console.log("Data:", data);
    })
    .catch((err) => console.error("❌ Error loading boundary trails:", err));
}

/**
 * Load trails near a boundary (start point within radius meters)
 */
function loadTrailsNearBoundary(boundaryId, radiusMeters = 200) {
  if (!window.trailsMap) return;
  const url = `/api/trails/boundaries/${boundaryId}/trails-near/?radius_m=${radiusMeters}`;
  console.log(`🛤️🔍 Fetching trails within ${radiusMeters}m of boundary ${boundaryId} ...`);
  fetch(url)
    .then((r) => r.json())
    .then((trails) => {
      console.log(`✅ ${trails.length} trails near boundary`);
      trails.forEach((t) => {
        if (!t.latitude || !t.longitude) return;
        const marker = L.circleMarker([t.latitude, t.longitude], {
          radius: 5,
          color: '#FF9F1C',
          fillColor: '#FF9F1C',
          fillOpacity: 0.9,
        }).bindPopup(`<b>${t.trail_name}</b><br/>${t.county}`);
        marker.addTo(window.trailsMap);
      });
    })
    .catch((e) => console.error('Error loading trails near boundary:', e));
}

/**
 * Load trails by county
 */
function loadTrailsByCounty(countyName) {
  console.log(`🗺️ Loading trails in ${countyName}...`);

  fetch(`/api/trails/boundaries/county/${countyName}/trails/`)
    .then((response) => response.json())
    .then((data) => {
      console.log(`Found ${data.count || 0} trails in ${countyName}`);
    })
    .catch((err) => console.error("❌ Error loading county trails:", err));
}

/**
 * Get spatial analysis summary
 */
function getSpatialAnalysisSummary() {
  console.log("📊 Loading spatial analysis summary...");

  fetch("/api/trails/spatial-analysis/summary/")
    .then((response) => response.json())
    .then((data) => {
      console.log("=== SPATIAL ANALYSIS SUMMARY ===");
      console.log(`Total Trails: ${data.total_trails}`);
      console.log(`Total POIs: ${data.total_pois}`);
      console.log(`POIs by Type:`, data.pois_by_type);
      console.log(`Geographic Boundaries: ${data.geographic_boundaries}`);
      console.log(`Trail-POI Intersections: ${data.trail_poi_intersections}`);
      console.log("POIs Near Trails:", data.pois_near_trails);

      return data;
    })
    .catch((err) => console.error("❌ Error loading summary:", err));
}

/**
 * Toggle POI type visibility
 */
function togglePOIType(poiType) {
  if (selectedPOITypes.has(poiType)) {
    selectedPOITypes.delete(poiType);
    if (poiLayerGroups[poiType]) {
      window.trailsMap.removeLayer(poiLayerGroups[poiType]);
    }
  } else {
    selectedPOITypes.add(poiType);
    if (poiLayerGroups[poiType]) {
      window.trailsMap.addLayer(poiLayerGroups[poiType]);
    }
  }
  console.log("Visible POI types:", Array.from(selectedPOITypes));
}

/**
 * Create a control panel for POI filtering
 */
function createPOIControlPanel() {
  const controlHTML = `
    <div style="
      background: white;
      padding: 12px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      max-width: 250px;
      margin: 8px;
    ">
      <h6 style="margin-top: 0;"> Points of Interest</h6>
      <div style="font-size: 12px;">
        ${Object.entries(POI_TYPES)
          .map(
            ([key, value]) => `
          <label style="display: flex; align-items: center; margin: 6px 0; cursor: pointer;">
            <input type="checkbox" data-poi-type="${key}" checked 
              style="margin-right: 6px; cursor: pointer;">
            <span style="color: ${value.color}; font-weight: bold;">${value.icon}</span>
            <span style="margin-left: 6px;">${value.label}</span>
          </label>
        `
          )
          .join("")}
      </div>
      <button id="load-all-pois-btn" class="btn btn-sm btn-success w-100 mt-2">
        Load All POIs
      </button>
      <button id="analysis-btn" class="btn btn-sm btn-success w-100 mt-2">
        Spatial Analysis
      </button>
    </div>
  `;

  const controlDiv = document.createElement("div");
  controlDiv.innerHTML = controlHTML;
  controlDiv.style.position = "absolute";
  controlDiv.style.top = "100px";
  controlDiv.style.right = "12px";
  controlDiv.style.zIndex = "1000";

  document.querySelector("#map").appendChild(controlDiv);

  // Add event listeners
  document.querySelectorAll('input[data-poi-type]').forEach((checkbox) => {
    checkbox.addEventListener("change", (e) => {
      togglePOIType(e.target.dataset.poiType);
    });
  });

  document.getElementById("load-all-pois-btn").addEventListener("click", () => {
    loadAllPOIs();
  });

  document.getElementById("analysis-btn").addEventListener("click", () => {
    getSpatialAnalysisSummary();
  });
}

/**
 * Load trails that cross a boundary and draw them from GeoJSON
 */
function loadTrailsCrossingBoundary(boundaryId) {
  if (!window.trailsMap) {
    console.warn("Map not ready");
    return;
  }
  if (!boundaryId) {
    console.warn("No boundaryId provided to loadTrailsCrossingBoundary");
    return;
  }
  const url = `/api/trails/boundaries/${boundaryId}/trails-crossing/geojson/`;
  console.log(`🛤️ Fetching trails crossing boundary ${boundaryId} ...`);
  fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((features) => {
      console.log(`✅ Received ${features.length} trail paths`);
      const layer = L.geoJSON(features, {
        style: {
          color: '#FF6B6B',
          weight: 3,
          opacity: 0.9,
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties || {};
          const name = props.trail_name || props.name || 'Trail';
          layer.bindPopup(`<b>${name}</b>`);
        },
      }).addTo(window.trailsMap);
      try {
        window.trailsMap.fitBounds(layer.getBounds(), { padding: [20, 20] });
      } catch (e) {}
    })
    .catch((err) => console.error('❌ Error loading crossing trails:', err));
}

/**
 * Initialize everything when DOM is ready
 */
document.addEventListener("DOMContentLoaded", function () {
  // Wait a moment for the main map to initialize
  setTimeout(() => {
    if (window.trailsMap) {
      console.log("🎯 POI system initializing...");
      initializePOILayers();
      createPOIControlPanel();
      loadAllPOIs();
      loadRivers();
      loadGeographicBoundaries();
      getSpatialAnalysisSummary();
    } else {
      console.warn("⚠️ Main map not ready, retrying...");
      setTimeout(arguments.callee, 500);
    }
  }, 500);
});

// Export functions for use in console/other scripts
window.poiMap = {
  loadAllPOIs,
  loadPOIsNearTrail,
  loadPOIsInRadius,
  loadRivers,
  loadGeographicBoundaries,
  loadTrailsCrossingBoundary,
  loadTrailsNearBoundary,
  loadTrailsByCounty,
  getSpatialAnalysisSummary,
  togglePOIType,
};

console.log("✅ POI system ready. Use window.poiMap for functions");
