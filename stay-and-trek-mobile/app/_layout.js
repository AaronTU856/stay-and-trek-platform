import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { StatusBar, ActivityIndicator, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { AccessibilityProvider } from '../context/AccessibilityContext';
import { createContext, useContext } from 'react';

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
        console.log('🔑 Loaded token from SecureStore:', token ? 'EXISTS' : 'NONE');
        console.log('🔐 Current userToken state:', token);
        setUserToken(token);
      } catch (e) {
        console.log('❌ Error loading token:', e);
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
        <Stack screenOptions={{ headerShown: false }}>
          {!userToken ? (
            <Stack.Screen name="(auth)" />
          ) : (
            <Stack.Screen name="(app)" />
          )}
        </Stack>
      </AuthContext.Provider>
    </AccessibilityProvider>
  );
}




