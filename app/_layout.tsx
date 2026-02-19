import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_700Bold,
  PlayfairDisplay_800ExtraBold,
} from '@expo-google-fonts/playfair-display';
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { AppProvider } from '../context/AppContext';
import { AuthProvider } from '../context/AuthContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_800ExtraBold,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

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
