import { Stack } from 'expo-router';
import { useEffect, useState, createContext, useContext } from 'react';
import { StatusBar, ActivityIndicator, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { AccessibilityProvider } from '../context/AccessibilityContext';

const AuthContext = createContext({
  userToken: null,
  setUserToken: () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function RootLayout() {
  const [userToken, setUserToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadToken = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        setUserToken(token);
      } catch (e) {
        console.log('Error loading token:', e);
      }
      setIsLoading(false);
    };
    loadToken();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#63755fff" />
      </View>
    );
  }

  return (
    <AccessibilityProvider>
      <StatusBar backgroundColor="#63755fff" barStyle="light-content" />
      <AuthContext.Provider value={{ userToken, setUserToken }}>
        <Stack 
          screenOptions={{ 
            headerStyle: { backgroundColor: '#63755fff' },
            headerTintColor: '#fff',
          }}
        >
          {!userToken ? (
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          ) : (
            <>
              <Stack.Screen name="index" options={{ title: "My Profile" }} />
              <Stack.Screen name="map" options={{ title: "Trail Map" }} />
              <Stack.Screen name="trails" options={{ title: "Explore Trails" }} />
              <Stack.Screen name="stay" options={{ title: "Accommodations" }} />
              <Stack.Screen name="weather" options={{ title: "Weather" }} />
              <Stack.Screen name="trail-details" options={{ title: "Trail Details" }} />
            </>
          )}
        </Stack>
      </AuthContext.Provider>
    </AccessibilityProvider>
  );
}

