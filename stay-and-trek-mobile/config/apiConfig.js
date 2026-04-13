import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Resolves the backend base URL for simulators, devices, and production builds.
// Default LAN fallback if Expo cannot infer the host automatically.
// You can override this with EXPO_PUBLIC_API_BASE_URL or EXPO_PUBLIC_API_HOST.
const FALLBACK_LOCAL_HOST = '127.0.0.1';
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
  const resolvedHost = explicitHost || getExpoHost() || FALLBACK_LOCAL_HOST;

  return `http://${resolvedHost}:${API_PORT}`;
}

const LAN_BASE_URL = getLanBaseUrl();

const API_CONFIGS = {
  // Local development through Docker.
  docker: {
    simulator: LAN_BASE_URL,
    device: LAN_BASE_URL,
    androidEmulator: 'http://10.0.2.2:8000',
  },
  
  // Local development with Django's built-in server.
  runserver: {
    simulator: LAN_BASE_URL,
    device: LAN_BASE_URL,
    androidEmulator: 'http://10.0.2.2:8000',
  },
  
  // Deployed API.
  production: {
    all: process.env.EXPO_PUBLIC_PRODUCTION_API_URL?.trim() || 'https://example.run.app',
  },
};

// Chooses the correct API host for the current environment and device type.
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

// Prints the resolved API target during development.
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
