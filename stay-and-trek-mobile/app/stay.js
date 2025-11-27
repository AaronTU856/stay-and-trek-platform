import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAccessibility } from '../context/AccessibilityContext';

// Sample accommodation data with hotels, B&Bs, and hostels
const SAMPLE_STAYS = [
  { id: 's1', name: 'Seaview Hotel', type: 'Hotel', price: 120, rating: 4.3, distance: '0.8km' },
  { id: 's2', name: 'Cozy B&B', type: 'B&B', price: 75, rating: 4.8, distance: '1.2km' },
  { id: 's3', name: 'Backpackers Hostel', type: 'Hostel', price: 25, rating: 4.1, distance: '0.4km' },
  { id: 's4', name: 'Lakeside Lodge', type: 'Hotel', price: 140, rating: 4.6, distance: '5.0km' },
  { id: 's5', name: 'Country B&B', type: 'B&B', price: 65, rating: 4.5, distance: '8.2km' },
];

export default function StayScreen() {
  const { largeText } = useAccessibility();
  const titleFontSize = largeText ? 28 : 22;

  // State for search query and filter
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState('All');
  const [expandedId, setExpandedId] = React.useState(null);

  // Filter stays based on search query and selected category
  const filtered = React.useMemo(() => {
    return SAMPLE_STAYS.filter(s => {
      if (filter !== 'All' && s.type !== filter) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.type.toLowerCase().includes(q);
    });
  }, [query, filter]);

  // Handle booking action - shows alert for prototype
  function handleBook(item) {
    Alert.alert('Booking', `Pretend booking for ${item.name} at €${item.price}/night`);
  }

  // Render individual accommodation card
  function renderItem({ item }) {
    const cardFontSize = largeText ? 18 : 16;
    const expanded = expandedId === item.id;
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => setExpandedId(expanded ? null : item.id)}
        accessibilityRole="button"
        accessibilityLabel={`Open ${item.name}`}
      >
        <View style={styles.cardRow}>
          <Text style={[styles.cardTitle, { fontSize: cardFontSize, fontWeight: '600' }]}>{item.name}</Text>
          <Text style={{ fontSize: cardFontSize - 2, color: '#666' }}>{item.distance}</Text>
        </View>
        <Text style={{ fontSize: cardFontSize - 2, color: '#666' }}>{item.price}€ / night • {item.rating}★ • {item.type}</Text>

        {/* Expanded details with booking options */}
        {expanded && (
          <View style={styles.expanded}>
            <Text style={{ marginBottom: 8 }}>Simple description for {item.name}. Nice location, friendly staff.</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.bookButton} onPress={() => handleBook(item)} accessibilityRole="button">
                <Text style={styles.bookText}>Book</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.infoButton} onPress={() => Alert.alert('Info', `${item.name} details...`)} accessibilityRole="button">
                <Text style={styles.infoText}>More info</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { fontSize: titleFontSize }]}>Accommodation</Text>

      <View style={styles.controls}>
        {/* Search bar for filtering stays */}
        <TextInput
          placeholder="Search stays..."
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
          clearButtonMode="while-editing"
          accessibilityLabel="Search stays"
        />

        {/* Filter buttons for accommodation type */}
        <View style={styles.filters}>
          {['All', 'Hotel', 'B&B', 'Hostel'].map(f => (
            <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.filterChip, filter === f && styles.filterChipActive]} accessibilityRole="button">
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* List of filtered accommodations */}
      <FlatList data={filtered} keyExtractor={i => i.id} renderItem={renderItem} contentContainerStyle={{ paddingBottom: 80 }} style={styles.list} />
    </View>
  );
}

// Styles for accommodation screen
const styles = StyleSheet.create({
  // Main container for the screen
  container: { flex: 1, padding: 16, backgroundColor: 'transparent' },
  // Screen title styling
  title: { fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  // Controls section for search and filters
  controls: { marginBottom: 12 },
  // Search input styling
  searchInput: { backgroundColor: '#fff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  // Filter chips row
  filters: { flexDirection: 'row', marginTop: 10, justifyContent: 'center', gap: 8 },
  // Individual filter chip styling
  filterChip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, backgroundColor: '#eee' },
  // Active filter chip styling
  filterChipActive: { backgroundColor: '#2E7D32' },
  // Filter text styling
  filterText: { color: '#333', fontWeight: '600' },
  // Active filter text styling (white)
  filterTextActive: { color: '#fff' },
  // List container
  list: { marginTop: 8 },
  // Accommodation card styling with shadow
  card: {
    backgroundColor: '#caddf1ff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  // Card header row with name and distance
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  // Card title styling
  cardTitle: {},
  // Expanded details section
  expanded: { marginTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.03)', paddingTop: 10 },
  // Actions row for Book and More info buttons
  actionsRow: { flexDirection: 'row', marginTop: 4 },
  // Book button styling
  bookButton: { backgroundColor: '#2E7D32', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, marginRight: 8 },
  // Book button text color
  bookText: { color: '#fff', fontWeight: '700' },
  // Info button styling with border
  infoButton: { borderWidth: 1, borderColor: '#2E7D32', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  // Info button text color
  infoText: { color: '#2E7D32', fontWeight: '700' },
});
