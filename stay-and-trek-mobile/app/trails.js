import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useAccessibility } from "../context/AccessibilityContext";
import IconButton from '../components/IconButton';
import { useLocalSearchParams, useRouter } from 'expo-router';

const TRAILS = [
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

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { fontSize: titleFontSize }]}>Hiking Trails</Text>

      <View style={styles.iconRow}>
        <IconButton name="hiking" iconSet="fontawesome" label="Find Trails" bgColor="#2E7D32" onPress={() => router.push('/trails')} />
        <IconButton name="bed" iconSet="material" label="Find Accommodation" bgColor="#1565C0" onPress={() => router.push('/stay')} />
        <IconButton name="sunny-outline" iconSet="ionicon" label="View Weather" bgColor="#FFA000" onPress={() => router.push('/weather')} />
      </View>

       {/* Trails List */}
      <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 60 }}>
        {TRAILS.map(trail => (
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
              <Text style={{ fontSize: cardFontSize, fontWeight: '600' }}>
                {trail.name}
              </Text>
              <Text style={{ fontSize: cardFontSize - 2, color: '#666' }}>
                {trail.distance} • {trail.difficulty}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

  
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "flex-start", alignItems: "center" },
  title: { fontSize: 24 }
  ,
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
