import { Stack } from 'expo-router';
import { AppProvider } from '../context/AppContext';

export default function RootLayout() {
  return (
    <AppProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="register" />
        <Stack.Screen name="players" />
        <Stack.Screen name="cohorts" />
        <Stack.Screen name="cohort-detail" />
        <Stack.Screen name="bracket-edit" />
        <Stack.Screen name="game-entry" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="payout" />
      </Stack>
    </AppProvider>
  );
}


