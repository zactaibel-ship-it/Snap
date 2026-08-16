import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

import { logger } from '@/lib/logger';

export const PRO_ENTITLEMENT_ID = 'pro';

export const REVENUECAT_PRODUCT_IDS = {
  monthly: 'snip_pro_monthly',
  yearly: 'snip_pro_yearly',
  lifetime: 'snip_pro_lifetime',
} as const;

let isConfigured = false;

/** Configures the RevenueCat SDK once, on app start. iOS only — this app doesn't ship an Android build yet. */
export function configureRevenueCat(appUserId?: string): void {
  if (isConfigured || Platform.OS !== 'ios') return;

  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
  if (!apiKey) {
    logger.warn('EXPO_PUBLIC_REVENUECAT_IOS_KEY is not set — Pro purchases are disabled.');
    return;
  }

  Purchases.setLogLevel(LOG_LEVEL.WARN);
  Purchases.configure({ apiKey, appUserID: appUserId ?? null } as Parameters<typeof Purchases.configure>[0]);
  isConfigured = true;
}

/** Call once the signed-in user's id is known so purchases attribute to their Supabase account. */
export async function loginRevenueCatUser(appUserId: string): Promise<void> {
  if (!isConfigured) return;
  await Purchases.logIn(appUserId);
}

export async function logoutRevenueCatUser(): Promise<void> {
  if (!isConfigured) return;
  try {
    await Purchases.logOut();
  } catch {
    // No-op if there was never a logged-in RevenueCat user (e.g. SDK not configured yet).
  }
}
