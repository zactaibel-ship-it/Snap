import { supabase } from '@/lib/supabase';
import type { MealPlan, MealPlanSlot, MealType } from '@/lib/database.types';

/** Returns the ISO date (YYYY-MM-DD) of the Monday of the week containing `reference`. */
export function getMondayOfWeek(reference: Date): string {
  const day = reference.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(reference);
  monday.setDate(reference.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

export function getCurrentWeekStartDate(): string {
  return getMondayOfWeek(new Date());
}

/** e.g. "Mon 14 – Sun 20 Aug" (or "Mon 28 Jul – Sun 3 Aug" across a month boundary). */
export function formatWeekRangeLabel(weekStartDate: string): string {
  const start = new Date(`${weekStartDate}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const dayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric' });
  const monthFormat = new Intl.DateTimeFormat('en-GB', { month: 'short' });

  const startLabel = dayFormat.format(start);
  const endLabel = dayFormat.format(end);

  return start.getMonth() === end.getMonth()
    ? `${startLabel} – ${endLabel} ${monthFormat.format(end)}`
    : `${startLabel} ${monthFormat.format(start)} – ${endLabel} ${monthFormat.format(end)}`;
}

export async function getOrCreateWeekPlan(userId: string, weekStartDate: string): Promise<MealPlan> {
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

export async function removeMealSlot(slotId: string): Promise<void> {
  const { error } = await supabase.from('meal_plan_slots').delete().eq('id', slotId);
  if (error) throw error;
}

/**
 * Moves a filled slot to another day/meal-type. If the destination is empty,
 * the slot's own day/meal-type is updated in place. If it's already filled,
 * the two slots swap recipes instead of one silently overwriting the other.
 */
export async function moveMealSlot(
  mealPlanId: string,
  from: MealPlanSlot,
  to: { dayOfWeek: number; mealType: MealType }
): Promise<void> {
  if (from.day_of_week === to.dayOfWeek && from.meal_type === to.mealType) return;

  const { data: destinationSlot, error: fetchError } = await supabase
    .from('meal_plan_slots')
    .select('*')
    .eq('meal_plan_id', mealPlanId)
    .eq('day_of_week', to.dayOfWeek)
    .eq('meal_type', to.mealType)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (!destinationSlot) {
    const { error } = await supabase
      .from('meal_plan_slots')
      .update({ day_of_week: to.dayOfWeek, meal_type: to.mealType })
      .eq('id', from.id);
    if (error) throw error;
    return;
  }

  const [{ error: fromError }, { error: toError }] = await Promise.all([
    supabase.from('meal_plan_slots').update({ recipe_id: destinationSlot.recipe_id }).eq('id', from.id),
    supabase.from('meal_plan_slots').update({ recipe_id: from.recipe_id }).eq('id', destinationSlot.id),
  ]);

  if (fromError) throw fromError;
  if (toError) throw toError;
}
