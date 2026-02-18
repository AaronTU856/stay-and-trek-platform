// API service for all backend communications
// Handles configuration, error handling, request and response setup

// API Base URL - use local network IP for both simulator and physical devices
// const MAC_IP = '192.168.1.83'; // Mac's actual local network IP (run `ifconfig` to verify)
const MAC_IP = '192.168.1.83'; // Update this to your local IP address
const API_BASE_URL = `http://${MAC_IP}:8000`; // Always use local IP for development

const DEFAULT_TIMEOUT = 60000; // 60 seconds for slow backend responses

console.log('API Client initialized with base URL:', API_BASE_URL);

/** 
 * Generic fetch wrapper with error handling
 * @param {string} endpoint - API endpoint (path after base URL - '/api/trails/')
 * @param {object} options - Fetch options (method, headers, body)
 * @param {Promise} timeout response data or error 
*/

async function apiCall(endpoint, options = {}){
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultHeaders = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
  };

  console.log(`Making API call to: ${url}`);

  try {
      const response = await Promise.race([
          fetch(url, {
              ...options,
              headers: {
                  ...defaultHeaders,
                  ...options.headers,
              },
          }),
          new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Request timed out after 60 seconds')), DEFAULT_TIMEOUT)
          ),
      ]);
      
      console.log(`API response status: ${response.status}`);
      
      if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
  } catch (error) {
      console.error('API call error:', error);
      throw error;    
  }
}

  // Trails

  /**
 * Fetch all trails with optional filters
 * @param {object} params - Query parameters (limit, offset, difficulty, county, etc.)
 */
export async function getTrails(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const endpoint = `/api/trails/?${queryString}`;
  return apiCall(endpoint);
}

/**
 * Fetch single trail by ID
 */
export async function getTrailById(id) {
  return apiCall(`/api/trails/${id}/`);
}

/**
 * Search trails within a radius
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radiusKm - Radius in kilometers
 */
export async function getTrailsWithinRadius(lat, lng, radiusKm) {
  return apiCall('/api/trails/within-radius/', {
    method: 'POST',
    body: JSON.stringify({
      latitude: lat,
      longitude: lng,
      radius_km: radiusKm,
    }),
  });
}

/**
 * Get all trails as GeoJSON (for map)
 */
export async function getTrailsGeoJSON() {
  return apiCall('/api/trails/geojson/');
}

// Accommodation

/**
 * Fetch all accommodations
 */

export async function getAccommodations(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/api/accommodations/?${queryString}`;
    return apiCall(endpoint);
}

/**
 * Fetch accommodations near a trail
 */
export async function getAccommodationsNearTrail(trailId) {
  return apiCall(`/api/accommodations-near-trail/?trail_id=${trailId}`);
}

/**
 * Get accommodations as GeoJSON (for map)
 */
export async function getAccommodationsGeoJSON() {
  return apiCall('/api/accommodations/geojson/');
}

// Weather

/**
 * Get weather for a specific trail by ID
 */
export async function getTrailWeather(trailId) {
  return apiCall(`/api/trails/weather/${trailId}/`);
}

/**
 * Get weather for a town/location
 */
export async function getTownWeather(townName) {
  return apiCall(`/api/trails/weather-town/?location=${encodeURIComponent(townName)}`);
}

// Towns

/**
 * Get all towns
 */
export async function getTowns(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const endpoint = `/api/towns/?${queryString}`;
  return apiCall(endpoint);
}

/**
 * Get nearest town to coordinates
 */
export async function getNearestTown(lat, lng) {
  return apiCall('/api/nearest-town/', {
    method: 'POST',
    body: JSON.stringify({ latitude: lat, longitude: lng }),
  });
}

// POI (Points of Interest)

/**
 * Fetch points of interest (cafes, parking, attractions, etc.)
 */
export async function getPOIs(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const endpoint = `/api/pois/?${queryString}`;
  return apiCall(endpoint);
}

/**
 * Get POIs by type (e.g., 'parking', 'cafe', 'attraction')
 */
export async function getPOIsByType(poiType) {
  return apiCall(`/api/pois/type/${poiType}/`);
}

/**
 * Get POIs near a trail
 */
export async function getPOIsNearTrail(trailId) {
  return apiCall(`/api/pois/near-trail/?trail_id=${trailId}`);
}

/**
 * Get POIs within a radius
 */
export async function getPOIsInRadius(lat, lng, radiusKm) {
  return apiCall('/api/pois/radius-search/', {
    method: 'POST',
    body: JSON.stringify({ latitude: lat, longitude: lng, radius_km: radiusKm }),
  });
}

// Geographic Boundaries (Rivers, etc.)

/**
 * Get all geographic boundaries
 */
export async function getBoundaries(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const endpoint = `/api/boundaries/?${queryString}`;
  return apiCall(endpoint);
}

/**
 * Get trails crossing a specific boundary
 */
export async function getTrailsCrossingBoundary(boundaryId) {
  return apiCall(`/api/boundaries/${boundaryId}/trails-crossing/`);
}

/**
 * Get spatial analysis summary
 */
export async function getSpatialAnalysisSummary() {
  return apiCall('/api/spatial-analysis/summary/');
}

export { API_BASE_URL };




