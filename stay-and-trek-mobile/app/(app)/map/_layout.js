import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';


export default function MapStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#164e12',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: "Stay & Trek Map" }}
      />
    </Stack>
  );
}

// Map Text and Colour Styles
const styles = StyleSheet.create({
    root: {
    flex: 1,
    backgroundColor: '#0F172A', // deep modern navy
    padding: 20,
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    color: '#F8FAFC',
    marginBottom: 10,
  },

  description: {
    fontSize: 16,
    color: '#CBD5E1',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },

  contentArea: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,

    // Shadow (iOS)
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },

    // Elevation (Android)
    elevation: 5,
  },

  button: {
    backgroundColor: '#283d83',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignSelf: 'center',
    marginTop: 20,
  },

  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
});