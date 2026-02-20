import { Tabs } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';

export default function AppLayout() {
  return (
    <SafeAreaView style={styles.root}>
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="map" options={{ title: "Map View" }} />
        <Tabs.Screen name="trails" options={{ title: "Trails" }} />
        <Tabs.Screen name="index" options={{ title: "Home" }} />
        <Tabs.Screen name="stay" options={{ title: "Stay" }} />
        <Tabs.Screen name="weather" options={{ title: "Weather" }} />
      </Tabs>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#63755fff' },
});