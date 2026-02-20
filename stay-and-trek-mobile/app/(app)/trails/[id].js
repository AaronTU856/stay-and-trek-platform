// Trail details screen - displays detailed information about a selected hiking trail
// Shows information like difficulty, distance, description, and weather conditions

import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput } from "react-native";
import { useAccessibility } from "../../../context/AccessibilityContext";
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { getTrailById } from '../../../services/apiClient';

// const API_BASE_URL = 'http://172.20.10.2:8000';
const API_BASE_URL = 'http://192.168.1.83:8000';


export default function TrailDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { largeText } = useAccessibility();

  const [trail, setTrail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accommodation, setAccommodation] = useState([]);
  
  const titleFontSize = largeText ? 28 : 24;
  const headingFontSize = largeText ? 18 : 16;
  const textFontSize = largeText ? 16 : 14;

  

  const [newDesc, setNewDesc] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContribution = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/trails/${id}/suggest_description/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: newDesc }),
        });
        if (response.ok) {
            setSubmitted(true);
            setNewDesc(''); // Clear input after successful submission
        }
    } catch (error) {
        console.error("Submission failed", error);
    }
  };

  useEffect(() => {
      // Fetch nearby accommodations when trail data is loaded
    if (!id) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    // Optimized endpoint
    fetch(
      `${API_BASE_URL}/api/accommodations-near-trail/?trail_id=${id}`,
      { signal: controller.signal }
    )
      .then(res => {
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        return res.json();
      })
      .then(data => {
        // GeoJSON FeatureCollection:
        if (data && data.features) {
          // Map GeoJSON features to a flat list for existing card UI
          const places = data.features.map(f => ({
            id: f.properties.id,
            name: f.properties.name,
            price_per_night: f.properties.price_per_night,
            source: f.properties.source
          }));
          
          // Sorting logic
          places.sort((a, b) => (a.price_per_night || 0) - (b.price_per_night || 0));
          setAccommodation(places);
        } else {
          setAccommodation([]);
        }
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        if (err.name !== 'AbortError') {
          console.warn('Failed to fetch linked accommodation:', err.message);
        }
        setAccommodation([]);
      });
  }, [id]); // Triggers when the trail ID changes


  useEffect(() => {
    const fetchTrailDetails = async () => {
      try {
        setLoading(true);
        console.log(`Fetching trail details for ID: ${id}`);
        
        const data = await getTrailById(id);
        console.log('Successfully fetched trail:', data.trail_name);
        setTrail(data);

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.warn('Failed to fetch trail details:', errorMsg);
       
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
        
        {trail.description && (trail.status === 'verified' || trail.status === 'scraped') ? (
            <Text style={[styles.description, { fontSize: textFontSize }]}>{trail.description}</Text>
        ) : (trail.status === 'pending' || submitted) ? (
          
            <Text style={{ color: '#2E7D32', fontStyle: 'italic' }}>
                Thank you! Your description has been sent for moderator approval.
            </Text>
        ) : (
            <View>
                <Text style={{ marginBottom: 8, color: '#666' }}>
                    {trail.status === 'rejected' 
                        ? "The previous description was not approved. Please try a more detailed version!" 
                        : "We do not have a description yet. Help the community by adding one!"}
                </Text>
                
                <TextInput
                    style={styles.textInput}
                    placeholder="Describe the terrain, views, or difficulty..."
                    value={newDesc}
                    onChangeText={setNewDesc}
                    multiline
                />
                <TouchableOpacity 
                    style={[styles.saveButton, { backgroundColor: isSubmitting ? '#999' : '#2E7D32' }]} 
                    onPress={handleContribution}
                    disabled={isSubmitting}
                >
                    <Text style={styles.buttonText}>
                        {isSubmitting ? "Sending..." : "Submit to Trail Moderator"}
                    </Text>
                </TouchableOpacity>
            </View>
        )}
    </View>

      {/* Accommodation section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { fontSize: headingFontSize }]}>Nearby Accommodation</Text>

        <Text style={{ color: '#666', marginBottom: 8 }}>
          {accommodation.length ?? 0} places nearby
        </Text>


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
            <Text style={{ fontWeight: '700', fontSize: 15 }}>{place.name}</Text>
            <Text style={{ color: '#666' }}>€{place.price_per_night} per night</Text>
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

  // Text input for user contributions
  textInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 10,
    marginTop: 10,
    color: '#333'
  },

});
