import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState, createContext, useContext } from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { AccessibilityProvider } from '../context/AccessibilityContext'; // Keep your existing provider

const AuthContext = createContext({
  userToken: null,
  setUserToken: () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function RootLayout() {
  const [userToken, setUserToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  // Load token on startup
  useEffect(() => {
    const loadToken = async () => {
      const token = await SecureStore.getItemAsync('userToken');
      setUserToken(token);
      setIsLoading(false);
    };
    loadToken();
  }, []);

  // Auth Guard: Directs user to Login or Dashboard
  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';

    if (!userToken && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (userToken && inAuthGroup) {
      router.replace('/');
    }
  }, [userToken, segments, isLoading]);

  if (isLoading) return null;

  return (
    <AccessibilityProvider> 
      <SafeAreaView style={styles.root}>
        <StatusBar backgroundColor="#63755fff" barStyle="light-content" />
        <AuthContext.Provider value={{ userToken, setUserToken }}>
          <Stack screenOptions={{ 
            headerStyle: { backgroundColor: '#63755fff' },
            headerTintColor: '#fff',
          }}>
            {/* The Login screens stay hidden from the header */}
            <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)/register" options={{ headerShown: false }} />
            
            {/* These are your main app pages */}
            <Stack.Screen name="index" options={{ title: "My Profile" }} />
            <Stack.Screen name="map" options={{ title: "Trail Map" }} />
            <Stack.Screen name="trails" options={{ title: "Explore Trails" }} />
            <Stack.Screen name="stay" options={{ title: "Accommodations" }} />
            <Stack.Screen name="weather" options={{ title: "Weather" }} />
            <Stack.Screen name="trail-details" options={{ title: "Trail Details" }} />
          </Stack>
        </AuthContext.Provider>
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

