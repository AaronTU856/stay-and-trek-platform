import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, DEFAULT_ENVIRONMENT, logApiConfig } from '../config/apiConfig';

// Shared API helpers for the mobile app.
const DEFAULT_TIMEOUT = 60000; // 60 seconds for slow backend responses

// Log the resolved backend when the app starts.
logApiConfig(DEFAULT_ENVIRONMENT);

export async function login(username, password) {
  return apiCall('/api/token/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function refreshToken(refresh) {
  return apiCall('/api/token/refresh/', {
    method: 'POST',
    body: JSON.stringify({ refresh }),
  });
}

export async function register(username, email, password) {
  return apiCall('/api/trails/register/', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
}

// Adds the saved token when available and keeps request errors consistent.
async function apiCall(endpoint, options = {}){
  const url = `${API_BASE_URL}${endpoint}`;

  // Pull the saved token from secure storage before the request is sent.
  const token = await SecureStore.getItemAsync('userToken');

  const defaultHeaders = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',

  // Attach the token only when the user is signed in.
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };

  console.log(`📡 Making API call to: ${url}`);
  console.log(`   Method: ${options.method || 'GET'}`);

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
      
      console.log(`✅ API response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ HTTP Error ${response.status}:`, errorText);
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const jsonData = await response.json();
      console.log(`📦 Received ${Array.isArray(jsonData) ? jsonData.length : jsonData.results?.length || 1} items`);
      return jsonData;
  } catch (error) {
      console.error('❌ API call failed:', {
          url,
          error: error.message,
          stack: error.stack
      });
      throw error;    
  }
}

// Trails

export async function getTrails(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const endpoint = `/api/trails/?${queryString}`;
  return apiCall(endpoint);
}

export async function getTrailById(id) {
  return apiCall(`/api/trails/${id}/`);
}

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

export async function getTrailsGeoJSON() {
  return apiCall('/api/trails/geojson/');
}

// Accommodation

export async function getAccommodations(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/api/trails/accommodations/?${queryString}`;
    return apiCall(endpoint);
}

export async function getAccommodationsNearTrail(trailId) {
  return apiCall(`/api/trails/accommodations/near-trail/?trail_id=${trailId}`);
}

export async function getAccommodationsGeoJSON(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const suffix = queryString ? `?${queryString}` : '';
  return apiCall(`/api/trails/accommodations/geojson/${suffix}`);
}

// Weather

export async function getTrailWeather(trailId) {
  return apiCall(`/api/trails/weather/${trailId}/`);
}

export async function getTownWeather(arg1, arg2) {
  let lat;
  let lng;

  if (typeof arg1 === 'object' && arg1 !== null) {
    lat = arg1.lat;
    lng = arg1.lng;
  } else if (arg1 !== undefined && arg2 !== undefined) {
    lat = arg1;
    lng = arg2;
  }

  if (lat === undefined || lng === undefined) {
    throw new Error('getTownWeather requires latitude and longitude');
  }

  return apiCall(`/api/trails/weather-town/?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
}

// Towns

export async function getTowns(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const endpoint = `/api/trails/towns/geojson/?${queryString}`;
  return apiCall(endpoint);
}

export async function getNearestTown(lat, lng) {
  return apiCall('/api/trails/nearest-town/', {
    method: 'POST',
    body: JSON.stringify({ latitude: lat, longitude: lng }),
  });
}

// Points of interest

export async function getPOIs(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const endpoint = `/api/trails/pois/?${queryString}`;
  return apiCall(endpoint);
}

export async function getPOIsByType(poiType) {
  return apiCall(`/api/trails/pois/type/${poiType}/`);
}

export async function getPOIsNearTrail(trailId) {
  return apiCall(`/api/trails/pois/near-trail/?trail_id=${trailId}`);
}

export async function getPOIsInRadius(lat, lng, radiusKm) {
  return apiCall('/api/trails/pois/radius-search/', {
    method: 'POST',
    body: JSON.stringify({ latitude: lat, longitude: lng, radius_km: radiusKm }),
  });
}

// Geographic boundaries

export async function getBoundaries(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const endpoint = `/api/trails/boundaries/?${queryString}`;
  return apiCall(endpoint);
}

export async function getTrailsCrossingBoundary(boundaryId) {
  return apiCall(`/api/trails/boundaries/${boundaryId}/trails-crossing/`);
}

export async function getSpatialAnalysisSummary() {
  return apiCall('/api/trails/spatial-analysis/summary/');
}

export { API_BASE_URL };
