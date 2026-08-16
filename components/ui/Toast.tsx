import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToastStore } from '@/stores/toastStore';

export function Toast() {
  const message = useToastStore((state) => state.message);
  const insets = useSafeAreaInsets();
  const appear = useSharedValue(0);

  useEffect(() => {
    appear.value = withTiming(message ? 1 : 0, { duration: 180 });
  }, [message, appear]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [{ translateY: (1 - appear.value) * 20 }],
  }));

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 90 }, containerStyle]}
    >
      <View className="items-center overflow-hidden rounded-2xl bg-text px-4 py-3" style={shadow}>
        <Text className="text-center text-sm font-medium text-white">{message}</Text>
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
