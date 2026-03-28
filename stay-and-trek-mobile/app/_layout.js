import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState, createContext, useContext } from 'react';
import { StatusBar, ActivityIndicator, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { AccessibilityProvider, useAccessibility } from '../context/AccessibilityContext';


const AuthContext = createContext({
  userToken: null,
  setUserToken: () => {},
});

export const useAuth = () => useContext(AuthContext);

function AppShell({ userToken, setUserToken }) {
  const { darkMode } = useAccessibility();

  return (
    <>
      <StatusBar
        backgroundColor={darkMode ? '#111827' : '#63755fff'}
        barStyle="light-content"
      />
      <AuthContext.Provider value={{ userToken, setUserToken }}>
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(app)" />
            <Stack.Screen name="(auth)" />
        </Stack>
      </AuthContext.Provider>
    </>
  );
}

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

  const fullPath = segments.join('/');


  const isPublicPage =
    fullPath.includes('map') ||
    fullPath.includes('trails') ||
    fullPath.includes('stay');

  // CASE 1: NOT LOGGED IN
  if (!userToken) {
    // If they aren't in Auth and aren't on a Public page, force them to login
    if (!inAuthGroup && !isPublicPage) {
      console.log('🛡️ Guest Access: Redirecting to Login');
      router.replace('/(auth)/login');
    }
  } 
  
  // CASE 2: LOGGED IN
  else if (userToken && inAuthGroup) {
    // If they try to go to Login/Register while logged in, send them to Profile/Home
      console.log('🛡️ Authenticated: Redirecting to Home');
      router.replace('/');
  }
}, [userToken, segments, isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#63755fff" />
      </View>

    );
  }


  return (
    <AccessibilityProvider>
      <AppShell userToken={userToken} setUserToken={setUserToken} />
    </AccessibilityProvider>
  );
}
