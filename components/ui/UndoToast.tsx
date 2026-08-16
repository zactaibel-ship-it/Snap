import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUndoStore } from '@/stores/undoStore';

export function UndoToast() {
  const pending = useUndoStore((state) => state.pending);
  const undo = useUndoStore((state) => state.undo);
  const insets = useSafeAreaInsets();

  const appear = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!pending) return;
    appear.value = withTiming(1, { duration: 180 });
    progress.value = 0;
    progress.value = withTiming(1, { duration: pending.durationMs, easing: Easing.linear });
    // Re-run only when a new toast starts, not on every store update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending?.id]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [{ translateY: (1 - appear.value) * 20 }],
  }));

  const barStyle = useAnimatedStyle(() => ({
    width: `${(1 - progress.value) * 100}%`,
  }));

  if (!pending) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 24 }, containerStyle]}
    >
      <View className="overflow-hidden rounded-2xl bg-text" style={shadow}>
        <View className="flex-row items-center justify-between px-4 py-3">
          <Text className="flex-1 pr-3 text-sm font-medium text-white">{pending.message}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Undo" onPress={undo} hitSlop={8}>
            <Text className="text-sm font-bold text-accent">Undo</Text>
          </Pressable>
        </View>
        <View className="h-0.5 bg-white/10">
          <Animated.View className="h-full bg-accent" style={barStyle} />
        </View>
      </View>
    </Animated.View>
  );
}

const shadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 10,
  elevation: 6,
};
