import { View, Text, StyleSheet } from "react-native";
import { useAccessibility } from "../context/AccessibilityContext";

export default function WeatherScreen() {
  const { largeText } = useAccessibility();
  const titleFontSize = largeText ? 32 : 24;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { fontSize: titleFontSize }]}>Weather</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24 }
});
