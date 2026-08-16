import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import type { ExtractionStatus } from '@/stores/extractionStore';

const STEP_ORDER = ['fetching', 'transcribing', 'extracting', 'saving'] as const satisfies readonly ExtractionStatus[];

const STEP_LABELS: Record<(typeof STEP_ORDER)[number], string> = {
  fetching: 'Fetching video...',
  transcribing: 'Reading transcript...',
  extracting: 'Extracting recipe...',
  saving: 'Saving your recipe...',
};

interface RecipeExtractingLoaderProps {
  status: ExtractionStatus;
}

export function RecipeExtractingLoader({ status }: RecipeExtractingLoaderProps) {
  const currentIndex = (STEP_ORDER as readonly ExtractionStatus[]).indexOf(status);
  const pulse = useSharedValue(0.6);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 650 }), -1, true);
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View className="items-center gap-6 py-4">
      <Animated.View style={pulseStyle}>
        <Ionicons name="restaurant" size={40} color="#52B788" />
      </Animated.View>

      <View className="w-full gap-3">
        {STEP_ORDER.map((step, stepIndex) => {
          const isDone = currentIndex > stepIndex;
          const isActive = currentIndex === stepIndex;

          return (
            <View key={step} className="flex-row items-center gap-3">
              <View
                className={`h-6 w-6 items-center justify-center rounded-full ${
                  isDone ? 'bg-primary' : isActive ? 'bg-accent' : 'bg-border'
                }`}
              >
                {isDone ? (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                ) : isActive ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : null}
              </View>
              <Text className={`text-sm ${isDone || isActive ? 'font-medium text-text' : 'text-text-muted'}`}>
                {STEP_LABELS[step]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
