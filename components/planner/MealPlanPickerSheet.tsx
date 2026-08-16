import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { useAddRecipeToSlot, useMealPlanSlots, useWeekPlan } from '@/hooks/usePlanner';
import { getCurrentWeekStartDate } from '@/lib/api/planner';
import type { MealType } from '@/lib/database.types';

const DAYS: { label: string; value: number }[] = [
  { label: 'Monday', value: 0 },
  { label: 'Tuesday', value: 1 },
  { label: 'Wednesday', value: 2 },
  { label: 'Thursday', value: 3 },
  { label: 'Friday', value: 4 },
  { label: 'Saturday', value: 5 },
  { label: 'Sunday', value: 6 },
];

const MEAL_TYPES: { label: string; value: MealType }[] = [
  { label: 'Breakfast', value: 'breakfast' },
  { label: 'Lunch', value: 'lunch' },
  { label: 'Dinner', value: 'dinner' },
];

interface MealPlanPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  recipeId: string;
}

export function MealPlanPickerSheet({ visible, onClose, recipeId }: MealPlanPickerSheetProps) {
  const { data: mealPlan } = useWeekPlan(getCurrentWeekStartDate(), visible);
  const { data: slots } = useMealPlanSlots(mealPlan?.id);
  const { mutateAsync, isPending } = useAddRecipeToSlot(mealPlan?.id);
  const [selected, setSelected] = useState<{ day: number; mealType: MealType } | null>(null);

  const isFilled = (day: number, mealType: MealType) =>
    slots?.some((slot) => slot.day_of_week === day && slot.meal_type === mealType) ?? false;

  const handleClose = () => {
    setSelected(null);
    onClose();
  };

  const handleConfirm = async () => {
    if (!selected) return;
    try {
      await mutateAsync({ dayOfWeek: selected.day, mealType: selected.mealType, recipeId });
      handleClose();
    } catch (error) {
      Alert.alert('Something went wrong', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <Sheet visible={visible} onClose={handleClose}>
      <View className="gap-5 pb-2">
        <View className="gap-1">
          <Text className="text-xl font-bold text-text">Add to meal plan</Text>
          <Text className="text-sm text-text-muted">Pick a day and meal for this week.</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} className="max-h-96">
          <View className="gap-3">
            {DAYS.map((day) => (
              <View key={day.value} className="gap-1.5">
                <Text className="text-xs font-medium uppercase text-text-muted">{day.label}</Text>
                <View className="flex-row gap-2">
                  {MEAL_TYPES.map((mealType) => {
                    const filled = isFilled(day.value, mealType.value);
                    const isSelected = selected?.day === day.value && selected.mealType === mealType.value;

                    return (
                      <Pressable
                        key={mealType.value}
                        onPress={() => setSelected({ day: day.value, mealType: mealType.value })}
                        className={`flex-1 items-center rounded-2xl border px-2 py-2.5 ${
                          isSelected
                            ? 'border-primary bg-primary'
                            : filled
                              ? 'border-accent bg-accent/10'
                              : 'border-border bg-surface'
                        }`}
                      >
                        <Text
                          className={`text-xs font-medium ${
                            isSelected ? 'text-white' : filled ? 'text-primary' : 'text-text'
                          }`}
                        >
                          {mealType.label}
                        </Text>
                        {filled && !isSelected ? <Text className="text-[10px] text-primary">Filled</Text> : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <Button label="Add to plan" onPress={handleConfirm} disabled={!selected} loading={isPending} />
      </View>
    </Sheet>
  );
}
