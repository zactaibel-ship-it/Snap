import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addRecipeToSlot,
  getMealPlanSlots,
  getOrCreateWeekPlan,
  moveMealSlot,
  removeMealSlot,
} from '@/lib/api/planner';
import { getRecipes, getRecipesByIds } from '@/lib/api/recipes';
import { generateShoppingListFromRecipes } from '@/lib/api/shopping';
import { useAuth } from '@/hooks/useAuth';
import type { MealPlanSlot, MealType } from '@/lib/database.types';

const DAYS_OF_WEEK = [0, 1, 2, 3, 4, 5, 6];

/**
 * `enabled` defaults to true but should be passed as false until the caller
 * actually needs the plan (e.g. a picker sheet isn't open yet) — this query
 * creates the week's meal plan row if it doesn't exist yet, so firing it
 * eagerly would create empty meal plans just from mounting a component.
 */
export function useWeekPlan(weekStartDate: string, enabled = true) {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ['meal-plan', userId, weekStartDate],
    queryFn: () => getOrCreateWeekPlan(userId!, weekStartDate),
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

export function useAddRecipeToSlot(mealPlanId: string | undefined) {
  const queryClient = useQueryClient();
  const slotsKey = ['meal-plan-slots', mealPlanId];

  return useMutation({
    mutationFn: async ({ dayOfWeek, mealType, recipeId }: { dayOfWeek: number; mealType: MealType; recipeId: string }) => {
      if (!mealPlanId) throw new Error('Your meal plan is still loading. Please try again.');
      return addRecipeToSlot(mealPlanId, dayOfWeek, mealType, recipeId);
    },
    onMutate: async ({ dayOfWeek, mealType, recipeId }) => {
      if (!mealPlanId) return undefined;
      await queryClient.cancelQueries({ queryKey: slotsKey });
      const previous = queryClient.getQueryData<MealPlanSlot[]>(slotsKey);

      queryClient.setQueryData<MealPlanSlot[]>(slotsKey, (old) => {
        const withoutTarget = (old ?? []).filter(
          (slot) => !(slot.day_of_week === dayOfWeek && slot.meal_type === mealType)
        );
        return [
          ...withoutTarget,
          {
            id: `optimistic-${dayOfWeek}-${mealType}`,
            meal_plan_id: mealPlanId,
            day_of_week: dayOfWeek,
            meal_type: mealType,
            recipe_id: recipeId,
          },
        ];
      });

      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(slotsKey, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: slotsKey });
    },
  });
}

export function useRemoveMealSlot(mealPlanId: string | undefined) {
  const queryClient = useQueryClient();
  const slotsKey = ['meal-plan-slots', mealPlanId];

  return useMutation({
    mutationFn: (slotId: string) => removeMealSlot(slotId),
    onMutate: async (slotId) => {
      await queryClient.cancelQueries({ queryKey: slotsKey });
      const previous = queryClient.getQueryData<MealPlanSlot[]>(slotsKey);
      queryClient.setQueryData<MealPlanSlot[]>(slotsKey, (old) => old?.filter((slot) => slot.id !== slotId));
      return { previous };
    },
    onError: (_error, _slotId, context) => {
      if (context?.previous) queryClient.setQueryData(slotsKey, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: slotsKey });
    },
  });
}

export function useMoveMealSlot(mealPlanId: string | undefined) {
  const queryClient = useQueryClient();
  const slotsKey = ['meal-plan-slots', mealPlanId];

  return useMutation({
    mutationFn: ({ from, to }: { from: MealPlanSlot; to: { dayOfWeek: number; mealType: MealType } }) => {
      if (!mealPlanId) throw new Error('Your meal plan is still loading. Please try again.');
      return moveMealSlot(mealPlanId, from, to);
    },
    onMutate: async ({ from, to }) => {
      await queryClient.cancelQueries({ queryKey: slotsKey });
      const previous = queryClient.getQueryData<MealPlanSlot[]>(slotsKey);

      queryClient.setQueryData<MealPlanSlot[]>(slotsKey, (old) => {
        if (!old) return old;
        const destination = old.find((slot) => slot.day_of_week === to.dayOfWeek && slot.meal_type === to.mealType);

        if (!destination) {
          return old.map((slot) =>
            slot.id === from.id ? { ...slot, day_of_week: to.dayOfWeek, meal_type: to.mealType } : slot
          );
        }

        return old.map((slot) => {
          if (slot.id === from.id) return { ...slot, recipe_id: destination.recipe_id };
          if (slot.id === destination.id) return { ...slot, recipe_id: from.recipe_id };
          return slot;
        });
      });

      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(slotsKey, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: slotsKey });
    },
  });
}

/** Auto-fills empty dinner slots for the week with random uncooked (unrated) recipes, preferring ones matching the user's dietary preferences. */
export function useFillWeek(mealPlanId: string | undefined) {
  const { session, profile } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: async () => {
      if (!mealPlanId || !userId) throw new Error('Your meal plan is still loading. Please try again.');

      const [allRecipes, slots] = await Promise.all([getRecipes(userId), getMealPlanSlots(mealPlanId)]);

      const filledDinnerDays = new Set(slots.filter((slot) => slot.meal_type === 'dinner').map((slot) => slot.day_of_week));
      const emptyDinnerDays = DAYS_OF_WEEK.filter((day) => !filledDinnerDays.has(day));
      if (emptyDinnerDays.length === 0) return { filled: 0 };

      const uncooked = allRecipes.filter((recipe) => recipe.rating == null);
      const preferences = profile?.dietary_preferences ?? [];
      const matchingPreferences =
        preferences.length > 0
          ? uncooked.filter((recipe) => preferences.every((pref) => recipe.dietary_tags.includes(pref)))
          : uncooked;
      const pool = matchingPreferences.length > 0 ? matchingPreferences : uncooked.length > 0 ? uncooked : allRecipes;
      if (pool.length === 0) return { filled: 0 };

      const shuffled = [...pool].sort(() => Math.random() - 0.5);

      let filled = 0;
      for (const day of emptyDinnerDays) {
        const recipe = shuffled[filled % shuffled.length];
        await addRecipeToSlot(mealPlanId, day, 'dinner', recipe.id);
        filled += 1;
      }

      return { filled };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan-slots', mealPlanId] });
    },
  });
}

/** Merges every planned recipe's ingredients into the shopping list. */
export function useGenerateShoppingList(mealPlanId: string | undefined) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: async () => {
      if (!mealPlanId || !userId) throw new Error('Your meal plan is still loading. Please try again.');

      const slots = await getMealPlanSlots(mealPlanId);
      const recipeIds = [...new Set(slots.map((slot) => slot.recipe_id))];
      if (recipeIds.length === 0) return { addedCount: 0, mergedCount: 0 };

      const recipes = await getRecipesByIds(recipeIds);
      return generateShoppingListFromRecipes(userId, recipes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
    },
  });
}
