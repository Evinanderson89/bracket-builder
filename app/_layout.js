import { Stack } from 'expo-router';
import { AppProvider } from '../context/AppContext';
import { AuthProvider } from '../context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="players" />
          <Stack.Screen name="cohorts" />
          <Stack.Screen name="cohort-detail" />
          <Stack.Screen name="bracket-edit" />
          <Stack.Screen name="game-entry" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="payout" />
          <Stack.Screen name="user-dashboard" />
          <Stack.Screen name="user-profile" />
          <Stack.Screen name="user-brackets" />
          <Stack.Screen name="user-stats" />
          <Stack.Screen name="user-entry" />
        </Stack>
      </AppProvider>
    </AuthProvider>
  );
}


