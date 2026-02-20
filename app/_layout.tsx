import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { AppProvider } from '../context/AppContext';
import { AuthProvider } from '../context/AuthContext';
import { Fonts } from '../styles/typography';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    [Fonts.serifBold]: require('../assets/fonts/PlayfairDisplay-Bold.ttf'),
    [Fonts.serifBoldItalic]: require('../assets/fonts/PlayfairDisplay-BoldItalic.ttf'),
    [Fonts.sansRegular]: require('../assets/fonts/Inter-Regular.ttf'),
    [Fonts.sansMedium]: require('../assets/fonts/Inter-Medium.ttf'),
    [Fonts.sansBold]: require('../assets/fonts/Inter-Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
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
          <Stack.Screen name="user-profile" />
          <Stack.Screen name="user-brackets" />
          <Stack.Screen name="user-stats" />
          <Stack.Screen name="user-entry" />
        </Stack>
      </AppProvider>
    </AuthProvider>
  );
}
