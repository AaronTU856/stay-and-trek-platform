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

  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState('All');
  const [expandedId, setExpandedId] = React.useState(null);

  const filtered = React.useMemo(() => {
    return SAMPLE_STAYS.filter(s => {
      if (filter !== 'All' && s.type !== filter) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.type.toLowerCase().includes(q);
    });
  }, [query, filter]);

  function handleBook(item) {
    // lightweight prototype action
    Alert.alert('Booking', `Pretend booking for ${item.name} at €${item.price}/night`);
  }

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
        <TextInput
          placeholder="Search stays..."
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
          clearButtonMode="while-editing"
          accessibilityLabel="Search stays"
        />

        <View style={styles.filters}>
          {['All', 'Hotel', 'B&B', 'Hostel'].map(f => (
            <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.filterChip, filter === f && styles.filterChipActive]} accessibilityRole="button">
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList data={filtered} keyExtractor={i => i.id} renderItem={renderItem} contentContainerStyle={{ paddingBottom: 80 }} style={styles.list} />
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
