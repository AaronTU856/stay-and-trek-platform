import { Stack } from 'expo-router';


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
