import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAccessibility } from '../context/AccessibilityContext';


const API_BASE_URL = 'http://192.168.1.83:8000';
// const API_BASE_URL = 'http://10.46.73.27:8000';
 

export default function StayScreen() {

  const [stays, setStays] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const { largeText } = useAccessibility();
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState('All');
  const [expandedId, setExpandedId] = React.useState(null);


  const fetchStays = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/trails/accommodations/nearby/?lat=53.5&lng=-7.7&radius=50`);
      if (response.ok) {
        const data = await response.json();
        
        // Handle GeoJSON FeatureCollection format
        let staysArray = [];
        if (data.results && data.results.features) {
          // Transform GeoJSON features to flat objects for easier access
          staysArray = data.results.features.map(feature => ({
            id: feature.id,
            ...feature.properties, // Flatten properties (name, accommodation_source, price_per_night, rating)
            coordinates: feature.geometry?.coordinates || [0, 0], // [longitude, latitude]
          }));
        } else if (Array.isArray(data.results)) {
          // Handle direct array format
          staysArray = data.results;
        } else if (Array.isArray(data)) {
          // Handle direct data array
          staysArray = data;
        }
        
        console.log(`Loaded ${staysArray.length} accommodations`);
        setStays(staysArray);
      } else {
        console.error(`API error: ${response.status}`);
        setStays([]);
        Alert.alert("API Error", `Server returned ${response.status}`);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      setStays([]);
      Alert.alert("Connection Error", "Ensure Django is running and your IP is correct.");
    } finally {
      setLoading(false);
    }
  };
  // Trigger fetch when screen mounts
  React.useEffect(() => {
    fetchStays();
  }, []);


  
  const filtered = React.useMemo(() => {
    if (!Array.isArray(stays)) return [];
    return stays.filter(s => {
      if (filter !== 'All' && s.accommodation_source !== filter) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return s.name.toLowerCase().includes(q);
    });
  }, [stays, query, filter]);

  function handleBook(item) {
    // lightweight prototype action
    Alert.alert('Booking', `Pretend booking for ${item.name} at €${item.price}/night`);
  }

  function renderItem({ item }) {
    const cardFontSize = largeText ? 18 : 16;
    const expanded = expandedId === item.id;
    return (
      <TouchableOpacity
      style={[styles.card, expanded && styles.cardExpanded]}
      onPress={() => setExpandedId(expanded ? null : item.id)}
      activeOpacity={0.9}
    >
      <View style={styles.cardRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={[styles.cardTitle, { fontSize: cardFontSize, fontWeight: '700', color: '#1a1a1a' }]}>
              {item.name}
            </Text>
            {/* UI Improvement: Dynamic Badge */}
            {item.rating >= 4.5 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>TOP RATED</Text>
              </View>
            )}
          </View>
          
          <Text style={{ fontSize: cardFontSize - 2, color: '#444', marginTop: 4 }}>
            <Ionicons name="location-outline" size={14} color="#2E7D32" /> {item.accommodation_source}
          </Text>
        </View>
        
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.priceText}>€{item.price_per_night}</Text>
          <Text style={styles.priceSub}>/night</Text>
        </View>
      </View>

       {expanded && (
        <View style={styles.expanded}>
          <Text style={styles.descriptionText}>
            {item.description || "Experience the best of trekking with this premium accommodation located conveniently near the main trails."}
          </Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={styles.bookButton} 
              onPress={() => Alert.alert('Booking', `Redirecting to secure booking for ${item.name}...`)}
            >
              <Text style={styles.bookText}>Book Stay</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.infoButton}>
              <Text style={styles.infoText}>View Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { fontSize: largeText ? 28 : 22 }]}>Accommodation</Text>
      
      {/* Search and Filters */}
      <View style={styles.controls}>
        <TextInput
          placeholder="Search stays..."
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
        />
        <View style={styles.filters}>
          {['All', 'Hotel', 'B&B', 'Hostel'].map(f => (
            <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.filterChip, filter === f && styles.filterChipActive]}>
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2E7D32" style={{ marginTop: 20 }} />
      ) : (
        <FlatList 
          data={filtered} 
          keyExtractor={i => i.id.toString()} 
          renderItem={renderItem} 
          contentContainerStyle={{ paddingBottom: 80 }} 
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: 'transparent' },
  title: { fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  controls: { marginBottom: 12 },
  searchInput: { backgroundColor: '#fff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  filters: { flexDirection: 'row', marginTop: 10, justifyContent: 'center', gap: 8 },
  filterChip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, backgroundColor: '#eee' },
  filterChipActive: { backgroundColor: '#2E7D32' },
  filterText: { color: '#333', fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  list: { marginTop: 8 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e0e0e0',

  // iOS shadow
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },

  // Android shadow
  elevation: 3,

  // web
  boxShadow: '0px 3px 6px rgba(0,0,0,0.12)',
},
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cardTitle: {},
  expanded: { marginTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.03)', paddingTop: 10 },
  actionsRow: { flexDirection: 'row', marginTop: 4 },
  bookButton: { backgroundColor: '#2E7D32', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, marginRight: 8 },
  bookText: { color: '#fff', fontWeight: '700' },
  infoButton: { borderWidth: 1, borderColor: '#2E7D32', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  infoText: { color: '#2E7D32', fontWeight: '700' },
  pointerEvents: { pointerEvents: 'none' },
});
