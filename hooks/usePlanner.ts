import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { addRecipeToSlot, getMealPlanSlots, getOrCreateCurrentWeekPlan } from '@/lib/api/planner';
import { useAuth } from '@/hooks/useAuth';
import type { MealType } from '@/lib/database.types';

/**
 * `enabled` defaults to true but should be passed as false until the caller
 * actually needs the plan (e.g. a picker sheet isn't open yet) — this query
 * creates the week's meal plan row if it doesn't exist yet, so firing it
 * eagerly would create empty meal plans just from mounting a component.
 */
export function useCurrentWeekPlan(enabled = true) {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ['meal-plan', 'current-week', userId],
    queryFn: () => getOrCreateCurrentWeekPlan(userId!),
    enabled: enabled && !!userId,
  });
}

export function useMealPlanSlots(mealPlanId: string | undefined) {
  return useQuery({
    queryKey: ['meal-plan-slots', mealPlanId],
    queryFn: () => getMealPlanSlots(mealPlanId!),
    enabled: !!mealPlanId,
  });
}

export function useAddRecipeToMealPlan(mealPlanId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dayOfWeek, mealType, recipeId }: { dayOfWeek: number; mealType: MealType; recipeId: string }) => {
      if (!mealPlanId) throw new Error('Your meal plan is still loading. Please try again.');
      return addRecipeToSlot(mealPlanId, dayOfWeek, mealType, recipeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan-slots', mealPlanId] });
    },
  });
}
