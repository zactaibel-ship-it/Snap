import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';

import { PRO_ENTITLEMENT_ID } from '@/lib/revenuecat';

function hasProEntitlement(info: CustomerInfo | null): boolean {
  return !!info?.entitlements.active[PRO_ENTITLEMENT_ID];
}

export function usePurchases() {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(Platform.OS === 'ios');

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    let cancelled = false;

    Purchases.getCustomerInfo()
      .then((info) => {
        if (!cancelled) setCustomerInfo(info);
      })
      .catch((error) => console.warn('Failed to load RevenueCat customer info', error))
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    const listener = (info: CustomerInfo) => setCustomerInfo(info);
    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      cancelled = true;
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  const getOfferings = useCallback(async (): Promise<PurchasesPackage[]> => {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages ?? [];
  }, []);

  const purchasePackage = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    const { customerInfo: updated } = await Purchases.purchasePackage(pkg);
    setCustomerInfo(updated);
    return hasProEntitlement(updated);
  }, []);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    const updated = await Purchases.restorePurchases();
    setCustomerInfo(updated);
    return hasProEntitlement(updated);
  }, []);

  return {
    isPro: hasProEntitlement(customerInfo),
    isLoading,
    customerInfo,
    getOfferings,
    purchasePackage,
    restorePurchases,
  };
}
