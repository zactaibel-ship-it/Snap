import { supabase } from '@/lib/supabase';
import type { Database, Recipe } from '@/lib/database.types';

type RecipeUpdate = Database['public']['Tables']['recipes']['Update'];

export async function getRecipes(userId: string): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getRecipeById(id: string): Promise<Recipe | null> {
  const { data, error } = await supabase.from('recipes').select('*').eq('id', id).maybeSingle();

  if (error) throw error;
  return data;
}

export async function getRecipesByIds(ids: string[]): Promise<Recipe[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('recipes').select('*').in('id', [...new Set(ids)]);

  if (error) throw error;
  return data ?? [];
}

export async function updateRecipe(id: string, updates: RecipeUpdate): Promise<Recipe> {
  const { data, error } = await supabase.from('recipes').update(updates).eq('id', id).select('*').single();

  if (error) throw error;
  return data;
}

export async function deleteRecipe(id: string): Promise<void> {
  const { error } = await supabase.from('recipes').delete().eq('id', id);
  if (error) throw error;
}
