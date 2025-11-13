import { View, Text, StyleSheet } from "react-native";

export default function StayScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Accommodation</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24 }
});
