// Trail details screen - displays detailed information about a selected hiking trail
// Shows information like difficulty, distance, description, and weather conditions

import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useAccessibility } from "../context/AccessibilityContext";
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';

// Use Docker backend for local demo
// const API_BASE_URL = __DEV__ 
//   ? 'http://localhost:8000'
//   : 'https://stay-and-trek-service-642845720185.europe-west1.run.app';
const API_BASE_URL = 'http://192.168.1.83:8000';



export default function TrailDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { largeText } = useAccessibility();
  const [trail, setTrail] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const titleFontSize = largeText ? 28 : 24;
  const headingFontSize = largeText ? 18 : 16;
  const textFontSize = largeText ? 16 : 14;

  const [accommodation, setAccommodation] = useState();

  useEffect(() => {
      // Fetch nearby accommodations when trail data is loaded
    if (!trail?.latitude || !trail?.longitude) return;

      fetch(
        `${API_BASE_URL}/api/trails/accommodations/nearby/?lat=${trail.latitude}&lng=${trail.longitude}&radius=20`

      )
        .then(res => res.json())
        .then(data => setAccommodation(data.results || data))
       .catch((err) => {
          console.warn('Failed to fetch accommodation:', err.message);
          setAccommodation([]);
        });
    }, [trail]);

  useEffect(() => {

    

    const fetchTrailDetails = async () => {
      try {
        setLoading(true);
        console.log(`Fetching trail details for ID: ${id}`);
        
        const response = await fetch(`${API_BASE_URL}/api/trails/${id}/`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          console.warn(`API returned ${response.status}, using fallback data`);
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Successfully fetched trail:', data.trail_name);
        setTrail(data);

      } catch (err) {
        console.warn('Failed to fetch trail details:', err.message);
       
      } finally {
        setLoading(false);
      }
    };

    

    fetchTrailDetails();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  if (!trail) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Trail not found</Text>
      </View>
    );
  }

 
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back to trails"
        >
          <Text style={{ fontSize: headingFontSize, color: '#2E7D32' }}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { fontSize: titleFontSize }]}>{trail.trail_name}</Text>
      </View>

      {/* Quick stats section */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={{ fontSize: textFontSize, fontWeight: '600', color: '#333' }}>Distance</Text>
          <Text style={{ fontSize: textFontSize - 1, color: '#666' }}>{trail.distance_km}km</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={{ fontSize: textFontSize, fontWeight: '600', color: '#333' }}>Difficulty</Text>
          <Text style={{ fontSize: textFontSize - 1, color: '#666' }}>{trail.difficulty}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={{ fontSize: textFontSize, fontWeight: '600', color: '#333' }}>Duration</Text>
          <Text style={{ fontSize: textFontSize - 1, color: '#666' }}>{trail.duration || 'N/A'}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={{ fontSize: textFontSize, fontWeight: '600', color: '#333' }}>Elevation</Text>
          <Text style={{ fontSize: textFontSize - 1, color: '#666' }}>{trail.elevation_gain_m}m</Text>
        </View>
      </View>

      {/* Description section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { fontSize: headingFontSize }]}>About this Trail</Text>
        <Text style={[styles.description, { fontSize: textFontSize }]}>{trail.description || 'No description available'}</Text>
      </View>

      {/* Accommodation section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { fontSize: headingFontSize }]}>Nearby Accommodation</Text>

      {!accommodation ? (
        <Text style={{ color: '#666' }}>Loading accommodation…</Text>
      ) : accommodation.length === 0 ? (
        <Text style={{ color: '#666' }}>No nearby accommodation found.</Text>
      ) : (

        accommodation.map(place => (
          <TouchableOpacity
            key={place.id}
            style={styles.accommodationCard}
            onPress={() =>
              router.push({
                pathname: '/stay-details',
                params: { id: place.id }
              })
            }
          >
            <Text style={{ fontWeight: '600' }}>{place.name}</Text>
            <Text style={{ color: '#666' }}>
              €{place.price_per_night} per night
            </Text>
            <Text style={{ color: '#1565C0', marginTop: 4 }}>
              View details →
            </Text>
          </TouchableOpacity>
        ))
      )}


      </View>

      {/* Highlights section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { fontSize: headingFontSize }]}>Trail Highlights</Text>
        {trail.highlights && trail.highlights.length > 0 ? (
          trail.highlights.map((highlight, idx) => (
            <View key={idx} style={styles.highlightItem}>
              <Text style={{ fontSize: textFontSize - 1, color: '#2E7D32', fontWeight: '600', marginRight: 8 }}>✓</Text>
              <Text style={[styles.highlightText, { fontSize: textFontSize }]}>{highlight}</Text>
            </View>
          ))
        ) : (
          <Text style={{ fontSize: textFontSize, color: '#666' }}>No highlights available</Text>
        )}
      </View>

      {/* Action buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={styles.saveButton}
          accessibilityRole="button"
          accessibilityLabel="Save trail to favorites"
        >
          <Text style={styles.buttonText}>❤️ Save Trail</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.shareButton}
          accessibilityRole="button"
          accessibilityLabel="Share trail information"
        >
          <Text style={styles.buttonText}>📤 Share</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Styles for trail details screen
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  // Header section with back button and title
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  // Back button styling
  backButton: {
    marginBottom: 8,
    paddingVertical: 6,
  },
  // Trail title in header
  title: {
    fontWeight: '700',
    color: '#333',
  },
  // Stats grid showing key trail information
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  // Individual stat box
  statBox: {
    width: '48%',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  // Section styling for content blocks
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 16,
    borderRadius: 8,
  },
  // Section title styling
  sectionTitle: {
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  // Description text styling
  description: {
    color: '#666',
    lineHeight: 22,
  },
  // Difficulty information box
  difficultyBox: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  // Individual highlight item
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  // Highlight text styling
  highlightText: {
    color: '#555',
    flex: 1,
  },
  // Action buttons container
  actionContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  // Save button styling
  saveButton: {
    flex: 1,
    backgroundColor: '#2E7D32',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  // Share button styling
  shareButton: {
    flex: 1,
    backgroundColor: '#1565C0',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  // Button text color
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  // Accommodation card styling
  accommodationCard: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    
  },

});
