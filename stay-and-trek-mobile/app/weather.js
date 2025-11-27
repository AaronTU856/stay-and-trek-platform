import React from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { useAccessibility } from "../context/AccessibilityContext";
import IconButton from '../components/IconButton';
import { useRouter } from 'expo-router';

const SAMPLE_FORECAST = [
  { day: 'Mon', highC: 12, lowC: 6, condition: 'Partly Cloudy' },
  { day: 'Tue', highC: 10, lowC: 4, condition: 'Showers' },
  { day: 'Wed', highC: 14, lowC: 7, condition: 'Sunny' },
  { day: 'Thu', highC: 11, lowC: 5, condition: 'Windy' },
  { day: 'Fri', highC: 13, lowC: 6, condition: 'Cloudy' },
];

function cToF(c) { return Math.round((c * 9) / 5 + 32); }

export default function WeatherScreen() {
  const { largeText } = useAccessibility();
  const titleFontSize = largeText ? 32 : 24;
  const router = useRouter();

  const [location, setLocation] = React.useState('Westport');
  const [unit, setUnit] = React.useState('C'); // 'C' or 'F'

  function renderForecast({ item }) {
    const high = unit === 'C' ? item.highC : cToF(item.highC);
    const low = unit === 'C' ? item.lowC : cToF(item.lowC);
    const tempSuffix = `°${unit}`;
    const cardFontSize = largeText ? 18 : 14;

    return (
      <View style={styles.card}>
        <Text style={[styles.cardDay, { fontSize: cardFontSize + 2 }]}>{item.day}</Text>
        <Text style={[styles.cardCond, { fontSize: cardFontSize }]}>{item.condition}</Text>
        <Text style={[styles.cardTemp, { fontSize: cardFontSize }]}>{high}{tempSuffix} / {low}{tempSuffix}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { fontSize: titleFontSize }]}>Weather</Text>

      <View style={styles.iconRow}>
        <IconButton name="hiking" iconSet="fontawesome" label="Find Trails" bgColor="#2E7D32" onPress={() => router.push('/trails')} />
        <IconButton name="bed" iconSet="material" label="Find Accommodation" bgColor="#1565C0" onPress={() => router.push('/stay')} />
        <IconButton name="sunny-outline" iconSet="ionicon" label="View Weather" bgColor="#FFA000" onPress={() => router.push('/weather')} />
      </View>

      <View style={styles.controls}>
        <TextInput
          placeholder="Search town or postcode"
          value={location}
          onChangeText={setLocation}
          style={styles.searchInput}
          accessibilityLabel="Search location"
        />

        <View style={styles.unitRow}>
          <Text style={styles.unitLabel}>Units</Text>
          <TouchableOpacity
            style={[styles.unitButton, unit === 'C' && styles.unitButtonActive]}
            onPress={() => setUnit('C')}
            accessibilityRole="button"
          >
            <Text style={[styles.unitText, unit === 'C' && styles.unitTextActive]}>°C</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.unitButton, unit === 'F' && styles.unitButtonActive]}
            onPress={() => setUnit('F')}
            accessibilityRole="button"
          >
            <Text style={[styles.unitText, unit === 'F' && styles.unitTextActive]}>°F</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { fontSize: largeText ? 20 : 16 }]}>5-day forecast for {location}</Text>

      <FlatList
        data={SAMPLE_FORECAST}
        keyExtractor={(i) => i.day}
        renderItem={renderForecast}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12 }}
        style={{ marginTop: 8 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "flex-start", alignItems: "center", paddingTop: 12 },
  title: { fontSize: 24 },
  iconRow: { flexDirection: 'row', marginTop: 12, justifyContent: 'center', width: '100%', flexWrap: 'wrap' },
  controls: { width: '100%', paddingHorizontal: 20, marginTop: 12 },
  searchInput: { backgroundColor: '#efc3c3ff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  unitRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  unitLabel: { marginRight: 8, fontWeight: '600' },
  unitButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#d87f7fff', marginRight: 8 },
  unitButtonActive: { backgroundColor: '#1565C0' },
  unitText: { color: '#333', fontWeight: '600' },
  unitTextActive: { color: '#ffffffff' },
  sectionTitle: { alignSelf: 'flex-start', marginLeft: 20, marginTop: 16, fontWeight: '700' },
  card: { width: 140, padding: 12, marginRight: 12, borderRadius: 10, backgroundColor: '#edcfcfff', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(102, 147, 89, 0.04)',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2, boxShadow: '0px 2px 6px rgba(0,0,0,0.08)'
  },
  cardDay: { fontWeight: '700' },
  cardCond: { color: '#666', marginTop: 6 },
  cardTemp: { marginTop: 6, fontWeight: '700' },
});
