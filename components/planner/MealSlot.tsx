import { forwardRef } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, type SharedValue } from 'react-native-reanimated';

import type { MealPlanSlot, MealType, Recipe } from '@/lib/database.types';

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

interface MealSlotProps {
  slot?: MealPlanSlot;
  recipe?: Recipe;
  mealType: MealType;
  isDragSource: boolean;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  onLayoutCell: (event: LayoutChangeEvent) => void;
  onPressEmpty: () => void;
  onPressFilled: (slot: MealPlanSlot) => void;
  onDragStart: (slot: MealPlanSlot) => void;
  onDragEnd: (slot: MealPlanSlot, absoluteX: number, absoluteY: number) => void;
}

export const MealSlot = forwardRef<View, MealSlotProps>(function MealSlot(
  {
    slot,
    recipe,
    mealType,
    isDragSource,
    translateX,
    translateY,
    onLayoutCell,
    onPressEmpty,
    onPressFilled,
    onDragStart,
    onDragEnd,
  },
  ref
) {
  const isFilled = !!slot && !!recipe;

  const tap = Gesture.Tap().onEnd(() => {
    if (slot) runOnJS(onPressFilled)(slot);
  });

  const pan = Gesture.Pan()
    .activateAfterLongPress(350)
    .onStart(() => {
      translateX.value = 0;
      translateY.value = 0;
      if (slot) runOnJS(onDragStart)(slot);
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (slot) runOnJS(onDragEnd)(slot, event.absoluteX, event.absoluteY);
    });

  const gesture = Gesture.Race(pan, tap);

  if (!isFilled) {
    return (
      <Pressable
        ref={ref}
        onLayout={onLayoutCell}
        onPress={onPressEmpty}
        accessibilityRole="button"
        accessibilityLabel={`Add a recipe for ${MEAL_TYPE_LABELS[mealType]}`}
        className="aspect-square flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-surface/60"
      >
        <Ionicons name="add" size={13} color="#6B7280" />
      </Pressable>
    );
  }

  return (
    <View ref={ref} onLayout={onLayoutCell} className="aspect-square flex-1 overflow-hidden rounded-lg bg-border">
      <GestureDetector gesture={gesture}>
        <View
          accessible
          accessibilityRole="button"
          accessibilityLabel={`${recipe.title}, ${MEAL_TYPE_LABELS[mealType]}`}
          accessibilityHint="Double tap to view recipe. Long-press and drag to move."
          className={`h-full w-full ${isDragSource ? 'opacity-30' : ''}`}
        >
          {recipe.thumbnail_url ? (
            <Image source={{ uri: recipe.thumbnail_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
          ) : (
            <View className="h-full w-full items-center justify-center bg-primary/10">
              <Ionicons name="restaurant-outline" size={13} color="#1B4332" />
            </View>
          )}
          <View className="absolute inset-x-0 bottom-0 bg-black/55 px-0.5 py-0.5">
            <Text numberOfLines={1} style={{ fontSize: 8 }} className="font-medium text-white">
              {recipe.title}
            </Text>
          </View>
        </View>
      </GestureDetector>
    </View>
  );
});
