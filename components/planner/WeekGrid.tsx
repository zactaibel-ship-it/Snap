import { useRef, useState } from 'react';
import { Alert, Modal, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { MEAL_TYPE_LABELS, MealSlot } from '@/components/planner/MealSlot';
import { ActionSheet } from '@/components/ui/ActionSheet';
import { useMoveMealSlot, useRemoveMealSlot } from '@/hooks/usePlanner';
import { useRemoveRecipeFromShoppingList } from '@/hooks/useShoppingList';
import type { MealPlanSlot, MealType, Recipe } from '@/lib/database.types';

const DAYS: { label: string; value: number }[] = [
  { label: 'Mon', value: 0 },
  { label: 'Tue', value: 1 },
  { label: 'Wed', value: 2 },
  { label: 'Thu', value: 3 },
  { label: 'Fri', value: 4 },
  { label: 'Sat', value: 5 },
  { label: 'Sun', value: 6 },
];

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner'];

const LABEL_WIDTH = 34;

interface CellBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DragState {
  slot: MealPlanSlot;
  recipe: Recipe;
  bounds: CellBounds;
}

interface WeekGridProps {
  mealPlanId: string | undefined;
  slots: MealPlanSlot[];
  recipesById: Map<string, Recipe>;
  onPressEmptySlot: (dayOfWeek: number, mealType: MealType) => void;
}

function cellKey(dayOfWeek: number, mealType: MealType): string {
  return `${dayOfWeek}-${mealType}`;
}

export function WeekGrid({ mealPlanId, slots, recipesById, onPressEmptySlot }: WeekGridProps) {
  const cellRefs = useRef<Record<string, View | null>>({});
  const cellBounds = useRef<Record<string, CellBounds>>({});
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [actionSheetSlot, setActionSheetSlot] = useState<MealPlanSlot | null>(null);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const removeMealSlot = useRemoveMealSlot(mealPlanId);
  const moveMealSlot = useMoveMealSlot(mealPlanId);
  const removeRecipeFromShoppingList = useRemoveRecipeFromShoppingList();

  const ghostStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  const measureCell = (key: string) => {
    cellRefs.current[key]?.measureInWindow((x, y, width, height) => {
      cellBounds.current[key] = { x, y, width, height };
    });
  };

  const findDropTarget = (x: number, y: number): { dayOfWeek: number; mealType: MealType } | null => {
    for (const [key, bounds] of Object.entries(cellBounds.current)) {
      if (x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height) {
        const [day, mealType] = key.split('-');
        return { dayOfWeek: Number(day), mealType: mealType as MealType };
      }
    }
    return null;
  };

  const handleDragStart = (slot: MealPlanSlot) => {
    const recipe = recipesById.get(slot.recipe_id);
    const bounds = cellBounds.current[cellKey(slot.day_of_week, slot.meal_type)];
    if (!recipe || !bounds) return;
    setDragging({ slot, recipe, bounds });
  };

  const handleDragEnd = (slot: MealPlanSlot, absoluteX: number, absoluteY: number) => {
    const target = findDropTarget(absoluteX, absoluteY);
    if (target && (target.dayOfWeek !== slot.day_of_week || target.mealType !== slot.meal_type)) {
      moveMealSlot.mutate({ from: slot, to: target });
    }
    setDragging(null);
  };

  const activeRecipe = actionSheetSlot ? recipesById.get(actionSheetSlot.recipe_id) : undefined;

  const handleRemoveSlot = (slot: MealPlanSlot) => {
    removeMealSlot.mutate(slot.id);
    Alert.alert('Remove ingredients too?', 'You can also remove this recipe’s ingredients from your shopping list.', [
      { text: 'Keep in list', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeRecipeFromShoppingList.mutate(slot.recipe_id) },
    ]);
  };

  return (
    <View className="gap-1.5">
      <View className="flex-row">
        <View style={{ width: LABEL_WIDTH }} />
        {DAYS.map((day) => (
          <View key={day.value} className="flex-1 items-center">
            <Text className="text-[10px] font-semibold uppercase text-text-muted">{day.label}</Text>
          </View>
        ))}
      </View>

      {MEAL_TYPES.map((mealType) => (
        <View key={mealType} className="flex-row items-center gap-1">
          <View style={{ width: LABEL_WIDTH }}>
            <Text numberOfLines={1} className="text-[9px] font-medium text-text-muted">
              {MEAL_TYPE_LABELS[mealType].slice(0, 3)}
            </Text>
          </View>
          {DAYS.map((day) => {
            const key = cellKey(day.value, mealType);
            const slot = slots.find((s) => s.day_of_week === day.value && s.meal_type === mealType);
            const recipe = slot ? recipesById.get(slot.recipe_id) : undefined;

            return (
              <View key={key} className="flex-1 px-0.5">
                <MealSlot
                  ref={(node) => {
                    cellRefs.current[key] = node;
                  }}
                  slot={slot}
                  recipe={recipe}
                  mealType={mealType}
                  isDragSource={dragging?.slot.id === slot?.id && !!slot}
                  translateX={translateX}
                  translateY={translateY}
                  onLayoutCell={() => measureCell(key)}
                  onPressEmpty={() => onPressEmptySlot(day.value, mealType)}
                  onPressFilled={setActionSheetSlot}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
              </View>
            );
          })}
        </View>
      ))}

      <Modal transparent visible={!!dragging} animationType="none">
        <View pointerEvents="none" style={{ flex: 1 }}>
          {dragging ? (
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  left: dragging.bounds.x,
                  top: dragging.bounds.y,
                  width: dragging.bounds.width,
                  height: dragging.bounds.height,
                  borderRadius: 8,
                  overflow: 'hidden',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                },
                ghostStyle,
              ]}
            >
              {dragging.recipe.thumbnail_url ? (
                <Image source={{ uri: dragging.recipe.thumbnail_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <View className="h-full w-full items-center justify-center bg-primary/20" />
              )}
            </Animated.View>
          ) : null}
        </View>
      </Modal>

      <ActionSheet
        visible={!!actionSheetSlot}
        onClose={() => setActionSheetSlot(null)}
        title={activeRecipe?.title}
        options={
          actionSheetSlot
            ? [
                {
                  label: 'View Recipe',
                  icon: 'restaurant-outline',
                  onPress: () => router.push(`/recipe/${actionSheetSlot.recipe_id}`),
                },
                {
                  label: 'Remove from Plan',
                  icon: 'trash-outline',
                  destructive: true,
                  onPress: () => handleRemoveSlot(actionSheetSlot),
                },
              ]
            : []
        }
      />
    </View>
  );
}
