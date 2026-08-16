import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

import { logger } from '@/lib/logger';

/** Thin, crash-proof wrapper around expo-haptics — iOS only (this app doesn't ship Android),
 * and never lets a haptics failure interrupt the interaction it's attached to. */
function safeCall(run: () => Promise<void>): void {
  if (Platform.OS !== 'ios') return;
  run().catch((error) => logger.warn('Haptic feedback failed', error));
}

export const haptics = {
  selection: () => safeCall(() => Haptics.selectionAsync()),
  success: () => safeCall(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safeCall(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safeCall(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
