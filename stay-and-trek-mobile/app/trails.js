import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { useAccessibility } from "../context/AccessibilityContext";
import IconButton from '../components/IconButton';
import { useLocalSearchParams, useRouter } from 'expo-router';

// Sample trails to show if API is not available
const SAMPLE_TRAILS = [
  { id: 1, name: "Croagh Patrick", distance: "7km", difficulty: "Moderate" },
  { id: 2, name: "Mweelrea", distance: "12km", difficulty: "Hard" },
  { id: 3, name: "Nephin", distance: "8km", difficulty: "Moderate" },
  { id: 4, name: "Glendalough", distance: "9km", difficulty: "Easy" },
];

export default function TrailDetails() {
  const { id } = useLocalSearchParams();
  const { largeText } = useAccessibility();
  const titleFontSize = largeText ? 32 : 24;
  const router = useRouter();
  const cardFontSize = largeText ? 18 : 16;
  
  // State to store trails data
  const [trails, setTrails] = useState(SAMPLE_TRAILS);
  
  // State to track if data is still loading
  const [loading, setLoading] = useState(true);

  // Load trails when page opens
  useEffect(() => {
    loadTrailsFromAPI();
  }, []);

  // Fetch trails from Django API
  const loadTrailsFromAPI = async () => {
    try {
      // Send request to get all trails
      const response = await fetch('http://192.168.1.83:8000/api/trails/');
      const data = await response.json();
      
      // Convert API data to format we need
      const apiTrails = (data.results || data).map(trail => ({
        id: trail.id,
        name: trail.trail_name,
        distance: `${trail.distance_km}km`,
        difficulty: trail.difficulty.charAt(0).toUpperCase() + trail.difficulty.slice(1),
        county: trail.county,
        elevation: trail.elevation_gain_m,
      }));
      
      // Use API trails if we got any, otherwise use sample data
      setTrails(apiTrails.length > 0 ? apiTrails : SAMPLE_TRAILS);
    } catch (error) {
      // If API fails, use sample data and log the error
      console.log('API not available, using sample data:', error.message);
      setTrails(SAMPLE_TRAILS);
    } finally {
      // Done loading either way
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { fontSize: titleFontSize }]}>Hiking Trails</Text>

      {/* Navigation buttons at top */}
      <View style={styles.iconRow}>
        <IconButton name="hiking" iconSet="fontawesome" label="Find Trails" bgColor="#2E7D32" onPress={() => router.push('/trails')} />
        <IconButton name="bed" iconSet="material" label="Find Accommodation" bgColor="#1565C0" onPress={() => router.push('/stay')} />
        <IconButton name="sunny-outline" iconSet="ionicon" label="View Weather" bgColor="#FFA000" onPress={() => router.push('/weather')} />
      </View>

      {/* Show loading spinner while fetching data */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={{ marginTop: 12, color: '#666' }}>Loading trails...</Text>
        </View>
      ) : (
        // Show list of trails once loaded
        <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 60 }}>
          {trails.map(trail => (
            <TouchableOpacity
              key={trail.id}
              style={styles.card}
              activeOpacity={0.85}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => router.push({ pathname: '/trail-details', params: { id: trail.id } })}
              accessibilityRole="button"
              accessibilityLabel={`Open details for ${trail.name}`}
            >
              <View>
                {/* Trail name */}
                <Text style={{ fontSize: cardFontSize, fontWeight: '600' }}>
                  {trail.name}
                </Text>
                {/* Distance and difficulty */}
                <Text style={{ fontSize: cardFontSize - 2, color: '#666' }}>
                  {trail.distance} • {trail.difficulty}
                </Text>
                {/* County location */}
                {trail.county && (
                  <Text style={{ fontSize: cardFontSize - 3, color: '#999', marginTop: 4 }}>
                    📍 {trail.county}
                  </Text>
                )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
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
    boxShadow: '0px 3px 6px rgba(0,0,0,0.12)'
  }
});
