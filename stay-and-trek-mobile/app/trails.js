import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput } from "react-native";
import { useAccessibility } from "../context/AccessibilityContext";
import IconButton from '../components/IconButton';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { getTrails } from '../services/apiClient';


export default function TrailDetails() {
  const { largeText } = useAccessibility();
  const [trails, setTrails] = useState([]);
  const [loading, setLoading] = useState(true);
  const titleFontSize = largeText ? 32 : 24;
  const router = useRouter();
  const cardFontSize = largeText ? 18 : 16;
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('ALL');
  
  

  useEffect(() => {
    const fetchTrails = async () => {
      try {
        setLoading(true);
        console.log('Fetching trails from API with limit=100');
        
        const data = await getTrails({ limit: 100 });
        console.log('Successfully fetched trails:', data.results?.length || data?.length || 0);
        const trailsArray = Array.isArray(data) ? data : (data.results || []);
        setTrails(trailsArray);
       
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.warn('Failed to fetch trails:', errorMsg);
        setTrails([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTrails();
  }, []);

    const filteredTrails = (trails || []).filter(trail => {
      const matchesSearch =
        trail?.trail_name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());

      const trailDifficulty = trail?.difficulty?.trim().toLowerCase();
      const selectedDifficulty = difficultyFilter.toLowerCase();

      const matchesDifficulty =
        difficultyFilter === 'ALL' ||
        trailDifficulty === selectedDifficulty;

      return matchesSearch && matchesDifficulty;
    });


  return (
    <View style={styles.container}>
      <Text style={[styles.title, { fontSize: titleFontSize }]}>Hiking Trails</Text>

      {/* Navigation buttons at top */}
      <View style={styles.iconRow}>
        <IconButton name="hiking" iconSet="fontawesome" label="Find Trails" bgColor="#2E7D32" onPress={() => router.push('/trails')} />
        <IconButton name="bed" iconSet="material" label="Find Accommodation" bgColor="#1565C0" onPress={() => router.push('/stay')} />
        <IconButton name="sunny-outline" iconSet="ionicon" label="View Weather" bgColor="#FFA000" onPress={() => router.push('/weather')} />
      </View>


      <TextInput
        style={styles.searchInput}
        placeholder="Search trails..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        accessibilityLabel="Search trails"    
      />



      <View style={styles.filterRow}>
      {['ALL', 'Easy', 'Moderate', 'Hard'].map(level => (
        <TouchableOpacity
          key={level}
          style={[
            styles.filterButton,
            difficultyFilter === level && styles.filterButtonActive
          ]}
          onPress={() => setDifficultyFilter(level)}
        >
          <Text
            style={{
              color: difficultyFilter === level ? '#fff' : '#333',
              fontWeight: '600'
            }}
          >
            {level}
          </Text>
        </TouchableOpacity>
      ))}
    </View>


      {/* Trails List */}
      {loading ? (
        <ActivityIndicator size="large" color="#2E7D32" style={{ marginTop: 20 }} />
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 60 }}>
          {filteredTrails.length === 0 ? (
            <Text style={{ marginTop: 20, color: '#666', textAlign: 'center' }}>
              No trails match your search.
            </Text>
          ) : (
            filteredTrails.map(trail => (
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
                    {trail?.trail_name || 'Unknown Trail'}
                  </Text>
                  <Text style={{ fontSize: cardFontSize - 2, color: '#666' }}>
                    {trail?.distance_km || 'N/A'}km • {trail?.difficulty || 'N/A'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
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
      // Web (React Native Web) prefers boxShadow instead of shadow* props
      boxShadow: '0px 3px 6px rgba(0,0,0,0.12)',

    },

    searchInput: {
      width: '90%',
      backgroundColor: '#fff',
      borderRadius: 8,
      padding: 10,
      marginVertical: 12,
      borderWidth: 1,
      borderColor: '#ddd',
      fontSize: 14,
    },

    filterRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },

    filterButton: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 20,
      backgroundColor: '#eee',
    },

    filterButtonActive: {
      backgroundColor: '#2E7D32',
    },

  });
