import { Tabs } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAccessibility } from '../../context/AccessibilityContext';

// Defines the main tab bar used after the root auth check.
export default function AppLayout() {
  const { darkMode } = useAccessibility();

  return (
    <SafeAreaView style={[styles.root, darkMode && styles.rootDark]}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: darkMode ? '#86efac' : '#2E7D32',
          tabBarInactiveTintColor: darkMode ? '#9ca3af' : '#6b7280',
          tabBarStyle: [styles.tabBar, darkMode && styles.tabBarDark],
          tabBarLabelStyle: styles.tabLabel,
          sceneStyle: darkMode ? styles.sceneDark : undefined,
        }}
      >
        <Tabs.Screen
          name="map"
          options={{
            title: "Map",
            tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="trails"
          options={{
            title: "Trails",
            tabBarIcon: ({ color, size }) => <Ionicons name="walk-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="list"
          options={{
            title: "My Trip",
            tabBarIcon: ({ color, size }) => <Ionicons name="briefcase-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="stay"
          options={{
            title: "Stay",
            tabBarIcon: ({ color, size }) => <Ionicons name="bed-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="weather"
          options={{
            title: "Weather",
            tabBarIcon: ({ color, size }) => <Ionicons name="partly-sunny-outline" size={size} color={color} />,
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#63755fff' },
  rootDark: { backgroundColor: '#111827' },
  tabBar: {
    height: 64,
    paddingTop: 6,
    paddingBottom: 8,
  },
  tabBarDark: {
    backgroundColor: '#111827',
    borderTopColor: '#1f2937',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  sceneDark: {
    backgroundColor: '#111827',
  },
});
