import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { PACKAGE_TYPE, type PurchasesPackage } from 'react-native-purchases';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePurchases } from '@/hooks/usePurchases';
import { haptics } from '@/lib/haptics';
import { usePaywallStore } from '@/stores/paywallStore';
import { useToastStore } from '@/stores/toastStore';

const CREAM = '#F5EFE0';
const DARK_GREEN = '#1B4332';

const FEATURES = [
  'Unlimited recipe extractions',
  'Follow unlimited creators',
  'Full meal planner',
  "One-tap Tesco & Sainsbury's shopping",
  'Auto-import new creator recipes',
];

type Plan = 'monthly' | 'yearly';

function findPackage(packages: PurchasesPackage[], type: PACKAGE_TYPE) {
  return packages.find((pkg) => pkg.packageType === type) ?? null;
}

export function PaywallSheet() {
  const isOpen = usePaywallStore((state) => state.isOpen);
  const close = usePaywallStore((state) => state.close);
  const { getOfferings, purchasePackage, isLoading: isPurchasesLoading } = usePurchases();
  const showToast = useToastStore((state) => state.show);
  const insets = useSafeAreaInsets();

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isLoadingOfferings, setIsLoadingOfferings] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan>('yearly');
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedPlan('yearly');
    setIsLoadingOfferings(true);
    getOfferings()
      .then(setPackages)
      .catch(() => setPackages([]))
      .finally(() => setIsLoadingOfferings(false));
  }, [isOpen, getOfferings]);

  const monthlyPkg = useMemo(() => findPackage(packages, PACKAGE_TYPE.MONTHLY), [packages]);
  const yearlyPkg = useMemo(() => findPackage(packages, PACKAGE_TYPE.ANNUAL), [packages]);
  const lifetimePkg = useMemo(() => findPackage(packages, PACKAGE_TYPE.LIFETIME), [packages]);

  const selectedPkg = selectedPlan === 'monthly' ? monthlyPkg : yearlyPkg;

  async function handlePurchase(pkg: PurchasesPackage | null) {
    if (!pkg || isPurchasing) return;
    setIsPurchasing(true);
    try {
      const isNowPro = await purchasePackage(pkg);
      if (isNowPro) {
        haptics.success();
        showToast('Welcome to Snip Pro!');
        close();
      }
    } catch (error) {
      const userCancelled = (error as { userCancelled?: boolean })?.userCancelled;
      if (!userCancelled) {
        haptics.error();
        showToast("Purchase couldn't be completed. Please try again.");
      }
    } finally {
      setIsPurchasing(false);
    }
  }

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={close}
    >
      <View className="flex-1" style={{ backgroundColor: DARK_GREEN, paddingTop: insets.top }}>
        <View className="flex-row justify-end px-4 pt-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={close}
            hitSlop={12}
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
          >
            <Ionicons name="close" size={22} color={CREAM} />
          </Pressable>
        </View>

        <View className="flex-1 px-6" style={{ paddingBottom: insets.bottom + 24 }}>
          <View className="items-center pb-6 pt-2">
            <Text className="text-3xl font-bold" style={{ color: CREAM }}>
              Snip <Text style={{ color: '#95D5B2' }}>Pro</Text>
            </Text>
          </View>

          <View className="gap-3">
            {FEATURES.map((feature) => (
              <View key={feature} className="flex-row items-center gap-3">
                <Ionicons name="checkmark-circle" size={20} color="#95D5B2" />
                <Text className="flex-1 text-base" style={{ color: CREAM }}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>

          <View className="flex-1" />

          {isLoadingOfferings ? (
            <ActivityIndicator color={CREAM} style={{ marginBottom: 16 }} />
          ) : (
            <>
              <View
                className="mb-5 flex-row rounded-2xl p-1"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Monthly plan"
                  accessibilityState={{ selected: selectedPlan === 'monthly' }}
                  onPress={() => {
                    haptics.selection();
                    setSelectedPlan('monthly');
                  }}
                  className="flex-1 items-center rounded-xl py-3"
                  style={{ backgroundColor: selectedPlan === 'monthly' ? CREAM : 'transparent' }}
                >
                  <Text
                    className="text-base font-semibold"
                    style={{ color: selectedPlan === 'monthly' ? DARK_GREEN : CREAM }}
                  >
                    Monthly
                  </Text>
                  {monthlyPkg && (
                    <Text
                      className="text-xs"
                      style={{ color: selectedPlan === 'monthly' ? DARK_GREEN : 'rgba(245,239,224,0.7)' }}
                    >
                      {monthlyPkg.product.priceString}/mo
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Yearly plan"
                  accessibilityState={{ selected: selectedPlan === 'yearly' }}
                  onPress={() => {
                    haptics.selection();
                    setSelectedPlan('yearly');
                  }}
                  className="flex-1 items-center rounded-xl py-3"
                  style={{ backgroundColor: selectedPlan === 'yearly' ? CREAM : 'transparent' }}
                >
                  <View className="flex-row items-center gap-1.5">
                    <Text
                      className="text-base font-semibold"
                      style={{ color: selectedPlan === 'yearly' ? DARK_GREEN : CREAM }}
                    >
                      Yearly
                    </Text>
                    <View className="rounded-full bg-[#52B788] px-1.5 py-0.5">
                      <Text className="text-[10px] font-bold text-white">SAVE 42%</Text>
                    </View>
                  </View>
                  {yearlyPkg && (
                    <Text
                      className="text-xs"
                      style={{ color: selectedPlan === 'yearly' ? DARK_GREEN : 'rgba(245,239,224,0.7)' }}
                    >
                      {yearlyPkg.product.priceString}/yr
                    </Text>
                  )}
                </Pressable>
              </View>

              <Pressable
                accessibilityRole="button"
                disabled={isPurchasing || isPurchasesLoading || !selectedPkg}
                onPress={() => handlePurchase(selectedPkg)}
                className="min-h-[54px] items-center justify-center rounded-2xl"
                style={{ backgroundColor: CREAM, opacity: isPurchasing || !selectedPkg ? 0.6 : 1 }}
              >
                {isPurchasing ? (
                  <ActivityIndicator color={DARK_GREEN} />
                ) : (
                  <Text className="text-base font-bold" style={{ color: DARK_GREEN }}>
                    {selectedPlan === 'monthly' ? 'Start 7-Day Free Trial' : 'Try Free for 7 Days'}
                  </Text>
                )}
              </Pressable>

              {lifetimePkg && (
                <Pressable
                  className="mt-4 items-center"
                  onPress={() => handlePurchase(lifetimePkg)}
                  disabled={isPurchasing}
                >
                  <Text className="text-sm underline" style={{ color: CREAM }}>
                    Or get lifetime access for {lifetimePkg.product.priceString}
                  </Text>
                </Pressable>
              )}

              <View className="mt-4 items-center gap-1">
                <Text className="text-center text-xs" style={{ color: 'rgba(245,239,224,0.6)' }}>
                  Cancel anytime. Payment via App Store.
                </Text>
                <View className="flex-row gap-3">
                  <Pressable onPress={() => WebBrowser.openBrowserAsync('https://snip.app/privacy')}>
                    <Text className="text-xs underline" style={{ color: 'rgba(245,239,224,0.6)' }}>
                      Privacy Policy
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => WebBrowser.openBrowserAsync('https://snip.app/terms')}>
                    <Text className="text-xs underline" style={{ color: 'rgba(245,239,224,0.6)' }}>
                      Terms of Service
                    </Text>
                  </Pressable>
                </View>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
