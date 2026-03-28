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
import { Platform } from 'react-native';

// Default LAN fallback if Expo cannot infer the host automatically.
// You can override this with EXPO_PUBLIC_API_BASE_URL or EXPO_PUBLIC_API_HOST.
const FALLBACK_MAC_LOCAL_IP = '192.168.1.83';
const API_PORT = '8000';

function stripPort(hostValue) {
  if (!hostValue || typeof hostValue !== 'string') {
    return null;
  }

  return hostValue.split(':')[0];
}

function getExpoHost() {
  const hostCandidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.debuggerHost,
    Constants.manifest2?.extra?.expoClient?.hostUri,
  ];

  for (const candidate of hostCandidates) {
    const host = stripPort(candidate);
    if (host) {
      return host;
    }
  }

  return null;
}

function getLanBaseUrl() {
  const explicitBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/$/, '');
  }

  const explicitHost = process.env.EXPO_PUBLIC_API_HOST?.trim();
  const resolvedHost = explicitHost || getExpoHost() || FALLBACK_MAC_LOCAL_IP;

  return `http://${resolvedHost}:${API_PORT}`;
}

const LAN_BASE_URL = getLanBaseUrl();

const API_CONFIGS = {
  // Development with Docker running
  docker: {
    simulator: LAN_BASE_URL,
    device: LAN_BASE_URL,
    androidEmulator: 'http://10.0.2.2:8000',
  },
  
  // Development with Python runserver (deprecated)
  runserver: {
    simulator: LAN_BASE_URL,
    device: LAN_BASE_URL,
    androidEmulator: 'http://10.0.2.2:8000',
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
  
  const isDevice = Constants.isDevice;
  const isAndroid = Platform.OS === 'android';

  if (isAndroid && !isDevice) {
    return config.androidEmulator;
  }

  return isDevice ? config.device : config.simulator;
}

export const DEFAULT_ENVIRONMENT = 'docker';
export const API_BASE_URL = getApiBaseUrl(DEFAULT_ENVIRONMENT);

/**
 * Debugging helper - log current configuration
 */
export function logApiConfig(environment = 'docker') {
  const url = getApiBaseUrl(environment);
  
  console.log('=== API Configuration ===');
  console.log(`Environment: ${environment}`);
  console.log(`Is Device: ${Constants.isDevice}`);
  console.log(`Platform: ${Platform.OS}`);
  console.log(`Expo Host: ${getExpoHost() || 'unavailable'}`);
  console.log(`API Base URL: ${url}`);
  console.log(`============================`);
  
  return url;
}

export default getApiBaseUrl;
