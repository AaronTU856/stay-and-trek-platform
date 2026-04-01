import { Stack } from 'expo-router';

// Groups the trail list and trail detail screens in one stack.
export default function TrailsStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Trails" }} />
      <Stack.Screen name="[id]" options={{ title: "Trail Details" }} />
    </Stack>
  );
}
