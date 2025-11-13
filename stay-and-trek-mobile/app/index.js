import React from "react";
import { View, Text, Button, StyleSheet, TouchableOpacity } from "react-native";
import { useAccessibility } from "../context/AccessibilityContext";

export default function HomeScreen() {
    const { largeText, toggleLargeText } = useAccessibility();
    const [padded, setPadded] = React.useState(false);

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
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    paddingBottom: 80,
  },
  subtitle: {
    fontSize: 16,
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
  toggleOff: { backgroundColor: "#ccc" },
});
