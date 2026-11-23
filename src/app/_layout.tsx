import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Network from 'expo-network';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';

import { queryClient } from '@/lib/queries';
import { useAuth } from '@/stores/auth';
import { useOutbox } from '@/stores/outbox';
import { useSession } from '@/stores/session';
import { useOnboarding } from '@/stores/onboarding';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  const status = useAuth((s) => s.status);
  const bootstrap = useAuth((s) => s.bootstrap);
  const network = Network.useNetworkState();

  useEffect(() => {
    bootstrap();
    useOnboarding.getState().hydrate();
    useSession.getState().hydrate();
    useOutbox.getState().hydrate();
  }, [bootstrap]);

  // Replay queued workout uploads whenever we are signed in and online.
  useEffect(() => {
    if (status === 'authed' && network.isConnected !== false) {
      useOutbox
        .getState()
        .flush()
        .then((sent) => {
          if (sent) {
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            queryClient.invalidateQueries({ queryKey: ['home'] });
            queryClient.invalidateQueries({ queryKey: ['progress'] });
          }
        });
    }
  }, [status, network.isConnected]);

  const ready = (fontsLoaded || !!fontError) && status !== 'loading';

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" options={{ animation: 'fade' }} />
          <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="session" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
          <Stack.Screen name="session-complete" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="pick-exercise" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
