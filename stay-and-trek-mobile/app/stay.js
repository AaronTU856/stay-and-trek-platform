import React from 'react';
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
      const data = await response.json();
      setStays(data.results || data);
    } catch (err) {
      console.error("Fetch Error:", err);
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
        style={styles.card}
        onPress={() => setExpandedId(expanded ? null : item.id)}
      >
        <View style={styles.cardRow}>
          <Text style={[styles.cardTitle, { fontSize: cardFontSize, fontWeight: '600' }]}>{item.name}</Text>
          {/* Mapping to price_per_night from Django */}
          <Text style={{ fontSize: cardFontSize - 2, color: '#666' }}>€{item.price_per_night}/night</Text>
        </View>
        
        {/* Mapping to accommodation_source from Django */}
        <Text style={{ fontSize: cardFontSize - 2, color: '#666' }}>
          {item.rating || '4.5'}★ • {item.accommodation_source}
        </Text>

        {expanded && (
          <View style={styles.expanded}>
            <Text style={{ marginBottom: 8 }}>{item.description || "No description provided."}</Text>
            <TouchableOpacity style={styles.bookButton} onPress={() => Alert.alert('Booking', `Booking ${item.name}`)}>
              <Text style={styles.bookText}>Book Now</Text>
            </TouchableOpacity>
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
  card: { backgroundColor: '#caddf1ff', padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)',

  // iOS shadow
  shadowColor: '#000',
  shadowOpacity: 0.12,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },

  // Android shadow
  elevation: 4,

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
