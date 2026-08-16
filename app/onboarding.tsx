import { useRef, useState } from 'react';
import {
  Alert,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { DIETARY_PREFERENCE_OPTIONS, SUPERMARKET_OPTIONS } from '@/constants/dietaryPreferences';
import { useAuth } from '@/hooks/useAuth';
import { requestAndRegisterPushNotifications } from '@/hooks/usePushNotifications';
import { useOnboardingTooltipStore } from '@/stores/onboardingTooltipStore';
import type { SupermarketPreference } from '@/lib/database.types';

const PAGE_COUNT = 3;

export default function OnboardingScreen() {
  const { session, completeOnboarding } = useAuth();
  const showFabTooltip = useOnboardingTooltipStore((state) => state.showFabTooltip);
  const { width } = useWindowDimensions();

  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);
  const [supermarketPreference, setSupermarketPreference] = useState<SupermarketPreference | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const goToPage = (nextPage: number) => {
    scrollRef.current?.scrollTo({ x: nextPage * width, animated: true });
    setPage(nextPage);
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  const toggleDietary = (value: string) => {
    setDietaryPreferences((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  };

  const finishOnboarding = async () => {
    if (!supermarketPreference || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await completeOnboarding(dietaryPreferences, supermarketPreference);
      showFabTooltip();
    } catch (error) {
      Alert.alert('Something went wrong', error instanceof Error ? error.message : 'Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleEnableNotifications = async () => {
    if (session?.user) {
      try {
        await requestAndRegisterPushNotifications(session.user.id);
      } catch (error) {
        console.warn('Failed to enable notifications', error);
      }
    }
    finishOnboarding();
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        onMomentumScrollEnd={handleScrollEnd}
      >
        <View style={{ width }}>
          <DietaryScreen
            selected={dietaryPreferences}
            onToggle={toggleDietary}
            onNext={() => goToPage(1)}
          />
        </View>
        <View style={{ width }}>
          <SupermarketScreen
            selected={supermarketPreference}
            onSelect={setSupermarketPreference}
            onNext={() => goToPage(2)}
          />
        </View>
        <View style={{ width }}>
          <NotificationsScreen
            isSubmitting={isSubmitting}
            onEnable={handleEnableNotifications}
            onSkip={finishOnboarding}
          />
        </View>
      </ScrollView>

      <View className="flex-row items-center justify-center gap-2 pb-4">
        {Array.from({ length: PAGE_COUNT }).map((_, index) => (
          <View
            key={index}
            className={`h-1.5 rounded-full ${index === page ? 'w-6 bg-primary' : 'w-1.5 bg-border'}`}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

function DietaryScreen({
  selected,
  onToggle,
  onNext,
}: {
  selected: string[];
  onToggle: (value: string) => void;
  onNext: () => void;
}) {
  return (
    <View className="flex-1 justify-between px-6 py-6">
      <View className="gap-8">
        <View className="gap-2">
          <Text className="text-3xl font-bold text-text">What kind of cook are you?</Text>
          <Text className="text-base text-text-muted">These help us label your recipes</Text>
        </View>

        <View className="flex-row flex-wrap gap-2.5">
          {DIETARY_PREFERENCE_OPTIONS.map((option) => {
            const isSelected = selected.includes(option.value);
            return (
              <Pressable
                key={option.value}
                onPress={() => onToggle(option.value)}
                className={`rounded-2xl border px-4 py-3 ${
                  isSelected ? 'border-primary bg-primary' : 'border-border bg-surface'
                }`}
              >
                <Text className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-text'}`}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Button label="Next" onPress={onNext} />
    </View>
  );
}

function SupermarketScreen({
  selected,
  onSelect,
  onNext,
}: {
  selected: SupermarketPreference | null;
  onSelect: (value: SupermarketPreference) => void;
  onNext: () => void;
}) {
  return (
    <View className="flex-1 justify-between px-6 py-6">
      <View className="gap-8">
        <View className="gap-2">
          <Text className="text-3xl font-bold text-text">Where do you usually shop?</Text>
          <Text className="text-base text-text-muted">We&apos;ll prioritise this for your shopping lists</Text>
        </View>

        <View className="gap-3">
          {SUPERMARKET_OPTIONS.map((option) => {
            const isSelected = selected === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => onSelect(option.value)}
                className={`flex-row items-center justify-between rounded-3xl border-2 px-5 py-6 ${
                  isSelected ? 'border-primary bg-primary/5' : 'border-border bg-surface'
                }`}
              >
                <Text className="text-lg font-semibold text-text">{option.label}</Text>
                <Ionicons
                  name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={26}
                  color={isSelected ? '#1B4332' : '#E5E7EB'}
                />
              </Pressable>
            );
          })}
        </View>
      </View>

      <Button label="Next" onPress={onNext} disabled={!selected} />
    </View>
  );
}

function NotificationsScreen({
  isSubmitting,
  onEnable,
  onSkip,
}: {
  isSubmitting: boolean;
  onEnable: () => void;
  onSkip: () => void;
}) {
  return (
    <View className="flex-1 justify-between px-6 py-6">
      <View className="flex-1 items-center justify-center gap-6">
        <View className="h-28 w-28 items-center justify-center rounded-full bg-primary/10">
          <Ionicons name="notifications" size={48} color="#1B4332" />
        </View>
        <View className="items-center gap-2">
          <Text className="text-center text-3xl font-bold text-text">Never miss a recipe</Text>
          <Text className="text-center text-base text-text-muted">
            We&apos;ll let you know when a creator you follow drops a new recipe, and when your meal plan needs
            attention.
          </Text>
        </View>
      </View>

      <View className="gap-3">
        <Button label="Enable Notifications" onPress={onEnable} loading={isSubmitting} />
        <Pressable onPress={onSkip} disabled={isSubmitting} className="items-center py-2">
          <Text className="text-sm font-medium text-text-muted">Maybe later</Text>
        </Pressable>
      </View>
    </View>
  );
}
