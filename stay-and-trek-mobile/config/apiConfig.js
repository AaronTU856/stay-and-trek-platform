/**
 * API Configuration Helper
 * 
 * This file helps manage API endpoints across different environments.
 * 
 * IMPORTANT: iOS Simulator cannot reach localhost:8000
 * ───────────────────────────────────────────────────────
 * The iOS Simulator runs in a virtualized network environment that 
 * cannot access the host machine's loopback interface (localhost).
 * 
 * SOLUTION: Use your Mac's actual IP address for all environments
 * 
 * When Docker is running:
 * - iOS Simulator: Use your Mac's IP (e.g., http://192.168.1.83:8000)
 * - Android Emulator: Use 10.0.2.2:8000 (special Android alias)
 * - Physical Device: Use your Mac's IP address
 * 
 * To find your Mac's IP:
 *   ifconfig | grep "inet " | grep -v 127.0.0.1
 * 
 * Or use this command in Terminal:
 *   ipconfig getifaddr en0  (for WiFi)
 *   ipconfig getifaddr en1  (for Ethernet)
 */

import Constants from 'expo-constants';

// Get your Mac's IP address by running:
// ifconfig | grep "inet " | grep -v 127.0.0.1
const MAC_LOCAL_IP = '192.168.1.83';  // ← CHANGE THIS TO YOUR MAC'S IP

const API_CONFIGS = {
  // Development with Docker running
  docker: {
    simulator: `http://${MAC_LOCAL_IP}:8000`,  // iOS Simulator needs Mac IP, not localhost
    device: `http://${MAC_LOCAL_IP}:8000`,
    android: 'http://10.0.2.2:8000',
  },
  
  // Development with Python runserver (deprecated)
  runserver: {
    simulator: `http://${MAC_LOCAL_IP}:8000`,  // iOS Simulator needs Mac IP, not localhost
    device: `http://${MAC_LOCAL_IP}:8000`,
    android: 'http://10.0.2.2:8000',
  },
  
  // Production (Cloud Run)
  production: {
    all: 'https://stay-and-trek-service-xxx.a.run.app',
  },
};

/**
 * Get the correct API base URL based on environment
 * @param {string} environment - 'docker', 'runserver', or 'production'
 * @returns {string} API base URL
 */
export function getApiBaseUrl(environment = 'docker') {
  const config = API_CONFIGS[environment];
  
  if (!config) {
    console.warn(`Unknown environment: ${environment}, using docker`);
    return API_CONFIGS.docker.simulator;
  }
  
  if (environment === 'production') {
    return config.all;
  }
  
  // Detect platform
  const isDevice = Constants.isDevice;
  
  // Check if running on Android
  const isAndroid = Constants.platform?.android;
  
  if (isAndroid && isDevice) {
    return config.android;  // Android emulator
  } else if (!isDevice) {
    return config.simulator;  // iOS simulator
  } else {
    return config.device;  // Physical device
  }
}

/**
 * Debugging helper - log current configuration
 */
export function logApiConfig(environment = 'docker') {
  const url = getApiBaseUrl(environment);
  
  console.log('=== API Configuration ===');
  console.log(`Environment: ${environment}`);
  console.log(`Is Device: ${Constants.isDevice}`);
  console.log(`Is Android: ${Constants.platform?.android}`);
  console.log(`API Base URL: ${url}`);
  console.log(`============================`);
  
  return url;
}

export default getApiBaseUrl;
