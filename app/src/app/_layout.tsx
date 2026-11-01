import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useUserStore } from '@/store';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const isDarkMode = useUserStore((s) => s.isDarkMode);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <ThemeProvider value={isDarkMode ? DarkTheme : DefaultTheme}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="sent-messages" options={{ headerShown: false }} />
        <Stack.Screen name="guided-demo" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
