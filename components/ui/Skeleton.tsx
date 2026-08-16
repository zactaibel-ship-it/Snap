import { useEffect } from 'react';
import { View, type DimensionValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  className?: string;
}

export function Skeleton({ width = '100%', height = 16, radius = 8, className }: SkeletonProps) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      className={`bg-border ${className ?? ''}`}
      style={[{ width, height, borderRadius: radius }, animatedStyle]}
    />
  );
}

export function SkeletonCard() {
  return (
    <View className="gap-3 rounded-3xl bg-surface p-4">
      <Skeleton height={140} radius={16} />
      <Skeleton height={16} width="70%" />
      <Skeleton height={12} width="40%" />
    </View>
  );
}
