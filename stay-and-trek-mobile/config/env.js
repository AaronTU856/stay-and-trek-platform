// Centeralise all environment variables for easy access and management

export const CONFIG = {
   // API Settings
   API: {
    TIMEOUT: 10000, // in milliseconds
    RETRY_COUNT: 3,
   },

   // App Info
    APP: {
    NAME: 'Stay & Trek',
    VERSION: '1.0.0',
   },

   // Map Settings - when need adding maps
    MAP: {
        DEFAULT_LAT: 53.3498,
        DEFAULT_LON: -6.2603,
        DEFAULT_ZOOM: 7,
        MIN_ZOOM: 3,
        MAX_ZOOM: 18,
    },

    // Trails Default
    TRAILS: {
        PAGE_SIZE: 20,
        RADIUS_KM: 25, // Default search radius
    },

    // UI Defaults
    UI: {
        HEADER_HEIGHT: 60,
        TAB_HEIGHT: 60,
    }
};
