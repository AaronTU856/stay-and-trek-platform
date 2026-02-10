import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_DEFAULT } from 'react-native-maps';

import { CONFIG } from '../config/env.js';

fetch(`${CONFIG.API.BASE_URL}/api/trails/?limit=100`);


const API_URL = 'http://192.168.1.83:8000/api/trails/accommodations/nearby/?lat=53.5&lng=-7.7&radius=50';

export default function MapScreen() {
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
    fetchStays();
  }, []);

  const fetchStays = async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      setStays(data.results || data);
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
        {stays.map((item) => {
          // CRITICAL FIX: Parse and Validate
          const lat = parseFloat(item.latitude);
          const lng = parseFloat(item.longitude);

          // If coordinates are missing or invalid, skip this marker
          if (isNaN(lat) || isNaN(lng)) {
            console.warn(`Skipping marker ${item.id} due to invalid coordinates`);
            return null;
          }

          return (
            <Marker
              key={item.id.toString()} // Ensure key is a string
              coordinate={{ latitude: lat, longitude: lng }}
              pinColor="blue"
            >
              <Callout>
                <View style={{ padding: 5, minWidth: 100 }}>
                  <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
                  <Text>€{item.price_per_night}/night</Text>
                  <Text style={{ fontSize: 10, color: '#666' }}>{item.accommodation_source}</Text>
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