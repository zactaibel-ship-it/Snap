import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { useAuth } from '@/hooks/useAuth';
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
 * Requests notification permission and registers an Expo push token after
 * sign-in, saving it to users.push_token so edge functions (e.g.
 * poll-creator-updates) can notify this device.
 */
export function usePushNotifications() {
  const { session } = useAuth();
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const registerForPushNotifications = async () => {
      if (!Device.isDevice) return;

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
      if (finalStatus !== 'granted' || cancelled) return;

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) return; // No EAS project configured — permission is granted, but we can't mint a token yet.

      const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
      if (cancelled) return;

      await supabase.from('users').update({ push_token: tokenResponse.data }).eq('id', userId);
    };

    registerForPushNotifications().catch((error) => {
      console.warn('Failed to register for push notifications', error);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);
}
