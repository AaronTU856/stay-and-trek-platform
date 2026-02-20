import { Stack } from 'expo-router';

export default function TrailsStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Trails" }} />
      <Stack.Screen name="[id]" options={{ title: "Trail Details" }} />
    </Stack>
  );
}
