import { View, Text, StyleSheet } from "react-native";
import { useAccessibility } from "../context/AccessibilityContext";

export default function TrailsScreen() {
  const { largeText } = useAccessibility();
  const titleFontSize = largeText ? 32 : 24;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { fontSize: titleFontSize }]}>Hiking Trails</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24 }
});
