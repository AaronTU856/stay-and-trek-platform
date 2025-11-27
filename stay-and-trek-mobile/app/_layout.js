import { Tabs } from "expo-router";
import { AccessibilityProvider } from '../context/AccessibilityContext';
import { SafeAreaView, StyleSheet, StatusBar } from 'react-native';

export default function Layout() {
  return (
    <AccessibilityProvider>
      <SafeAreaView style={styles.root}>
        <StatusBar backgroundColor={styles.root.backgroundColor} barStyle="light-content" />
        <Tabs screenOptions={{ headerShown: false, sceneContainerStyle: { backgroundColor: styles.root.backgroundColor } }}>
          <Tabs.Screen name="index" options={{ title: "Home" }} />
          <Tabs.Screen name="trails" options={{ title: "Trails" }} />
          <Tabs.Screen name="stay" options={{ title: "Stay" }} />
          <Tabs.Screen name="weather" options={{ title: "Weather" }} />
        </Tabs>
      </SafeAreaView>
    </AccessibilityProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#63755fff', 
  },
});


