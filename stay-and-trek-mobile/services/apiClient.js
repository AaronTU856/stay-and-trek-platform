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