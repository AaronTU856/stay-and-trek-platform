import { Stack } from 'expo-router';

export default function MapStack() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: "Map" }} />
    </Stack>
  );
}