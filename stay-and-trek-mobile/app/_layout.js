import { Tabs } from "expo-router";

export default function Layout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="trails" options={{ title: "Trails" }} />
      <Tabs.Screen name="stay" options={{ title: "Stay" }} />
      <Tabs.Screen name="weather" options={{ title: "Weather" }} />
    </Tabs>
  );
}
