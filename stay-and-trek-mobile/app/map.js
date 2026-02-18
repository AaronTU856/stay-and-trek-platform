import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_DEFAULT } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';



// Use Mac's local network IP (works for simulator and physical devices)
// const BASE_URL = 'http://192.168.1.83:8000';
const BASE_URL = 'http://10.156.10.119:8000'; // Update this to your local IP address and port

const FETCH_TIMEOUT = 10000; //10 seconds

export default function MapScreen() {
  const navigation = useNavigation();

  const [trails, setTrails] = useState([]);
  const [stays, setStays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStays, setShowStays] = useState(false);
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
          const res = await fetch(targetUrl);
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
        const res = await fetch(`${BASE_URL}/api/trails/accommodations/near-trail/?trail_id=${trailId}`);
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
      const trailsRes = await fetch(`${BASE_URL}/api/trails/`);
      if (trailsRes.ok) {
        const trailsData = await trailsRes.json();
        setTrails(Array.isArray(trailsData) ? trailsData : (trailsData.results || []));
      } else {
        console.error(`Trails API error: ${trailsRes.status}`);
        setTrails([]);
      }

      const staysRes = await fetch(
        `${BASE_URL}/api/trails/accommodations/nearby/?lat=53.5&lng=-7.7&radius=50`
      );
      if (staysRes.ok) {
        const staysData = await staysRes.json();
        const features = staysData.features || (Array.isArray(staysData) ? staysData : []);
        setStays(features);

      } else {
        console.error(`Accommodations API error: ${staysRes.status}`);
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
      <MapView 
        style={styles.map} 
        initialRegion={region}
        provider={PROVIDER_DEFAULT} // Explicitly use default provider
      >
      {/* Floating Toggle Button */}
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

      {/* Trails Markers - Green */}
        {Array.isArray(trails) && trails.map((trail) => {
        
          // Parse and Validate
          const lat = parseFloat(trail.latitude);
          const lng = parseFloat(trail.longitude);

          // If coordinates are missing or invalid, skip this marker
          if (isNaN(lat) || isNaN(lng)) return null;

            
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
                  <Text>{trail.difficulty}</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
          
      {/* 2. Global Stays Layer (Blue) - Only shows if Toggle is ON */}
      {showGlobalLayer && globalStays.map((item) => {
        if (!item.geometry || !item.geometry.coordinates) return null;

        const [lng, lat] = item.geometry.coordinates;

        if (isNaN(lat) || isNaN(lng)) return null;

        return (
          <Marker
            key={`global-stay-${item.properties.id}`}
            coordinate={{
              latitude: lat,
              longitude: lng
            }}
            >
{/* Custom Price Callout (The "Bubble") */}
      <Callout tooltip onPress={() => console.log("Navigate to booking")}>
        <View style={styles.calloutBubble}>
          <Text style={styles.calloutName}>{item.properties.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.calloutPrice}>€{item.properties.price}</Text>
            <Text style={styles.perNight}> /night</Text>
          </View>
          <Text style={styles.ratingText}>⭐ {item.properties.rating}</Text>
          <Text style={styles.moreInfo}>Tap for details</Text>
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
              key={`stay-${props.id || Math.random()}`} // Use props.id for GeoJSON
              coordinate={{ latitude: lat, longitude: lng }}
              pinColor="blue"
              >
              <Callout>
                <View style={{ padding: 5, minWidth: 120 }}>
                  <Text style={{ fontWeight: "bold" }}>{props.name || "Accommodation"}</Text>
                  <Text>{props.distance_km ? `${props.distance_km}km away` : "Nearby"}</Text>
                </View>
              </Callout>
              </Marker>
          );
        })}

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
    fontSize: 10,
    color: '#007AFF',
    marginTop: 5,
    textAlign: 'right',
    fontStyle: 'italic',
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
  btnOn: { backgroundColor: '#2E7D32' }, // Green
  btnOff: { backgroundColor: '#ee1414' }, // Grey
});

