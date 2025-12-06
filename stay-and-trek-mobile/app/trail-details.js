// Trail details screen - displays detailed information about a selected hiking trail
// Shows information like difficulty, distance, description, and weather conditions

import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useAccessibility } from "../context/AccessibilityContext";
import { useLocalSearchParams, useRouter } from 'expo-router';

// Sample trail data with detailed information
const TRAILS_DATA = {
  1: {
    name: "Croagh Patrick",
    distance: "7km",
    difficulty: "Moderate",
    elevation: "764m",
    duration: "3-4 hours",
    description: "Croagh Patrick is a pilgrimage site and one of Ireland's most famous mountains. The trail offers stunning views of Clew Bay and is suitable for most fitness levels.",
    highlights: [
      "Panoramic views of Clew Bay",
      "Historic pilgrimage site",
      "Well-maintained paths",
      "Stunning sunsets"
    ],
    difficulty_details: "Moderate - Some steep sections but well-marked paths throughout"
  },
  2: {
    name: "Mweelrea",
    distance: "12km",
    difficulty: "Hard",
    elevation: "819m",
    duration: "5-6 hours",
    description: "Mweelrea is Connacht's highest mountain. This is a challenging hike with exposed ridges and requires good fitness and experience.",
    highlights: [
      "Highest peak in Connacht",
      "Dramatic mountain scenery",
      "Challenging ridge walk",
      "Remote wilderness experience"
    ],
    difficulty_details: "Hard - Exposed ridges, boggy terrain, navigation skills required"
  },
  3: {
    name: "Nephin",
    distance: "8km",
    difficulty: "Moderate",
    elevation: "806m",
    duration: "4-5 hours",
    description: "Nephin is a beautiful mountain in County Mayo offering excellent views across the Nephin Beg Range.",
    highlights: [
      "360-degree mountain views",
      "Relatively quiet mountain",
      "Good trail conditions",
      "Beautiful flora and fauna"
    ],
    difficulty_details: "Moderate - Some boggy sections but generally well-trodden paths"
  },
  4: {
    name: "Glendalough",
    distance: "9km",
    difficulty: "Easy",
    elevation: "725m",
    duration: "3-4 hours",
    description: "Glendalough Valley is a stunning glacial valley with ancient monastic ruins. Perfect for all fitness levels.",
    highlights: [
      "Historic monastic site",
      "Beautiful valley scenery",
      "Clear marked trails",
      "Accessible for families"
    ],
    difficulty_details: "Easy - Well-maintained paths, minimal elevation gain in lower sections"
  }
};

export default function TrailDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { largeText } = useAccessibility();
  
  // Get trail data based on ID - use default if not found
  const trail = TRAILS_DATA[parseInt(id) || 1] || TRAILS_DATA[1];
  
  const titleFontSize = largeText ? 28 : 24;
  const headingFontSize = largeText ? 18 : 16;
  const textFontSize = largeText ? 16 : 14;

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
        <Text style={[styles.title, { fontSize: titleFontSize }]}>{trail?.name || "Trail Details"}</Text>
      </View>

      {/* Quick stats section */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={{ fontSize: textFontSize, fontWeight: '600', color: '#333' }}>Distance</Text>
          <Text style={{ fontSize: textFontSize - 1, color: '#666' }}>{trail.distance}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={{ fontSize: textFontSize, fontWeight: '600', color: '#333' }}>Difficulty</Text>
          <Text style={{ fontSize: textFontSize - 1, color: '#666' }}>{trail.difficulty}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={{ fontSize: textFontSize, fontWeight: '600', color: '#333' }}>Duration</Text>
          <Text style={{ fontSize: textFontSize - 1, color: '#666' }}>{trail.duration}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={{ fontSize: textFontSize, fontWeight: '600', color: '#333' }}>Elevation</Text>
          <Text style={{ fontSize: textFontSize - 1, color: '#666' }}>{trail.elevation}</Text>
        </View>
      </View>

      {/* Description section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { fontSize: headingFontSize }]}>About this Trail</Text>
        <Text style={[styles.description, { fontSize: textFontSize }]}>{trail.description}</Text>
      </View>

      {/* Difficulty details */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { fontSize: headingFontSize }]}>Difficulty Details</Text>
        <View style={styles.difficultyBox}>
          <Text style={[styles.description, { fontSize: textFontSize }]}>{trail.difficulty_details}</Text>
        </View>
      </View>

      {/* Highlights section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { fontSize: headingFontSize }]}>Trail Highlights</Text>
        {trail.highlights.map((highlight, idx) => (
          <View key={idx} style={styles.highlightItem}>
            <Text style={{ fontSize: textFontSize - 1, color: '#2E7D32', fontWeight: '600', marginRight: 8 }}>✓</Text>
            <Text style={[styles.highlightText, { fontSize: textFontSize }]}>{highlight}</Text>
          </View>
        ))}
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
});
