import React from "react";
import { View, Text, Button, StyleSheet, TouchableOpacity } from "react-native";
import { useAccessibility } from "../context/AccessibilityContext";
import { Ionicons, MaterialIcons, FontAwesome5, Entypo } from '@expo/vector-icons';
import IconButton from '../components/IconButton';
import SearchBar from '../components/SearchBar';


export default function HomeScreen() {
    const { largeText, toggleLargeText } = useAccessibility();
  const [padded, setPadded] = React.useState(false);
  const [searchResult, setSearchResult] = React.useState('');

    const handleTooggle = () => {
        toggleLargeText();
        setPadded(prev => !prev);
    };
  return (
    <View style={[styles.wrapper, padded && styles.paddedWrapper]}> 
        <Text style={{ fontSize: largeText ? 40 : 18 }}>
                Welcome to Stay & Trek
        </Text>   
      
      <Text style={styles.subtitle}>Explore Trails, Accommodation & Weather</Text>

      
      
      <SearchBar
        suggestions={[
          'Mweelrea',
          'Croagh Patrick',
          'Nephin',
          'Westport',
          'Dublin',
          'Killarney',
          'Connemara',
          'Wicklow Way',
          'Glendalough',
          'Ben Bulben',
          'Slieve Bloom',
          'The Burren',
        ]}
        onSelect={(val) => setSearchResult(val)}
      />

      {searchResult ? <Text style={styles.searchResult}>Selected: {searchResult}</Text> : null}

      <View style={styles.iconRow}>
        <IconButton name="hiking" iconSet="fontawesome" label="Find Trails" bgColor="#2E7D32" onPress={() => {}} />
        <IconButton name="bed" iconSet="material" label="Find Accommodation" bgColor="#1565C0" onPress={() => {}} />
        <IconButton name="sunny-outline" iconSet="ionicon" label="View Weather" bgColor="#FFA000" onPress={() => {}} />

        <IconButton name="heart-outline" iconSet="ionicon" label="Favorites" bgColor="#e93306ff" onPress={() => {}} />
      </View>


      <TouchableOpacity
        onPress={handleTooggle}
        style={[styles.toggleButton, largeText ? styles.toggleOn : styles.toggleOff]}
        accessibilityRole="button"
        activeOpacity={0.8}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        
      >

      

        <Text style={[styles.toggleButtonText, largeText && styles.toggleButtonTextOn]}>
          {largeText ? "Large Text Enabled" : "Large Text: Off"}
        </Text>
      </TouchableOpacity>

    </View>
  );
}


const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    padding: 16,
    paddingBottom: 80,
  },
  subtitle: {
    fontSize: 22,
    marginTop: 10,
    color: "#444",
  },
  toggleButton: {
    position: "absolute",
    left : 16,
    bottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
  },
  toggleButtonText: {
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  toggleButtonTextOn: { color: "#fff" },
  toggleOn: { backgroundColor: "#2f6b3aff" },
  toggleOff: { backgroundColor: "#ccccccff" },
  iconRow: { flexDirection: 'row', marginTop: 18, justifyContent: 'center', width: '100%', flexWrap: 'wrap' },
  searchResult: { marginTop: 12, fontSize: 16, color: '#333' },
});
