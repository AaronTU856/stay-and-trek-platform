import { Tabs } from "expo-router";
import { AccessibilityProvider } from '../context/AccessibilityContext';

export default function Layout() {
  return (
    <AccessibilityProvider>
      
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" options={{ title: "Home" }} />
        <Tabs.Screen name="trails" options={{ title: "Trails" }} />
        <Tabs.Screen name="stay" options={{ title: "Stay" }} />
        <Tabs.Screen name="weather" options={{ title: "Weather" }} />
        
      </Tabs>
    </AccessibilityProvider>
  );
}


