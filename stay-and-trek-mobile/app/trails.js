import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useAccessibility } from "../context/AccessibilityContext";
import IconButton from '../components/IconButton';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';

import { CONFIG } from '../config/env.js';

fetch(`${CONFIG.API.BASE_URL}/api/trails/?limit=100`);


// Use Docker backend for local demo, Cloud Run as fallback
// For Expo on physical device, use your machine's IP (e.g., 192.168.x.x)
// For Expo Web/Simulator, use localhost
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:8000'  // Local development
  : 'https://stay-and-trek-service-642845720185.europe-west1.run.app';  // Production fallback

export default function TrailDetails() {
  const { id } = useLocalSearchParams();
  const { largeText } = useAccessibility();
  const [trails, setTrails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const titleFontSize = largeText ? 32 : 24;
  const router = useRouter();
  const cardFontSize = largeText ? 18 : 16;

  // Fallback mock data
  const mockTrails = [
    { id: 1, trail_name: 'Croagh Patrick', distance_km: 7, difficulty: 'Moderate' },
    { id: 2, trail_name: 'Mweelrea', distance_km: 12, difficulty: 'Hard' },
    { id: 3, trail_name: 'Nephin', distance_km: 8, difficulty: 'Moderate' },
    { id: 4, trail_name: 'Glendalough', distance_km: 9, difficulty: 'Easy' },
  ];

  useEffect(() => {
    const fetchTrails = async () => {
      try {
        setLoading(true);
        console.log(`Fetching from: ${API_BASE_URL}/api/trails/?limit=100`);
        
        const response = await fetch(`${API_BASE_URL}/api/trails/?limit=100`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
        
        console.log(`Response status: ${response.status}`);
        
        if (!response.ok) {
          console.warn(`API returned ${response.status}, using fallback data`);
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Successfully fetched trails:', data.results?.length || data?.length || 0);
        setTrails(data.results || data || []);
        setError(null);
      } catch (err) {
        console.warn('Failed to fetch from API, using mock data:', err.message);
        setError(null); // Don't show error to user, just use fallback
        setTrails(mockTrails);
      } finally {
        setLoading(false);
      }
    };

    fetchTrails();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { fontSize: titleFontSize }]}>Hiking Trails</Text>

      <View style={styles.iconRow}>
        <IconButton name="hiking" iconSet="fontawesome" label="Find Trails" bgColor="#2E7D32" onPress={() => router.push('/trails')} />
        <IconButton name="bed" iconSet="material" label="Find Accommodation" bgColor="#1565C0" onPress={() => router.push('/stay')} />
        <IconButton name="sunny-outline" iconSet="ionicon" label="View Weather" bgColor="#FFA000" onPress={() => router.push('/weather')} />
      </View>

      {/* Trails List */}
      {loading ? (
        <ActivityIndicator size="large" color="#2E7D32" style={{ marginTop: 20 }} />
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 60 }}>
          {trails.map(trail => (
            <TouchableOpacity
              key={trail.id}
              style={styles.card}
              activeOpacity={0.85}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => router.push({ pathname: '/trail-details', params: { id: trail.id } })}
              accessibilityRole="button"
              accessibilityLabel={`Open details for ${trail.trail_name}`}
            >
              <View>
                <Text style={{ fontSize: cardFontSize, fontWeight: '600' }}>
                  {trail.trail_name}
                </Text>
                <Text style={{ fontSize: cardFontSize - 2, color: '#666' }}>
                  {trail.distance_km}km • {trail.difficulty}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "flex-start", alignItems: "center" },
  title: { fontSize: 24 },
  iconRow: { flexDirection: 'row', marginTop: 18, justifyContent: 'center', width: '100%', flexWrap: 'wrap' },
  list: {
      width: "100%",
      paddingHorizontal: 20
    },
    card: {
      backgroundColor: "#cedcceff",
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
      // Web (React Native Web) prefers boxShadow instead of shadow* props
      boxShadow: '0px 3px 6px rgba(0,0,0,0.12)'
    }
  });
