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

  
  const [selectedCategory, setSelectedCategory] = useState('all');
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
    // 1. Ensure we have the trail ID from the URL params
  if (!id) return;

  const controller = new AbortController();
  const categoryParam = selectedCategory ? `&category=${selectedCategory}` : '';
  // 2. Point to the new endpoint we optimized today
  fetch(`${API_BASE_URL}/api/trails/accommodations/near-trail/?trail_id=${id}${categoryParam}`)
    .then(res => {
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      return res.json();
    })
    .then(data => {
      // 3. Convert GeoJSON features into the format your UI expects
      if (data && data.features) {
        const places = data.features.map(f => ({
          id: f.properties.id,
          name: f.properties.name,
          price_per_night: f.properties.price_per_night ? parseFloat(f.properties.price_per_night) : 0,
          source: f.properties.source,
          // Extract coordinates for mapping if you add a map later
          latitude: f.geometry.coordinates[1],
          longitude: f.geometry.coordinates[0]
        }));
        
        // Sort by price as you had before
        places.sort((a, b) => (a.price_per_night || 0) - (b.price_per_night || 0));
        setAccommodation(places);
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        console.warn('Failed to fetch trail-linked accommodation:', err.message);
        setAccommodation([]);
      }
    });

  return () => controller.abort();
}, [id, selectedCategory]); // Dependency is 'id', not 'trail'


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
        
        {trail.description && (
            trail.status?.toLowerCase() === 'verified' || 
            trail.status?.toLowerCase() === 'scraped' || 
            trail.status?.toLowerCase() === 'completed'
        ) ? (
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
        <Text style={[styles.sectionTitle, { fontSize: headingFontSize }]}>Accommodations Along Route</Text>

        <Text style={{ color: '#666', marginBottom: 12 }}>
          {accommodation.length} places found along this trail
        </Text>

        {/* Category Filter Buttons */}
        <View style={styles.filterButtonsRow}>
          <TouchableOpacity 
            onPress={() => setSelectedCategory('hotel')}
            style={[styles.filterButton, selectedCategory === 'hotel' && styles.filterButtonActive]}
          >
            <Text style={[styles.filterButtonText, selectedCategory === 'hotel' && styles.filterButtonTextActive]}>Hotels</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setSelectedCategory('hostel')}
            style={[styles.filterButton, selectedCategory === 'hostel' && styles.filterButtonActive]}
          >
            <Text style={[styles.filterButtonText, selectedCategory === 'hostel' && styles.filterButtonTextActive]}>Hostels</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setSelectedCategory('all')}
            style={[styles.filterButton, selectedCategory === 'all' && styles.filterButtonActive]}
          >
            <Text style={[styles.filterButtonText, selectedCategory === 'all' && styles.filterButtonTextActive]}>All</Text>
          </TouchableOpacity>
        </View>

        {/* Check if the array itself exists first */}
        {!accommodation ? (
          <ActivityIndicator size="small" color="#2E7D32" />
        ) : accommodation.length === 0 ? (
          <Text style={{ color: '#666' }}>No accommodations found along this route yet.</Text>
        ) : (
          accommodation.map(place => (
            <TouchableOpacity
              key={place.id}
              style={styles.accommodationCard}
              onPress={() =>
                router.push({
                  pathname: '/stay', // Updated to match folder structure (app)/stay.js
                  params: { id: place.id }
                })
              }
            >
              <Text style={{ fontWeight: '700', fontSize: 15 }}>{place.name}</Text>
              
              {/* Handle cases where price is 0 or null from OSM */}
              <Text style={{ color: '#666' }}>
                {place.price_per_night && place.price_per_night > 0 
                  ? `€${place.price_per_night} per night` 
                  : 'Contact for pricing'}
              </Text>
              
              <Text style={{ color: '#1565C0', marginTop: 4, fontSize: 12 }}>
                Source: {place.source?.toUpperCase() || 'OSM'} • View details →
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

  // Filter buttons styling
  filterButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f5f5f5',
  },
  filterButtonActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },

});
