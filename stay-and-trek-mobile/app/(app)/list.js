import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function List() {
  const router = useRouter();
  const { trailId, trailName, difficulty, distanceKm } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Trip</Text>
      <Text style={styles.subtitle}>
        Summary of the trail planning around.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Selected Trail</Text>
        <Text style={styles.mainValue}>{trailName || "No trail selected yet"}</Text>

        {trailId ? (
          <>
            <Text style={styles.metaText}>Distance: {distanceKm || "N/A"} km</Text>
            <Text style={styles.metaText}>Difficulty: {difficulty || "N/A"}</Text>
          </>
        ) : (
          <Text style={styles.metaText}>Open a trail and use Plan Trip to add it here.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Next Steps</Text>
        <Text style={styles.metaText}>Browse nearby stays, check the weather, or return to the trail details.</Text>
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  mainValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
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
