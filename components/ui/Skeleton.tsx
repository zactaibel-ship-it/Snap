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

/** 2-column grid of grey rounded rectangles, shaped like RecipeCard's grid layout. */
export function RecipeGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View className="flex-row flex-wrap gap-3 px-5 pt-2">
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} className="w-[47%] gap-2 overflow-hidden rounded-3xl bg-surface p-0">
          <Skeleton height={140} radius={0} />
          <View className="gap-2 p-3">
            <Skeleton height={14} width="90%" />
            <Skeleton height={11} width="55%" />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Rows shaped like CreatorCard: a circular avatar with two lines of text beside it. */
export function CreatorListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View className="gap-3 px-5 pt-2">
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} className="flex-row items-center gap-3 rounded-2xl bg-surface p-3">
          <Skeleton width={48} height={48} radius={24} />
          <View className="flex-1 gap-2">
            <Skeleton height={14} width="60%" />
            <Skeleton height={11} width="35%" />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Rows shaped like ShoppingItem: a small checkbox with a text line beside it. */
export function ShoppingListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View className="gap-4 px-5 pt-3">
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} className="flex-row items-center gap-3">
          <Skeleton width={22} height={22} radius={11} />
          <Skeleton height={13} width={`${55 + ((index * 13) % 30)}%`} />
        </View>
      ))}
    </View>
  );
}

/** Grid of grey cells shaped like the meal planner's week grid (days x meal slots). */
export function MealPlanSkeleton({ days = 7, mealsPerDay = 3 }: { days?: number; mealsPerDay?: number }) {
  return (
    <View className="gap-2 px-5 pt-2">
      {Array.from({ length: days }).map((_, dayIndex) => (
        <View key={dayIndex} className="flex-row items-center gap-2">
          <Skeleton width={32} height={12} />
          <View className="flex-1 flex-row gap-2">
            {Array.from({ length: mealsPerDay }).map((_, mealIndex) => (
              <Skeleton key={mealIndex} height={56} radius={12} className="flex-1" />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
