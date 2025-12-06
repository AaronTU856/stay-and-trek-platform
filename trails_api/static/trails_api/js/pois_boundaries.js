/**
 * POI and Geographic Boundary Map Visualization
 * Adds Points of Interest (parking, cafes, attractions) and boundaries to the Leaflet map
 */

console.log("✅ pois_boundaries.js loaded");

/**
 * Retrieves a cookie value by name from the document's cookies
 * @param {string} name - The name of the cookie to retrieve
 * @returns {string|null} The cookie value or null if not found
 */
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
 * @param {Object} poi - Point of Interest object containing location and type information
 * @param {number} poi.latitude - The latitude coordinate of the POI
 * @param {number} poi.longitude - The longitude coordinate of the POI
 * @param {string} poi.name - The name of the POI
 * @param {string} poi.poi_type - The type of POI (parking, cafe, attraction, etc.)
 * @param {string} [poi.county] - Optional county information
 * @param {string} [poi.description] - Optional description of the POI
 * @param {string} [poi.phone] - Optional phone number
 * @param {string} [poi.website] - Optional website URL
 * @param {string} [poi.opening_hours] - Optional opening hours
 * @returns {L.Marker} The created Leaflet marker object
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
 * @param {number} trailId - The ID of the trail to search around
 * @param {string|null} [poiType=null] - Optional filter to show only a specific POI type
 */
function loadPOIsNearTrail(trailId, poiType = null) {
  console.log(`📍 Loading POIs near trail ${trailId}...`);
  // Clear existing POI markers and reload
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
 * Load POIs within a specified radius from a given point
 * @param {number} lat - The latitude coordinate for the search center
 * @param {number} lng - The longitude coordinate for the search center
 * @param {number} [radiusKm=5] - The search radius in kilometers
 * @param {string|null} [poiType=null] - Optional filter to show only a specific POI type
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
    .then((response) => response.json()) // Parse JSON response
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
  // Rivers are loaded separately via loadRivers() - skip duplicate call
}

/**
 * Load all rivers from the geographic boundaries API and render them on the map
 * Fetches paginated river data and displays as polylines with interactive popups
 */
function loadRivers() {
  console.log("🌊 Loading rivers from API (nationwide coverage)...");
  console.log("Map object check:", window.trailsMap ? "✅ EXISTS" : "❌ MISSING");

  if (!window.trailsMap) {
    console.error("❌ Map object (window.trailsMap) not initialized!");
    return;
  }
  // Store all rivers fetched
  let allRivers = [];
  let nextUrl = "/api/trails/boundaries/?boundary_type=river&limit=500";  // Larger page size for faster loading
  let pageCount = 0;
  const maxPages = 6; // Load ~3000 rivers (6 pages of 500 each)
  function addRiverToMap(feature) {
    try {
      const coords = feature.geometry.coordinates;
      const latlngs = coords.map(c => [c[1], c[0]]);
      const polyline = L.polyline(latlngs, { color: '#1e90ff', weight: 3, opacity: 0.8 }).addTo(window.trailsMap);
      
      // Extract boundary id and name
      const boundaryId = feature.properties && (feature.properties.id || feature.properties.pk || feature.id);
      const name = feature.properties && (feature.properties.name || feature.properties.Name || 'River');
      
      console.log(`Adding river: ${name} (ID: ${boundaryId})`);
      
      if (boundaryId) {
        // Create popup as actual DOM element
        const popupDiv = document.createElement('div');
        popupDiv.style.fontFamily = 'Arial, sans-serif';
        popupDiv.style.padding = '10px';
        popupDiv.style.minWidth = '240px';
        
        // Title 
        const titleDiv = document.createElement('strong');
        titleDiv.textContent = name;
        titleDiv.style.fontSize = '14px';
        titleDiv.style.display = 'block';
        titleDiv.style.marginBottom = '10px';
        popupDiv.appendChild(titleDiv);
        
        // Button 1: Crossing trails
        const btn1 = document.createElement('button');
        btn1.textContent = 'Show trails crossing';
        btn1.style.width = '100%';
        btn1.style.padding = '8px';
        btn1.style.marginBottom = '6px';
        btn1.style.background = '#4CAF50';
        btn1.style.color = 'white';
        btn1.style.border = 'none';
        btn1.style.borderRadius = '4px';
        btn1.style.cursor = 'pointer';
        btn1.style.fontSize = '12px';
        btn1.onclick = (e) => {
          e.stopPropagation();
          console.log('Button 1 clicked, boundaryId:', boundaryId);
          if (window.poiMap && typeof window.poiMap.loadTrailsCrossingBoundary === 'function') {
            console.log('Calling loadTrailsCrossingBoundary');
            window.poiMap.loadTrailsCrossingBoundary(boundaryId);
          } else {
            console.warn('Function not available');
          }
        };
        popupDiv.appendChild(btn1);
        
        // Button 2: Nearby trails
        const btn2 = document.createElement('button');
        btn2.textContent = 'Show nearby trails (5km)';
        btn2.style.width = '100%';
        btn2.style.padding = '8px';
        btn2.style.background = '#2196F3';
        btn2.style.color = 'white';
        btn2.style.border = 'none';
        btn2.style.borderRadius = '4px';
        btn2.style.cursor = 'pointer';
        btn2.style.fontSize = '12px';
        btn2.onclick = (e) => {
          e.stopPropagation();
          console.log('Button 2 clicked, boundaryId:', boundaryId);
          if (window.poiMap && typeof window.poiMap.loadTrailsNearBoundary === 'function') {
            console.log('Calling loadTrailsNearBoundary');
            window.poiMap.loadTrailsNearBoundary(boundaryId, 5000);
          } else {
            console.warn('Function not available');
          }
        };
        popupDiv.appendChild(btn2);
        
        polyline.bindPopup(popupDiv, { maxWidth: 280, maxHeight: 200 });
      }
    } catch (e) {
      console.error('Failed to render river polyline', e);
    }
  }
  // Recursive function to fetch pages
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
  // Render all rivers in batches for performance
  function renderAllRivers(rivers) {
    console.log(`🎨 Rendering ${rivers.length} rivers on map (batch mode)...`);
    console.log("Map check before rendering:", window.trailsMap ? "✅ EXISTS" : "❌ MISSING");
    
    // Create a layer group for rivers if it doesn't exist
    if (!window.trailsMap._riversLayer) {
      window.trailsMap._riversLayer = L.layerGroup().addTo(window.trailsMap);
      console.log("✅ Created rivers layer group");
    }
    
    let renderedCount = 0;
    let skippedCount = 0;
    const batchSize = 200; // Render in batches of 200 for faster performance
    let batchIndex = 0;
    let firstRiverCoords = null;

     // Function to render a single batch
    function renderBatch() {
      if (!window.trailsMap._riversLayer) {
    window.trailsMap._riversLayer = L.featureGroup();
    window.trailsMap._riversLayer.addTo(window.trailsMap);
  }
      const start = batchIndex * batchSize;
      const end = Math.min(start + batchSize, rivers.length);
      
      for (let i = start; i < end; i++) {
        const river = rivers[i];
        try {
          if (!river.geom || river.geom.type !== "LineString") { // Skip non-LineString geometries
            skippedCount++;
            continue;
          }

          const coords = river.geom.coordinates; // GeoJSON format: [lon, lat]
          // Convert to Leaflet format [lat, lon]
          const latlngs = coords.map(c => [c[1], c[0]]);
          
          if (latlngs.length < 2) {
            console.warn(`⚠️ River ${river.name} has ${latlngs.length} coordinates`);
            skippedCount++;
            continue;
          }

          // Store first river's coords for debugging
          if (renderedCount === 0 && !firstRiverCoords) {
            firstRiverCoords = latlngs.slice(0, 3);
            console.log(`📍 First river: ${river.name}`);
            console.log(`   Raw API coords (first 3): ${JSON.stringify(coords.slice(0, 3))}`);
            console.log(`   Converted latlngs (first 3): ${JSON.stringify(latlngs.slice(0, 3))}`);
          }

          // Use addRiverToMap to get popup with buttons
          const polyline = L.polyline(latlngs, {
            color: "#1e90ff",
            weight: 3,
            opacity: 0.8,
          });
        if(river.name && coords.length > 0) {
          const [startLng, startLat] = coords[0];
          const startMarker = L.circleMarker([startLat, startLng], {
            radius: 5,
            fillColor: "#4A90E2",
            color:"#fff",
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.8,
          });
         
          // Build feature object that matches what addRiverToMap expects
          const feature = {
            properties: {
              id: river.id || river.pk,
              name: river.name
            },
            geometry: {
              coordinates: latlngs
            }
          };
          
          // Extract and create popup manually here
          const boundaryId = river.id || river.pk;
          const name = river.name;
          
          const popupDiv = document.createElement('div');
          popupDiv.style.fontFamily = 'Arial, sans-serif';
          popupDiv.style.padding = '10px';
          popupDiv.style.minWidth = '240px';
          
          const titleDiv = document.createElement('strong');
          titleDiv.textContent = name;
          titleDiv.style.fontSize = '14px';
          titleDiv.style.display = 'block';
          titleDiv.style.marginBottom = '10px';
          popupDiv.appendChild(titleDiv);
          
            // Button 1: Crossing trails
          const btn1 = document.createElement('button');
          btn1.textContent = 'Show trails crossing';
          btn1.style.width = '100%';
          btn1.style.padding = '8px';
          btn1.style.marginBottom = '6px';
          btn1.style.background = '#4CAF50';
          btn1.style.color = 'white';
          btn1.style.border = 'none';
          btn1.style.borderRadius = '4px';
          btn1.style.cursor = 'pointer';
          btn1.style.fontSize = '12px';
          btn1.onclick = (e) => {
            console.log('Button 1 clicked, boundaryId:', boundaryId);
            console.log('window.poiMap exists:', !!window.poiMap);
            console.log('window.poiMap:', window.poiMap);
            if (window.poiMap && typeof window.poiMap.loadTrailsCrossingBoundary === 'function') {
              console.log('Calling loadTrailsCrossingBoundary');
              window.poiMap.loadTrailsCrossingBoundary(boundaryId, name);
            } else {
              console.warn('Function not available');
            }
          };
          popupDiv.appendChild(btn1);
          // Button 2: Nearby trails
          const btn2 = document.createElement('button');
          btn2.textContent = 'Show nearby trails (5km)';
          btn2.style.width = '100%';
          btn2.style.padding = '8px';
          btn2.style.background = '#2196F3';
          btn2.style.color = 'white';
          btn2.style.border = 'none';
          btn2.style.borderRadius = '4px';
          btn2.style.cursor = 'pointer';
          btn2.style.fontSize = '12px';
          btn2.onclick = (e) => {
            console.log('Button 2 clicked, boundaryId:', boundaryId);  // Nearby trails
            console.log('window.poiMap exists:', !!window.poiMap);
            if (window.poiMap && typeof window.poiMap.loadTrailsNearBoundary === 'function') {
              console.log('Calling loadTrailsNearBoundary');
              window.poiMap.loadTrailsNearBoundary(boundaryId, 5000);
            } else {
              console.warn('Function not available');
            }
          };
          popupDiv.appendChild(btn2);

      
          

          // Bind popup to polyline
          polyline.bindPopup(popupDiv, { maxWidth: 280, maxHeight: 200 });
          polyline.addTo(window.trailsMap._riversLayer);
          startMarker.bindPopup(popupDiv, { maxWidth: 280, maxHeight: 200 });
          startMarker.addTo(window.trailsMap._riversLayer);
          renderedCount++;
        }
          // Log first polyline details
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
    
      // Log batch completion
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
 * Load trails that start near a boundary (river)
 * @param {number} boundaryId - The ID of the geographic boundary (river)
 * @param {number} [radiusMeters=200] - The search radius in meters from the boundary
 * Displays nearby trail markers on the map with popups showing trail details
 */
function loadTrailsNearBoundary(boundaryId, radiusMeters = 200) {
  if (!window.trailsMap) return;
  const url = `/api/trails/boundaries/${boundaryId}/trails-near/?radius_m=${radiusMeters}`;
  console.log(`🛤️🔍 Fetching trails within ${radiusMeters}m of boundary ${boundaryId} ...`);
  fetch(url)
    .then((r) => r.json())
    .then((data) => {
      console.log(`📥 Raw API response:`, data);
      const trails = Array.isArray(data) ? data : data.results || [];
      console.log(`✅ ${trails.length} trails near boundary`);
      console.log(`Trail data sample:`, trails.length > 0 ? trails[0] : 'no trails');
      
      if (trails.length === 0) {
        console.log('No trails near this boundary');
        alert('No trails found within 5km of this river.');
        return;
      }
      
      // Clear existing nearby trails layer
      if (!window.nearestTrailsLayer) {
        window.nearestTrailsLayer = L.layerGroup().addTo(window.trailsMap);
      }
      window.nearestTrailsLayer.clearLayers();
      
      let displayedCount = 0;
      trails.forEach((t, index) => {
        // Get coordinates from start_point (GeoJSON) or latitude/longitude
        let lat, lng;
        
        if (t.start_point && t.start_point.coordinates) {
          // GeoJSON format: [lng, lat]
          [lng, lat] = t.start_point.coordinates;
          console.log(`Trail ${index}: Using start_point [${lng}, ${lat}]`);
        } else if (t.latitude !== undefined && t.longitude !== undefined) {
          lat = t.latitude;
          lng = t.longitude;
          console.log(`Trail ${index}: Using lat/lng [${lat}, ${lng}]`);
        } else {
          console.warn(`Trail ${index}: No valid coordinates`, t);
          return; // Skip if no coordinates
        }
        // Prepare trail info
        const trailName = t.trail_name || t.name || 'Trail';
        const county = t.county || 'Unknown';
        // Create circle marker
        const marker = L.circleMarker([lat, lng], {
          radius: 8,
          color: '#FF9F1C',
          fillColor: '#FFCC00',
          fillOpacity: 0.9,
          weight: 3,
        }).bindPopup(`<b>${trailName}</b><br/>📍 ${county}`);
        
        marker.addTo(window.nearestTrailsLayer);
        displayedCount++;
        
        if (displayedCount === 1) {
          console.log(`✅ First nearby trail marker added at [${lat}, ${lng}]`);
        }
      });
      console.log(`✅ Displayed ${displayedCount} nearby trail markers`);
      
      // // Ensure layer is on top
      // if (window.trailsMap._nearbyTrailsLayer) {
      //   window.trailsMap._nearbyTrailsLayer.bringToFront();
      // }
    })
    .catch((e) => console.error('Error loading trails near boundary:', e));
}

/**
 * Load and display all trails for a specific county
 * @param {string} countyName - The name of the county to load trails for
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
/**
 * Get and display summary statistics for spatial analysis
 * @returns {Object} Summary data including counts of trails, rivers, and POIs loaded
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
 * Toggle the visibility of a specific POI type on the map
 * @param {string} poiType - The POI type to toggle (parking, cafe, attraction, etc.)
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
 * Create a control panel for filtering and displaying different POI types
 * Generates checkboxes for each POI category and attaches them to the map sidebar
 * @returns {L.Control} The control object added to the Leaflet map
 */
function createPOIControlPanel() {
  // Check if sidebar exists, if so populate it instead
  const poiCheckboxesDiv = document.getElementById("poi-checkboxes");
  
  if (poiCheckboxesDiv) {
    // Populate sidebar version
    const checkboxHTML = Object.entries(POI_TYPES)
      .map(
        ([key, value]) => `
      <label style="display: flex; align-items: center; margin: 6px 0; cursor: pointer;">
        <input type="checkbox" data-poi-type="${key}" checked 
          style="margin-right: 6px; cursor: pointer;">
        <span style="color: ${value.color}; font-weight: bold;">${value.icon}</span>
        <span style="margin-left: 6px; font-size: 12px;">${value.label}</span>
      </label>
    `
      )
      .join("");
    
    poiCheckboxesDiv.innerHTML = checkboxHTML;
    
    // Add event listeners for checkboxes
    document.querySelectorAll('#poi-checkboxes input[data-poi-type]').forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        togglePOIType(e.target.dataset.poiType);
      });
    });
  } else {
    // Fallback: create as floating control on map (old style)
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
            // Create a container div for the control
    const controlDiv = document.createElement("div");
    controlDiv.innerHTML = controlHTML;
    controlDiv.style.position = "absolute";
    controlDiv.style.top = "100px";
    controlDiv.style.right = "12px";
    controlDiv.style.zIndex = "1000";

    document.querySelector("#map-container").appendChild(controlDiv);

    // Add event listeners for fallback version
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

  // Add event listeners to sidebar buttons if they exist
  const loadPoiBtn = document.getElementById("load-all-pois-btn");
  const analysisBtn = document.getElementById("analysis-btn");
  
  if (loadPoiBtn) {
    loadPoiBtn.addEventListener("click", () => {
      loadAllPOIs();
    });
  }
  
  if (analysisBtn) {
    analysisBtn.addEventListener("click", () => {
      getSpatialAnalysisSummary();
    });
  }
}

/**
 * Load and display trails that cross through a specific boundary (river)
 * Retrieves GeoJSON trail geometries and renders them as lines on the map
 * @param {number} boundaryId - The ID of the geographic boundary (river)
 * @param {string} boundaryName - The name of the boundary for display in alerts and popups
 */
function loadTrailsCrossingBoundary(boundaryId, boundaryName) {
  if (!window.trailsMap) {
    console.warn("Map not ready");
    return;
  }
  if (!boundaryId) {
    console.warn("No boundaryId provided to loadTrailsCrossingBoundary");
    return;
  }
  const url = `/api/trails/boundaries/${boundaryId}/trails-crossing/geojson/`; // GeoJSON endpoint 
  console.log(`🛤️ Fetching trails crossing boundary ${boundaryId} ...`);
  fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data) => {
      // Handle GeoJSON FeatureCollection
      const features = data.features || data;
      console.log(`✅ Received ${features.length} crossing trail(s)`);
      
      // Clear existing crossing trails layer
      if (features.length === 0) {
        console.log('No crossing trails found for this boundary');
        alert(`No trails crossing "${boundaryName || 'this river'}" found.`);
        return;
      }
      
      console.log(`Creating GeoJSON layer with ${features.length} features...`);
      
      try {
        const layer = L.geoJSON(features, {
          style: {
            color: '#FF0000',  // Bright red
            weight: 6,
            opacity: 1.0,
            lineCap: 'round',
            lineJoin: 'round',
          },
          onEachFeature: (feature, layer) => {
            const props = feature.properties || {};
            const name = props.trail_name || props.name || 'Trail';
            layer.bindPopup(`<b>${name}</b>`);
          },
        });
        
        // Add to crossing trails layer
        if (!window.trailsMap._crossingTrailsLayer) {
          window.trailsMap._crossingTrailsLayer = L.layerGroup().addTo(window.trailsMap);
        }
        // Clear existing crossing trails
        layer.addTo(window.trailsMap._crossingTrailsLayer);
        console.log(`✅ Displayed ${features.length} crossing trail(s) on map`);
      } catch (e) {
        console.error(`❌ Error displaying crossing trails:`, e);
      }
    })
    .catch((err) => {
      console.error('❌ Error loading crossing trails:', err);
      console.error('Error stack:', err.stack);
    });
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
