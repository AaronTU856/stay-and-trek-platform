import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Linking, ActivityIndicator, Text, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';

let MapView, Marker, Callout;
if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
  Callout = maps.Callout;
}


// Use Mac's local network IP (works for simulator and physical devices)
//const BASE_URL = 'http://192.168.1.83:8000';
const BASE_URL = 'http://172.20.10.2:8000'; // Update this to your local IP address and port

const FETCH_TIMEOUT = 10000; //10 seconds

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

  const [trails, setTrails] = useState([]);
  const [stays, setStays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStays, setShowStays] = useState(true);
  const [nearbyStays, setNearbyStays] = useState([]); // Results from Trail click
  const [globalStays, setGlobalStays] = useState([]); // Results from Global Toggle
  const [showGlobalLayer, setShowGlobalLayer] = useState(false);

  // Using a state for region so it can be updated if needed
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
      return { color: '#FF5A5F', icon: '🏠' }; // Airbnb brand red
    case 'booking':
      return { color: '#003580', icon: '🏢' }; // Booking brand blue
    case 'tivago':
      return { color: '#007FAD', icon: '🔍' }; // Trivago teal
    default:
      return { color: '#2E7D32', icon: '🛏️' }; // Local/Manual green
  }
};

  

  useEffect(() => {
    loadData();
  }, []);

  // Logic for the Toggle
  const toggleGlobalStays = async () => {
      // 1. Calculate the target state first
      const nextState = !showGlobalLayer;
      
      // 2. Update the UI immediately so the toggle moves
      setShowGlobalLayer(nextState);

      // 3. If turning ON and we have no data, fetch it
      if (nextState && globalStays.length === 0) {
        const targetUrl = `${BASE_URL}/api/trails/accommodations/geojson/`;
        console.log("Fetching from:", targetUrl);

        try {
          const res = await fetchWithTimeout(targetUrl);
          if (res.ok) {
            const data = await res.json();
            setGlobalStays(data.features || []);
          } else {
            console.error("Server error:", res.status);
            // Optional: If server fails, flip toggle back off
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
        // Simple fetch using the new trail-specific endpoint we built
        const res = await fetchWithTimeout(`${BASE_URL}/api/trails/accommodations/near-trail/?trail_id=${trailId}`);
        if (res.ok) {
            const data = await res.json();
            // We update the 'stays' state with the new results
            setStays(data.features);
            setShowStays(true); // Show the stays layer on the map 
        }
    } catch (err) {
        console.error("Error fetching nearby stays:", err);
    }
};

  const onTrailPress = (trailId) => {
    fetchStaysForTrail(trailId);
    navigation.navigate('trail-details', { id: trailId });
  };

  const loadData = async () => {
    try {
      const trailsRes = await fetchWithTimeout(`${BASE_URL}/api/trails/`);
      if (trailsRes.ok) {
        const trailsData = await trailsRes.json();
        setTrails(Array.isArray(trailsData) ? trailsData : (trailsData.results || []));
      } else {
        console.error(`Trails API error: ${trailsRes.status}`);
        setTrails([]);
      }

      const staysRes = await fetchWithTimeout(
        `${BASE_URL}/api/trails/accommodations/nearby/?lat=53.5&lng=-7.7&radius=50`
      );
      if (staysRes.ok) {
        const staysData = await staysRes.json();
        const features = staysData.features || (Array.isArray(staysData) ? staysData : []);
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
        style={styles.map} 
        initialRegion={region}
      >


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
              onPress={() => onTrailPress(trail.id)} // Calls the helper function above
            >

              <Callout onPress={() =>  navigation.navigate('trail-details', { id: trail.id })}>

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
              >
                <Callout>
                  <View style={{ padding: 5, minWidth: 120 }}>
                    <Text style={{ fontWeight: "bold" }}>{String(props.name) || "Accommodation"}</Text>
                    <Text>{props.distance_km ? `${String(props.distance_km)}km away` : "Nearby"}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  toggleContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(66, 248, 242, 0.9)',
    borderRadius: 10,
    padding: 10,
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
    color: '#333',
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
  btnOff: { backgroundColor: '#ee1414' }, // Grey
});

