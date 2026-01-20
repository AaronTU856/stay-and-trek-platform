// API service for all backend communications
// Handles configuration, error handling, request and response setup



const API_BASE_URL = __DEV__ 
  ? 'http://localhost:8000'  // Local development
  : 'https://stay-and-trek-service-642845720185.europe-west1.run.app';  // Production fallback

  const DEFAULT_TIMEOUT = 10000; // 10 seconds

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
                setTimeout(() => reject(new Error('Request timed out')), DEFAULT_TIMEOUT)
            ),
        ]);
        
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
 * Fetch weather by trail
 */
export async function getWeatherByCoordinates(lat, lng) {
  return apiCall(`/api/weather/?lat=${lat}&lng=${lng}`);
}

/**
 * Get weather for a town
 */
export async function getTownWeather(townName) {
  return apiCall(`/api/weather/?location=${encodeURIComponent(townName)}`);
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

// POI

/**
 * Fetch points of interest
 */
export async function getPointsOfInterest(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const endpoint = `/api/points-of-interest/?${queryString}`;
  return apiCall(endpoint);
}

/**
 * Get POIs near a trail
 */
export async function getPOIsNearTrail(trailId) {
  return apiCall(`/api/pois-near-trail/?trail_id=${trailId}`);
}

export { API_BASE_URL };




