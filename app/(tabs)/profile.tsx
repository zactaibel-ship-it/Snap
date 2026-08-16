import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Sheet } from '@/components/ui/Sheet';
import { DIETARY_PREFERENCE_OPTIONS, SUPERMARKET_OPTIONS } from '@/constants/dietaryPreferences';
import { FREE_EXTRACTION_LIMIT, getEffectiveExtractionCount } from '@/constants/limits';
import { useAuth } from '@/hooks/useAuth';
import {
  useDeleteAccount,
  useToggleNotifications,
  useUpdateAvatar,
  useUpdateDietaryPreferences,
  useUpdateSupermarketPreference,
} from '@/hooks/useProfile';
import { usePurchases } from '@/hooks/usePurchases';
import { usePaywallStore } from '@/stores/paywallStore';
import type { SupermarketPreference } from '@/lib/database.types';

export default function ProfileScreen() {
  const { profile, session, signOut } = useAuth();
  const { isPro, customerInfo, restorePurchases } = usePurchases();
  const openPaywall = usePaywallStore((state) => state.open);

  const updateAvatar = useUpdateAvatar();
  const updateDietary = useUpdateDietaryPreferences();
  const updateSupermarket = useUpdateSupermarketPreference();
  const toggleNotifications = useToggleNotifications();
  const deleteAccountMutation = useDeleteAccount();

  const [isDietarySheetOpen, setIsDietarySheetOpen] = useState(false);
  const [isSupermarketSheetOpen, setIsSupermarketSheetOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const notificationsEnabled = !!profile?.push_token;
  const proExpirationDate = customerInfo?.entitlements.active.pro?.expirationDate;

  const effectiveExtractionCount = getEffectiveExtractionCount(
    profile?.extraction_count ?? 0,
    profile?.extraction_reset_date ?? null
  );
  const extractionsRemaining = FREE_EXTRACTION_LIMIT - effectiveExtractionCount;

  const handleAvatarPress = async () => {
    try {
      await updateAvatar.mutateAsync();
    } catch (error) {
      Alert.alert('Could not update avatar', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const handleRestorePurchases = async () => {
    setIsRestoring(true);
    try {
      const restoredIsPro = await restorePurchases();
      Alert.alert(
        restoredIsPro ? 'Purchases restored' : 'Nothing to restore',
        restoredIsPro ? 'Your Snip Pro subscription is now active on this device.' : "We couldn't find a previous purchase for this account."
      );
    } catch (error) {
      Alert.alert('Could not restore purchases', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleToggleNotifications = (enabled: boolean) => {
    toggleNotifications.mutate(enabled, {
      onError: (error) => {
        Alert.alert('Could not update notifications', error instanceof Error ? error.message : 'Please try again.');
      },
    });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This permanently deletes your account, recipes, meal plans, and shopping lists. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteAccountMutation.mutate(undefined, {
              onError: (error) => {
                Alert.alert('Could not delete account', error instanceof Error ? error.message : 'Please try again.');
              },
            });
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-5 pb-2 pt-4">
        <Text className="text-3xl font-bold text-text">Profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 16 }}>
        <Card className="flex-row items-center gap-4">
          <Pressable onPress={handleAvatarPress} disabled={updateAvatar.isPending}>
            {updateAvatar.isPending ? (
              <View className="h-14 w-14 items-center justify-center rounded-full bg-border/40">
                <ActivityIndicator color="#1B4332" />
              </View>
            ) : (
              <View>
                <Avatar uri={profile?.avatar_url} name={profile?.full_name ?? session?.user.email} size={56} />
                <View className="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full bg-primary">
                  <Ionicons name="camera" size={12} color="#FFFFFF" />
                </View>
              </View>
            )}
          </Pressable>
          <View className="flex-1 gap-0.5">
            <Text className="text-lg font-semibold text-text">{profile?.full_name ?? 'Your account'}</Text>
            <Text className="text-sm text-text-muted">{session?.user.email}</Text>
          </View>
        </Card>

        <Pressable onPress={() => !isPro && openPaywall('manual')} disabled={isPro}>
          <Card className="bg-primary">
            <View className="flex-row items-center justify-between">
              <View className="gap-0.5">
                <Text className="text-base font-bold text-white">{isPro ? 'Snip Pro ✓' : 'Snip Free'}</Text>
                <Text className="text-xs text-white/70">
                  {isPro
                    ? proExpirationDate
                      ? `Renews ${new Date(proExpirationDate).toLocaleDateString()}`
                      : 'Lifetime access'
                    : 'Upgrade to Pro →'}
                </Text>
              </View>
              {!isPro && <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />}
            </View>
          </Card>
        </Pressable>

        {!isPro && (
          <Card className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-text-muted">Extractions this month</Text>
              <Text className="text-sm font-semibold text-text">
                {effectiveExtractionCount} / {FREE_EXTRACTION_LIMIT}
              </Text>
            </View>
            <View className="h-2 overflow-hidden rounded-full bg-border">
              <View
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, (effectiveExtractionCount / FREE_EXTRACTION_LIMIT) * 100)}%` }}
              />
            </View>
            {extractionsRemaining <= 2 && extractionsRemaining > 0 ? (
              <Text className="text-xs text-error">
                {extractionsRemaining} extraction{extractionsRemaining === 1 ? '' : 's'} remaining this month
              </Text>
            ) : null}
          </Card>
        )}

        <Card className="gap-0">
          <SettingsRow
            label="Dietary preferences"
            value={
              profile?.dietary_preferences.length
                ? profile.dietary_preferences
                    .map((value) => DIETARY_PREFERENCE_OPTIONS.find((option) => option.value === value)?.label ?? value)
                    .join(', ')
                : 'None set'
            }
            onPress={() => setIsDietarySheetOpen(true)}
          />
          <Divider />
          <SettingsRow
            label="Supermarket preference"
            value={SUPERMARKET_OPTIONS.find((option) => option.value === profile?.supermarket_preference)?.label ?? 'Not set'}
            onPress={() => setIsSupermarketSheetOpen(true)}
          />
          <Divider />
          <View className="flex-row items-center justify-between py-3">
            <Text className="text-base text-text">Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              disabled={toggleNotifications.isPending}
              trackColor={{ true: '#1B4332' }}
            />
          </View>
          <Divider />
          <SettingsRow
            label="Restore Purchases"
            value={isRestoring ? 'Restoring…' : undefined}
            onPress={handleRestorePurchases}
            disabled={isRestoring}
          />
          <Divider />
          <SettingsRow label="Privacy Policy" onPress={() => WebBrowser.openBrowserAsync('https://snip.app/privacy')} />
          <Divider />
          <SettingsRow label="Terms of Service" onPress={() => WebBrowser.openBrowserAsync('https://snip.app/terms')} />
          <Divider />
          <SettingsRow label="Delete Account" destructive onPress={handleDeleteAccount} disabled={deleteAccountMutation.isPending} />
          <Divider />
          <SettingsRow label="Sign Out" onPress={handleSignOut} />
        </Card>

        <Text className="pb-2 text-center text-xs text-text-muted">
          Snip v{Constants.expoConfig?.version ?? '1.0.0'}
        </Text>
      </ScrollView>

      <DietaryEditSheet
        visible={isDietarySheetOpen}
        onClose={() => setIsDietarySheetOpen(false)}
        initial={profile?.dietary_preferences ?? []}
        onSave={(values) => {
          updateDietary.mutate(values, {
            onError: (error) =>
              Alert.alert('Could not save', error instanceof Error ? error.message : 'Please try again.'),
          });
          setIsDietarySheetOpen(false);
        }}
      />

      <SupermarketPickerSheet
        visible={isSupermarketSheetOpen}
        onClose={() => setIsSupermarketSheetOpen(false)}
        initial={profile?.supermarket_preference ?? null}
        onSave={(value) => {
          updateSupermarket.mutate(value, {
            onError: (error) =>
              Alert.alert('Could not save', error instanceof Error ? error.message : 'Please try again.'),
          });
          setIsSupermarketSheetOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

function Divider() {
  return <View className="h-px bg-border" />;
}

function SettingsRow({
  label,
  value,
  onPress,
  destructive,
  disabled,
}: {
  label: string;
  value?: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="flex-row items-center justify-between py-3"
      style={disabled ? { opacity: 0.5 } : undefined}
    >
      <Text className={`text-base ${destructive ? 'text-error' : 'text-text'}`}>{label}</Text>
      <View className="flex-row items-center gap-1.5">
        {value ? <Text className="max-w-[160px] text-sm text-text-muted" numberOfLines={1}>{value}</Text> : null}
        <Ionicons name="chevron-forward" size={16} color="#6B7280" />
      </View>
    </Pressable>
  );
}

function DietaryEditSheet({
  visible,
  onClose,
  initial,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  initial: string[];
  onSave: (values: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(initial);

  const toggle = (value: string) => {
    setSelected((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View className="gap-5 pb-2">
        <Text className="text-xl font-bold text-text">Dietary preferences</Text>
        <View className="flex-row flex-wrap gap-2">
          {DIETARY_PREFERENCE_OPTIONS.map((option) => {
            const isSelected = selected.includes(option.value);
            return (
              <Pressable
                key={option.value}
                onPress={() => toggle(option.value)}
                className={`rounded-2xl border px-4 py-2.5 ${isSelected ? 'border-primary bg-primary' : 'border-border bg-surface'}`}
              >
                <Text className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-text'}`}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable className="items-center rounded-2xl bg-primary py-3.5" onPress={() => onSave(selected)}>
          <Text className="text-base font-semibold text-white">Save</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

function SupermarketPickerSheet({
  visible,
  onClose,
  initial,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  initial: SupermarketPreference | null;
  onSave: (value: SupermarketPreference) => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View className="gap-5 pb-2">
        <Text className="text-xl font-bold text-text">Preferred supermarket</Text>
        <View className="gap-2.5">
          {SUPERMARKET_OPTIONS.map((option) => {
            const isSelected = initial === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => onSave(option.value)}
                className={`flex-row items-center justify-between rounded-2xl border px-4 py-3.5 ${
                  isSelected ? 'border-primary bg-primary/5' : 'border-border bg-surface'
                }`}
              >
                <Text className="text-base font-medium text-text">{option.label}</Text>
                {isSelected ? <Ionicons name="checkmark" size={18} color="#1B4332" /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Sheet>
  );
}
