import { Stack, useRouter, useSegments } from 'expo-router';
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
  const segments = useSegments();
  const router = useRouter();
  

  useEffect(() => {

    const loadToken = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');

        setUserToken(token);

      } catch (e) {
        console.log('❌ Error loading token:', e);
      } finally {
      setIsLoading(false);
      }
    };
    loadToken();
  }, []);

useEffect(() => {
  
  if (isLoading) return;
  
  const inAuthGroup = segments[0] === '(auth)';

  const isPublicRoute =
    segments.includes('map') ||
    segments.includes('trails') ||
    segments.includes('weather');

  if (!userToken && !inAuthGroup && !isPublicRoute) {
    console.log('No token found, redirecting to login');
    router.replace('/(auth)/login');
  }

}, [segments, userToken, isLoading]);

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
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(app)" />
            <Stack.Screen name="(auth)" />   
        </Stack>
      </AuthContext.Provider>
    </AccessibilityProvider>
  );
}
