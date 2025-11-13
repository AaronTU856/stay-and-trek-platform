import { View, Text, StyleSheet } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Stay & Trek</Text>
      <Text style={styles.subtitle}>Explore Trails, Accommodation & Weather</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "600" },
  subtitle: { fontSize: 16, marginTop: 10 }
});
