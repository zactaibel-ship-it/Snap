import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Requests notification permission (if not already determined) and saves an
 * Expo push token to users.push_token so edge functions (e.g.
 * poll-creator-updates) can notify this device. Returns the resulting
 * permission status.
 */
export async function requestAndRegisterPushNotifications(userId: string): Promise<Notifications.PermissionStatus> {
  if (!Device.isDevice) return Notifications.PermissionStatus.UNDETERMINED;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return finalStatus;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return finalStatus; // No EAS project configured — permission is granted, but we can't mint a token yet.

  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
  await supabase.from('users').update({ push_token: tokenResponse.data }).eq('id', userId);

  return finalStatus;
}

/**
 * Registers an Expo push token whenever permission has already been granted
 * (e.g. via the onboarding flow's "Enable Notifications" step) — this never
 * shows the OS permission prompt itself, so returning/signed-in users are
 * never re-prompted outside of onboarding.
 */
export function usePushNotifications() {
  const { session } = useAuth();
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId || !Device.isDevice) return;

    let cancelled = false;

    Notifications.getPermissionsAsync()
      .then(({ status }) => {
        if (cancelled || status !== 'granted') return;
        return requestAndRegisterPushNotifications(userId);
      })
      .catch((error) => {
        logger.warn('Failed to register for push notifications', error);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);
}
