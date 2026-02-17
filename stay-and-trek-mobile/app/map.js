import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_DEFAULT } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';



// Use Mac's local network IP (works for simulator and physical devices)
const BASE_URL = 'http://192.168.1.83:8000';
const FETCH_TIMEOUT = 10000; //10 seconds

export default function MapScreen() {
  const navigation = useNavigation();

  const [trails, setTrails] = useState([]);
  const [stays, setStays] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Using a state for region so it can be updated if needed
  const [region] = useState({
    latitude: 53.5,
    longitude: -7.7,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  });

  

  useEffect(() => {
    loadData();
  }, []);

  const fetchStaysForTrail = async (trailId) => {
    try {
        // Simple fetch using the new trail-specific endpoint we built
        const res = await fetch(`${BASE_URL}/api/accommodations/near-trail/?trail_id=${trailId}`);
        if (res.ok) {
            const data = await res.json();
            // We update the 'stays' state with the new results
            setStays(data.features); 
        }
    } catch (err) {
        console.error("Error fetching nearby stays:", err);
    }
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
        setStays(Array.isArray(staysData) ? staysData : (staysData.results || []));
      } else {
        console.error(`Accommodations API error: ${staysRes.status}`);
        setStays([]);
      }
    } catch (err) {
      console.error("Map Load Error:", err);
      setTrails([]);
      setStays([]);
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
              onPress={() => {
                fetchStaysForTrail(trail.id);

                navigation.navigate('trail-details', { id: trail.id }) // Comment this out if you want to stay on the map and just update stays below
            }}
            >

              <Callout>
                <View style={{ padding: 5, minWidth: 120 }}>
                  <Text style={{ fontWeight: 'bold' }}>{trail.trail_name}</Text>
                  <Text>{trail.difficulty}</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}

      {/* Accommodation Marker - Blue */}
        {Array.isArray(stays) && stays.map((item) => {
          const lat = parseFloat(item.latitude);
          const lng = parseFloat(item.longitude);

          if (isNaN(lat) || isNaN(lng)) return null;

          return (
            <Marker
              key={`stay-${item.id}`}
              coordinate={{ latitude: lat, longitude: lng }}
              pinColor="blue"
              >
              <Callout>
                <View style={{ padding: 5, minWidth: 120 }}>
                  <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
                  <Text>€{item.price_per_night}/night</Text>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

