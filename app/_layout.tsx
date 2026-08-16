import '../global.css';

import { useEffect } from 'react';
import { Stack, router, useRouter, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';

import { PaywallSheet } from '@/components/paywall/PaywallSheet';
import { Toast } from '@/components/ui/Toast';
import { UndoToast } from '@/components/ui/UndoToast';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { configureRevenueCat } from '@/lib/revenuecat';
import { queryClient } from '@/lib/queryClient';

SplashScreen.preventAutoHideAsync().catch(() => {});
configureRevenueCat();

function useProtectedRoute(isSignedIn: boolean, isInitialized: boolean, needsOnboarding: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === 'auth';
    const inOnboarding = segments[0] === 'onboarding';

    if (!isSignedIn && !inAuthGroup) {
      router.replace('/auth/sign-in');
    } else if (isSignedIn && inAuthGroup) {
      router.replace('/(tabs)');
    } else if (isSignedIn && needsOnboarding && !inOnboarding) {
      router.replace('/onboarding');
    } else if (isSignedIn && !needsOnboarding && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [isSignedIn, isInitialized, needsOnboarding, segments, router]);
}

function useNotificationTapNavigation() {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const recipeId = response.notification.request.content.data?.recipe_id;
      if (typeof recipeId === 'string') {
        router.push(`/recipe/${recipeId}`);
      }
    });
    return () => subscription.remove();
  }, []);
}

function RootLayoutNav() {
  const { isSignedIn, isInitialized, needsOnboarding } = useAuth();
  useProtectedRoute(isSignedIn, isInitialized, needsOnboarding);
  usePushNotifications();
  useNotificationTapNavigation();

  useEffect(() => {
    if (isInitialized) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isInitialized]);

  if (!isInitialized) {
    return null;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen
          name="recipe/[id]"
          options={{ headerShown: true, title: '', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="creator/[id]"
          options={{ headerShown: true, title: '', headerBackTitle: 'Back' }}
        />
        <Stack.Screen name="cook/[id]" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="extract" options={{ presentation: 'transparentModal', animation: 'fade' }} />
      </Stack>
      <UndoToast />
      <Toast />
      <PaywallSheet />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <RootLayoutNav />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
