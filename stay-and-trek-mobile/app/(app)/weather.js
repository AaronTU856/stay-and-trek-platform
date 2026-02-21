import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useAccessibility } from "../../context/AccessibilityContext";
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

const IRISH_LOCATIONS = [
  { name: 'Westport', lat: 53.8008, lon: -9.5203 },
  { name: 'Galway', lat: 53.2707, lon: -9.0568 },
  { name: 'Dublin', lat: 53.3498, lon: -6.2603 },
  { name: 'Killarney', lat: 52.0599, lon: -9.5044 },
  { name: 'Cork', lat: 51.8985, lon: -8.4756 },
];

const SAMPLE_FORECAST = [
  { day: 'Mon', highC: 12, lowC: 6, condition: 'Cloudy', icon: 'cloud-outline' },
  { day: 'Tue', highC: 10, lowC: 4, condition: 'Rain', icon: 'rainy-outline' },
  { day: 'Wed', highC: 14, lowC: 7, condition: 'Sunny', icon: 'sunny-outline' },
  { day: 'Thu', highC: 11, lowC: 5, condition: 'Wind', icon: 'cloudy-night-outline' },
  { day: 'Fri', highC: 13, lowC: 6, condition: 'Partly Cloudy', icon: 'partly-sunny-outline' },
];

function cToF(c) { return Math.round((c * 9) / 5 + 32); }

function filterForecast(list) {
  // OpenWeatherMap returns 3-hourly forecasts, so every 8th item is 24 hours apart
  return list.filter((_, index) => index % 8 === 0).slice(0, 5);
}

function getIcon(condition) {
  switch (condition) {
    case 'Clear':
      return 'sunny-outline';
    case 'Clouds':
      return 'cloud-outline';
    case 'Rain':
    case 'Drizzle':
      return 'rainy-outline';
    case 'Thunderstorm':
      return 'thunderstorm-outline';
    case 'Snow':
      return 'snow-outline';
    case 'Mist':
    case 'Smoke':
    case 'Haze':
    case 'Dust':
    case 'Fog':
    case 'Sand':
    case 'Ash':
    case 'Squall':
    case 'Tornado':
      return 'cloudy-outline';
    case 'Wind':
      return 'wind-outline';
    default:
      return 'help-circle-outline';
  }
}

export default function WeatherScreen() {
  const { largeText } = useAccessibility();
  const [selectedLocation, setSelectedLocation] = useState(IRISH_LOCATIONS[0]);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unit, setUnit] = useState('C');
  // Function to get current GPS location
  const handleUseCurrentLocation = async () => {
    setLoading(true);
    try {
      // 1. Request Permission
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permission Denied", "We need location access to show local weather.");
        setLoading(false);
        return;
      }

      // 2. Get GPS Coords
      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // 3. Find name of the location (Reverse Geocoding)
      const API_KEY = process.env.EXPO_PUBLIC_OPENWEATHERMAP_API_KEY;
      const geoUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${API_KEY}`;
      
      const geoResponse = await fetch(geoUrl);
      const geoData = await geoResponse.json();
      
      const placeName = geoData[0]?.name || "Current Location";

      // 4. Set as the active location
      setSelectedLocation({ name: placeName, lat: latitude, lon: longitude });
      setShowDropdown(false);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not fetch your current location.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Weather Effect
  useEffect(() => {
    const fetchWeather = async () => {
  setLoading(true);
  const API_KEY = process.env.EXPO_PUBLIC_OPENWEATHERMAP_API_KEY;
  
  // URL 1: Current Weather
  const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${selectedLocation.lat}&lon=${selectedLocation.lon}&units=metric&appid=${API_KEY}`;
  
  // URL 2: 5-Day Forecast
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${selectedLocation.lat}&lon=${selectedLocation.lon}&units=metric&appid=${API_KEY}`;

  try {
    const [currRes, foreRes] = await Promise.all([fetch(currentUrl), fetch(forecastUrl)]);
    const currData = await currRes.json();
    const foreData = await foreRes.json();

    if (currRes.ok && foreRes.ok) {
      const filteredForecast = filterForecast(foreData.list);
      console.log("Forecast data count:", foreData.list?.length);
      console.log("Filtered forecast count:", filteredForecast?.length);
      console.log("Filtered forecast:", filteredForecast);
      
      setWeatherData({
        current: currData,
        forecast: filteredForecast
      });
    } else {
      console.warn("API Error - Current:", currRes.status, "Forecast:", foreRes.status);
    }
  } catch (e) {
    console.error("Network Error:", e);
  } finally {
    setLoading(false);
  }
};

    fetchWeather();
  }, [selectedLocation]);

  const renderForecast = ({ item }) => {
  const dayName = new Date(item.dt * 1000).toLocaleDateString('en-IE', { weekday: 'short' });
  const temp = unit === 'C' ? Math.round(item.main.temp) : cToF(item.main.temp);
  const condition = item.weather[0].main;

  return (
    <View style={styles.card}>
      <Text style={styles.cardDay}>{dayName}</Text>
      {/* Dynamic icon from API */}
      <Ionicons name={getIcon(condition)} size={32} color="#FFF" style={{ marginVertical: 10 }} />
      <Text style={styles.cardCond}>{condition}</Text>
      <Text style={styles.highTemp}>{temp}°</Text>
    </View>
  );
};

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header with title */}
        <View style={styles.header}>
          <Text style={styles.title}>Stay and Trek Weather Forecast</Text>
        </View>

        {/* Location Selection */}
        <View style={styles.headerRow}>
          <TouchableOpacity 
            style={styles.dropdownHeader} 
            onPress={() => setShowDropdown(!showDropdown)}
          >
            <Text style={styles.locationTitle}>{selectedLocation.name}</Text>
            <Ionicons name="chevron-down" size={18} color="#2E7D32" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.gpsButton} onPress={handleUseCurrentLocation}>
            <Ionicons name="location" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Dropdown Menu */}
        {showDropdown && (
          <View style={styles.dropdownMenu}>
            {IRISH_LOCATIONS.map((loc) => (
              <TouchableOpacity key={loc.name} style={styles.dropdownItem} onPress={() => {
                setSelectedLocation(loc);
                setShowDropdown(false);
              }}>
                <Text style={styles.dropdownItemText}>{loc.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Unit Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity 
            style={[styles.toggleBtn, unit === 'C' && styles.activeToggle]}
            onPress={() => setUnit('C')}
          >
            <Text style={[styles.toggleText, unit === 'C' && styles.activeToggleText]}>°C</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, unit === 'F' && styles.activeToggle]}
            onPress={() => setUnit('F')}
          >
            <Text style={[styles.toggleText, unit === 'F' && styles.activeToggleText]}>°F</Text>
          </TouchableOpacity>
        </View>

        {/* Weather Display */}
        {loading ? (
          <ActivityIndicator size="large" color="#2E7D32" style={{ marginTop: 50 }} />
        ) : weatherData ? (
          <>
            <View style={styles.mainWeather}>
              <Text style={styles.locationName}>{selectedLocation.name}</Text>
              <Text style={styles.mainTemp}>
                {unit === 'C' 
                  ? Math.round(weatherData.current.main.temp) 
                  : cToF(weatherData.current.main.temp)
                }°
              </Text>
              <Text style={styles.mainCondition}>{weatherData.current.weather[0].main}</Text>
              <Text style={styles.description}>{weatherData.current.weather[0].description}</Text>
            </View>

            {/* Forecast Section */}
            <Text style={styles.sectionTitle}>5-Day Forecast</Text>

            <View style={{ height: 180 }}>
              <FlatList
                horizontal
                data={weatherData.forecast}
                renderItem={renderForecast}
                keyExtractor={(item) => item.dt.toString()}
                contentContainerStyle={{ paddingLeft: 20, paddingBottom: 20 }}
                showsHorizontalScrollIndicator={false}
                scrollEnabled={weatherData.forecast?.length > 0}
              />
            </View>
          </>
        ) : (
          <Text style={{ marginTop: 50, textAlign: 'center', color: '#666' }}>Unable to load weather data</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#d7ece7' },
  container: { flex: 1, backgroundColor: '#d7ece7', paddingTop: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#0e5830', fontStyle: 'italic' },
  headerRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, alignItems: 'center', marginBottom: 10 },
  dropdownHeader: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 10 },
  locationTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  gpsButton: { backgroundColor: '#2E7D32', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  dropdownMenu: { backgroundColor: '#FFF', marginHorizontal: 20, marginBottom: 10, borderRadius: 10, overflow: 'hidden', elevation: 3 },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  dropdownItemText: { fontSize: 14, color: '#333' },
  toggleContainer: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 20, alignSelf: 'center', backgroundColor: '#E2E8F0', borderRadius: 10, padding: 3 },
  toggleBtn: { paddingVertical: 6, paddingHorizontal: 20, borderRadius: 8 },
  activeToggle: { backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  toggleText: { fontWeight: '700', color: '#64748B' },
  activeToggleText: { color: '#2E7D32' },
  mainWeather: { alignItems: 'center', marginVertical: 30 },
  locationName: { fontSize: 22, fontWeight: '600', color: '#475569' },
  mainTemp: { fontSize: 80, fontWeight: '200', color: '#1A1C1E' },
  mainCondition: { fontSize: 18, color: '#64748B', textTransform: 'uppercase', letterSpacing: 2 },
  description: { fontSize: 14, color: '#94A3B8', marginTop: 5, textTransform: 'capitalize' },
  sectionTitle: { marginLeft: 20, fontSize: 18, fontWeight: '700', marginBottom: 15, color: '#1A1C1E' },
  card: { 
    width: 110, 
    padding: 15, 
    marginRight: 15, 
    borderRadius: 20, 
    backgroundColor: '#76999f', 
    alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2
  },
  cardDay: { fontWeight: '600', color: '#FFF' },
  cardCond: { fontSize: 12, color: '#E8F0F5', marginBottom: 10, textAlign: 'center' },
  tempRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  highTemp: { fontWeight: '700', color: '#FFF' },
  lowTemp: { color: '#B0C4D4' }
});