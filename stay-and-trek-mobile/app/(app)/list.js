import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAccessibility } from "../../context/AccessibilityContext";

// Shows the saved trail summary and quick planning shortcuts.
export default function List() {
  const router = useRouter();
  const { trailId, trailName, difficulty, distanceKm } = useLocalSearchParams();
  const { largeText, darkMode, toggleLargeText, toggleDarkMode } = useAccessibility();
  const titleSize = largeText ? 32 : 28;
  const cardTitleSize = largeText ? 18 : 16;
  const mainValueSize = largeText ? 20 : 18;
  const bodySize = largeText ? 16 : 14;

  return (
    <View style={[styles.container, darkMode && styles.containerDark]}>
      <Text style={[styles.title, { fontSize: titleSize }, darkMode && styles.titleDark]}>My Trip</Text>
      <Text style={[styles.subtitle, { fontSize: bodySize }, darkMode && styles.subtitleDark]}>
        Summary of the trail planning around.
      </Text>
    
      <View style={[styles.card, darkMode && styles.cardDark]}>
        <Text style={[styles.cardTitle, { fontSize: cardTitleSize }, darkMode && styles.cardTitleDark]}>Accessibility</Text>
        <TouchableOpacity style={styles.toggleRow} onPress={toggleLargeText}>
          <Text style={[styles.metaText, { fontSize: bodySize }, darkMode && styles.metaTextDark]}>Large text</Text>
          <Text style={[styles.toggleValue, darkMode && styles.toggleValueDark]}>{largeText ? "On" : "Off"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toggleRow} onPress={toggleDarkMode}>
          <Text style={[styles.metaText, { fontSize: bodySize }, darkMode && styles.metaTextDark]}>Dark mode</Text>
          <Text style={[styles.toggleValue, darkMode && styles.toggleValueDark]}>{darkMode ? "On" : "Off"}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, darkMode && styles.cardDark]}>
        <Text style={[styles.cardTitle, { fontSize: cardTitleSize }, darkMode && styles.cardTitleDark]}>Selected Trail</Text>
        <Text style={[styles.mainValue, { fontSize: mainValueSize }, darkMode && styles.mainValueDark]}>{trailName || "No trail selected yet"}</Text>

        {trailId ? (
          <>
            <Text style={[styles.metaText, { fontSize: bodySize }, darkMode && styles.metaTextDark]}>Distance: {distanceKm || "N/A"} km</Text>
            <Text style={[styles.metaText, { fontSize: bodySize }, darkMode && styles.metaTextDark]}>Difficulty: {difficulty || "N/A"}</Text>
          </>
        ) : (
          <Text style={[styles.metaText, { fontSize: bodySize }, darkMode && styles.metaTextDark]}>Open a trail and use Plan Trip to add it here.</Text>
        )}
      </View>

      <View style={[styles.card, darkMode && styles.cardDark]}>
        <Text style={[styles.cardTitle, { fontSize: cardTitleSize }, darkMode && styles.cardTitleDark]}>Next Steps</Text>
        <Text style={[styles.metaText, { fontSize: bodySize }, darkMode && styles.metaTextDark]}>Browse nearby stays, check the weather, or return to the trail details.</Text>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/trails')}>
        <Text style={styles.primaryButtonText}>Browse Trails</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/stay')}>
        <Text style={styles.secondaryButtonText}>Browse Stays</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/weather')}>
        <Text style={styles.secondaryButtonText}>Open Weather</Text>
      </TouchableOpacity>

      {trailId ? (
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.push({ pathname: '/trails/[id]', params: { id: trailId } })}
        >
          <Text style={styles.linkButtonText}>Back to Trail Details</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 8,
  },
  titleDark: {
    color: '#86efac',
  },
  subtitle: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 20,
  },
  subtitleDark: {
    color: '#d1d5db',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cardDark: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  cardTitleDark: {
    color: '#f9fafb',
  },
  mainValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  mainValueDark: {
    color: '#f9fafb',
  },
  metaText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  metaTextDark: {
    color: '#d1d5db',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleValue: {
    color: '#2E7D32',
    fontWeight: '700',
    fontSize: 14,
  },
  toggleValueDark: {
    color: '#86efac',
  },
  primaryButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  secondaryButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 15,
  },
  linkButton: {
    marginTop: 14,
    alignItems: 'center',
  },
  linkButtonText: {
    color: '#1565C0',
    fontWeight: '600',
    fontSize: 14,
  },
});
