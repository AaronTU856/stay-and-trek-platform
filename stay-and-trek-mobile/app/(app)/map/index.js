import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Linking, ActivityIndicator, Text, Platform, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../_layout';
import { API_BASE_URL } from '../../../config/apiConfig';

let MapView, Marker, Callout, Polyline;
if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
  Callout = maps.Callout;
  Polyline = maps.Polyline;
}

const FETCH_TIMEOUT = 10000; //10 seconds
const GLOBAL_STAYS_RADIUS_KM = 250;

const fetchWithTimeout = (url, timeout = FETCH_TIMEOUT) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  return fetch(url, { signal: controller.signal })
    .then(res => {
      clearTimeout(timeoutId);
      return res;
    })
    .catch(err => {
      clearTimeout(timeoutId);
      throw err;
    });
};



export default function MapScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { userToken } = useAuth();
  const mapRef = useRef(null);
  
  const [trails, setTrails] = useState([]);
  const [stays, setStays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStays, setShowStays] = useState(true);
  const [globalStays, setGlobalStays] = useState([]);
  const [showGlobalLayer, setShowGlobalLayer] = useState(false);
  const [selectedTrail, setSelectedTrail] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeSummary, setRouteSummary] = useState('');

  const [region] = useState({
    latitude: 53.5,
    longitude: -7.7,
    latitudeDelta: 2.0,
    longitudeDelta: 2.0,
  });

  const handleOpenURL = (url) => {
    if (url) {
      Linking.openURL(url).catch((err) => console.error("Couldn't load page", err));
    } else {
      alert("No website available for this stay.");
    }
  };

  const getMarkerContent = (source) => {
    switch (source?.toLowerCase()) {
      case 'airbnb':
        return { color: '#FF5A5F', icon: '🏠' };
      case 'booking':
        return { color: '#003580', icon: '🏢' };
      case 'tivago':
        return { color: '#007FAD', icon: '🔍' };
      default:
        return { color: '#2E7D32', icon: '🛏️' };
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const buildRouteCoordinates = (data) => {
    const features = Array.isArray(data?.features) ? data.features : [];

    return features.flatMap((feature) => {
      const geometry = feature?.geometry;

      if (!geometry) {
        return [];
      }

      if (geometry.type === 'LineString') {
        return geometry.coordinates.map(([lng, lat]) => ({
          latitude: Number(lat),
          longitude: Number(lng),
        }));
      }

      if (geometry.type === 'MultiLineString') {
        return geometry.coordinates.flatMap((segment) =>
          segment.map(([lng, lat]) => ({
            latitude: Number(lat),
            longitude: Number(lng),
          }))
        );
      }

      return [];
    }).filter((point) => !Number.isNaN(point.latitude) && !Number.isNaN(point.longitude));
  };

  const loadRoute = useCallback(async (trailLat, trailLng, accLat, accLng) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/trails/route/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trail_lat: trailLat,
          trail_lng: trailLng,
          acc_lat: accLat,
          acc_lng: accLng,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || `HTTP ${response.status}`);
      }

      const coordinates = buildRouteCoordinates(data);
      if (coordinates.length > 1) {
        setRouteCoordinates(coordinates);
        if (typeof data.route_distance_km === 'number') {
          setRouteSummary(`Route distance: ${data.route_distance_km} km`);
        } else if (data.status === 'fallback') {
          setRouteSummary('Approximate route shown on map');
        } else {
          setRouteSummary('Route shown on map');
        }
      }
    } catch (error) {
      console.error('Route load failed:', error);
      setRouteCoordinates([]);
      setRouteSummary('Unable to load route');
    }
  }, []);

  useEffect(() => {
    const trailLat = Number(params.trailLat);
    const trailLng = Number(params.trailLng);
    const accLat = Number(params.accLat);
    const accLng = Number(params.accLng);

    if (![trailLat, trailLng].some((value) => Number.isNaN(value))) {
      setSelectedTrail({
        latitude: trailLat,
        longitude: trailLng,
        name: typeof params.trailName === 'string' ? params.trailName : 'Selected trail',
      });
    }

    if ([trailLat, trailLng, accLat, accLng].some((value) => Number.isNaN(value))) {
      return;
    }

    loadRoute(trailLat, trailLng, accLat, accLng);
  }, [params.trailLat, params.trailLng, params.accLat, params.accLng, params.trailName, loadRoute]);

  useEffect(() => {
    if (routeCoordinates.length > 1 && mapRef.current?.fitToCoordinates) {
      mapRef.current.fitToCoordinates(routeCoordinates, {
        edgePadding: { top: 80, right: 60, bottom: 140, left: 60 },
        animated: true,
      });
    }
  }, [routeCoordinates]);

  const toggleGlobalStays = async () => {
    const nextState = !showGlobalLayer;
    setShowGlobalLayer(nextState);

    if (nextState && globalStays.length === 0) {
      const targetUrl =
        `${API_BASE_URL}/api/trails/accommodations/geojson/` +
        `?lat=${region.latitude}&lng=${region.longitude}&radius=${GLOBAL_STAYS_RADIUS_KM}`;
      console.log("Fetching from:", targetUrl);

      try {
        const res = await fetchWithTimeout(targetUrl);
        if (res.ok) {
          const data = await res.json();
          setGlobalStays(data.features || []);
        } else {
          const errorText = await res.text();
          console.error("Server error:", res.status, errorText);
          setShowGlobalLayer(false);
        }
      } catch (err) {
        console.error("Network Error:", err);
        setShowGlobalLayer(false);
      }
    }
  };

  const fetchStaysForTrail = async (trailId) => {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/api/trails/accommodations/near-trail/?trail_id=${trailId}`);
      if (res.ok) {
        const data = await res.json();
        let features = [];
        
        // Handle different API response formats
        if (data.features) {
          features = data.features;
        } else if (Array.isArray(data)) {
          features = data;
        }
        
        console.log(`Loaded ${features.length} accommodations for trail ${trailId}`);
        setStays(features);
        setShowStays(true);
      }
    } catch (err) {
      console.error("Error fetching nearby stays:", err);
    }
  };

  const handleAccommodationPress = (accLat, accLng, label) => {
    if (!selectedTrail) {
      setRouteSummary('Select a trail marker first');
      return;
    }

    loadRoute(selectedTrail.latitude, selectedTrail.longitude, accLat, accLng);
    setRouteSummary(`Loading route to ${label || 'selected accommodation'}...`);
  };

  const onTrailPress = (trail) => {
    fetchStaysForTrail(trail.id);
    setSelectedTrail({
      id: trail.id,
      name: trail.trail_name,
      latitude: parseFloat(trail.latitude),
      longitude: parseFloat(trail.longitude),
    });
    setRouteCoordinates([]);
    setRouteSummary(`Trail selected: ${trail.trail_name}. Tap an accommodation marker to draw a route.`);
  };

  const loadData = async () => {
    try {
      const trailsRes = await fetchWithTimeout(`${API_BASE_URL}/api/trails/`);
      if (trailsRes.ok) {
        const trailsData = await trailsRes.json();
        setTrails(Array.isArray(trailsData) ? trailsData : (trailsData.results || []));
      } else {
        console.error(`Trails API error: ${trailsRes.status}`);
        setTrails([]);
      }

      const staysRes = await fetchWithTimeout(
        `${API_BASE_URL}/api/trails/accommodations/nearby/?lat=53.5&lng=-7.7&radius=50`
      );
      if (staysRes.ok) {
        const staysData = await staysRes.json();
        let features = [];
        
        // Handle different API response formats
        if (staysData.results && staysData.results.features) {
          features = staysData.results.features;
        } else if (staysData.features) {
          features = staysData.features;
        } else if (Array.isArray(staysData.results)) {
          features = staysData.results;
        } else if (Array.isArray(staysData)) {
          features = staysData;
        }
        
        console.log(`Loaded ${features.length} nearby accommodations`);
        setStays(features);

      } else {
        console.error("Accommodations API error: " + staysRes.status);
        setStays([]);
      }
    } catch (err) {
      console.error("Map Load Error:", err);
      
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Single MapView with Clustering */}
      <MapView 
        ref={mapRef}
        style={styles.map} 
        initialRegion={region}
      >
      {Platform.OS !== 'web' && routeCoordinates.length > 1 ? (
        <Polyline
          coordinates={routeCoordinates}
          strokeColor="#F97316"
          strokeWidth={5}
        />
      ) : null}


      {/* Trails Markers - Green */}
        {Array.isArray(trails) && trails
          .filter((trail) => {
            const lat = parseFloat(trail.latitude);
            const lng = parseFloat(trail.longitude);
            return !isNaN(lat) && !isNaN(lng);
          })
          .map((trail) => {
            const lat = parseFloat(trail.latitude);
            const lng = parseFloat(trail.longitude);
            return (
            <Marker
              key={`trail-${trail.id}`}
              coordinate={{ latitude: lat, longitude: lng }}
              pinColor="green"
              onPress={() => onTrailPress(trail)}
            >

              <Callout onPress={() => navigation.navigate('trails', { screen: '[id]', params: { id: trail.id } })}>

                <View style={{ padding: 5, minWidth: 120 }}>
                    <Text style={{ fontWeight: 'bold' }}>{trail.trail_name}</Text>
                    <Text>{String(trail.difficulty)}</Text>
                  </View>
                </Callout>
              </Marker>
            );
          })}
          
      {/* 2. Global Stays Layer (Blue) - Only shows if Toggle is ON */}
      {showGlobalLayer && globalStays.map((item) => {
        if (!item.geometry || !item.geometry.coordinates) return null;
        const [lng, lat] = item.geometry.coordinates;
        const { name, price, rating, url, source } = item.properties;
        const design = getMarkerContent(source);
        if (isNaN(lat) || isNaN(lng)) return null;
        
       
        return (
          <Marker
            key={`global-stay-${item.properties.id}`}
            coordinate={{
              latitude: lat,
              longitude: lng
            }}
            onPress={() => handleAccommodationPress(lat, lng, name)}
            >
            {/* Custom Marker View */}
      <View style={[styles.customPin, { backgroundColor: design.color }]}>
        <Text style={{ fontSize: 14 }}>{design.icon}</Text>
      </View>

      <Callout tooltip onPress={() => handleOpenURL(url)}>
        <View style={styles.calloutCard}>
          <Text style={styles.calloutTitle}>{name}</Text>
          <Text style={styles.calloutPrice}>€{price} via {source}</Text>
          <Text style={styles.ratingText}>⭐ {String(rating || 'No rating')}</Text>
          <Text style={styles.bookButton}>View Listing ➔</Text>
        </View>
      </Callout>
    </Marker>
  );
})}

        

      {/* Accommodation Marker - Blue */}
        {showStays && Array.isArray(stays) && stays.map((item) => {
          const lng = item.geometry ? item.geometry.coordinates[0] : parseFloat(item.longitude);
          const lat = item.geometry ? item.geometry.coordinates[1] : parseFloat(item.latitude);
          const props = item.properties || item; // Fallback to item if not GeoJSON

          if (isNaN(lat) || isNaN(lng)) return null;

          return (
              <Marker
                key={`stay-${props.id || Math.random()}`}
                coordinate={{ latitude: lat, longitude: lng }}
                pinColor="blue"
                onPress={() => handleAccommodationPress(lat, lng, props.name)}
              >
                <Callout tooltip onPress={() => props.url && handleOpenURL(props.url)}>
                  <View style={styles.calloutCard}>
                    <Text style={styles.calloutTitle}>{props.name || "Accommodation"}</Text>
                    <Text style={styles.calloutPrice}>€{props.price || "Contact"} {props.source ? `via ${props.source}` : ""}</Text>
                    <Text style={styles.ratingText}>⭐ {String(props.rating || 'No rating')}</Text>
                    <Text style={styles.bookButton}>{props.distance_km ? `${String(props.distance_km)}km away` : "View Details"} ➔</Text>
                  </View>
                </Callout>
              </Marker>
            );
          })}

 {/* Floating Toggle Button - Inside MapView */}
        <View style={styles.toggleContainer}>
          <View style={styles.buttonWrapper}>
            <Text style={styles.toggleText}>Accommodations</Text>
            <Text 
              style={[styles.toggleButton, showGlobalLayer ? styles.btnOn : styles.btnOff]}
              onPress={toggleGlobalStays}
            >
              {showGlobalLayer ? "ON" : "OFF"}
            </Text>
          </View>
        </View>
      </MapView>

      {!userToken && (
        <TouchableOpacity 
          style={styles.floatingLoginBtn} 
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.btnText}>Log In for More Features</Text>
        </TouchableOpacity>
      )}

      {routeSummary ? (
        <View style={styles.routeSummaryCard}>
          <Text style={styles.routeSummaryText}>{routeSummary}</Text>
          <TouchableOpacity onPress={() => {
            setRouteCoordinates([]);
            setRouteSummary('');
          }}>
            <Text style={styles.clearRouteText}>Clear route</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  toggleContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#087d97',
    padding: 8,
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
  },
  calloutBubble: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    width: 160,
    borderColor: '#2E7D32',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  calloutName: {
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 4,
    color: '#333',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  calloutPrice: {
    color: '#2E7D32',
    fontWeight: 'bold',
    fontSize: 16,
  },
  perNight: {
    fontSize: 10,
    color: '#666',
  },
  ratingText: {
    fontSize: 11,
    color: '#444',
  },
  moreInfo: {
    fontSize: 11,
    color: '#007AFF',
    marginTop: 5,
    textAlign: 'center',
    fontStyle: 'italic',
    fontWeight: 'Bold',
  },
  buttonWrapper: {
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#fdfbfb',
  },
  toggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
    color: '#eae9ef',
    fontWeight: 'bold',
    textAlign: 'center',
    overflow: 'hidden',
  },
  linkContainer: {
    marginTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#ddd',
    paddingTop: 5,
  },
  customPin: {
    padding: 5,
    borderRadius: 20, // Makes it a circle
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    width: 35,
    height: 35,
  },
  calloutCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    width: 180,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  bookButton: {
    marginTop: 8,
    color: '#007AFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
 
  btnOn: { backgroundColor: '#2E7D32' }, // Green
  btnOff: { backgroundColor: '#ca7f22' }, // Grey

  floatingLoginBtn: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#087d97',
    flexDirection: 'row',
    padding: 20,
    borderRadius: 15,
    zIndex: 10,
    alignItems: 'center',
    },
    btnText: { color: '#fff', fontWeight: 'bold' },
  routeSummaryCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  routeSummaryText: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  clearRouteText: {
    color: '#1565C0',
    fontSize: 13,
    fontWeight: '600',
  },


});
