import { supabase } from '@/lib/supabase';
import type { MealPlan, MealPlanSlot, MealType } from '@/lib/database.types';

function getMondayOfCurrentWeek(): string {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

export async function getOrCreateCurrentWeekPlan(userId: string): Promise<MealPlan> {
  const weekStartDate = getMondayOfCurrentWeek();

  const { data: existing, error: fetchError } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start_date', weekStartDate)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (existing) return existing;

  const { data: created, error: insertError } = await supabase
    .from('meal_plans')
    .insert({ user_id: userId, week_start_date: weekStartDate })
    .select('*')
    .single();

  if (insertError) throw insertError;
  return created;
}

export async function getMealPlanSlots(mealPlanId: string): Promise<MealPlanSlot[]> {
  const { data, error } = await supabase
    .from('meal_plan_slots')
    .select('*')
    .eq('meal_plan_id', mealPlanId);

  if (error) throw error;
  return data ?? [];
}

export async function addRecipeToSlot(
  mealPlanId: string,
  dayOfWeek: number,
  mealType: MealType,
  recipeId: string
): Promise<MealPlanSlot> {
  const { data, error } = await supabase
    .from('meal_plan_slots')
    .upsert(
      { meal_plan_id: mealPlanId, day_of_week: dayOfWeek, meal_type: mealType, recipe_id: recipeId },
      { onConflict: 'meal_plan_id,day_of_week,meal_type' }
    )
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
