import { supabase } from '@/lib/supabase';
import type { Database, Ingredient, Recipe, ShoppingListItem } from '@/lib/database.types';

type ShoppingListItemInsert = Database['public']['Tables']['shopping_list_items']['Insert'];

function itemKey(name: string, unit: string | null): string {
  return `${name.trim().toLowerCase()}::${(unit ?? '').trim().toLowerCase()}`;
}

export async function getShoppingListItems(userId: string): Promise<ShoppingListItem[]> {
  const { data, error } = await supabase
    .from('shopping_list_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function toggleShoppingItemChecked(id: string, checked: boolean): Promise<ShoppingListItem> {
  const { data, error } = await supabase
    .from('shopping_list_items')
    .update({ checked })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteShoppingListItem(id: string): Promise<void> {
  const { error } = await supabase.from('shopping_list_items').delete().eq('id', id);
  if (error) throw error;
}

export async function clearCompletedShoppingItems(userId: string): Promise<void> {
  const { error } = await supabase.from('shopping_list_items').delete().eq('user_id', userId).eq('checked', true);
  if (error) throw error;
}

export async function addManualShoppingItem(
  userId: string,
  input: { name: string; quantity: number | null; unit: string | null; aisle: string }
): Promise<ShoppingListItem> {
  const { data, error } = await supabase
    .from('shopping_list_items')
    .insert({
      user_id: userId,
      ingredient_name: input.name,
      quantity: input.quantity,
      unit: input.unit,
      aisle: input.aisle,
      checked: false,
      source_recipe_ids: [],
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

interface RecipeIngredients {
  recipeId: string;
  ingredients: Ingredient[];
}

/**
 * Merges one or more recipes' ingredients into the user's (unchecked)
 * shopping list in a single pass: quantities for an ingredient already on
 * the list are summed and the recipe is added to its source_recipe_ids,
 * otherwise a new item is inserted. Two recipes each needing 200g pasta
 * become one 400g pasta line.
 */
async function mergeIngredientsIntoShoppingList(
  userId: string,
  recipes: RecipeIngredients[]
): Promise<{ addedCount: number; mergedCount: number }> {
  const { data: existingItems, error: fetchError } = await supabase
    .from('shopping_list_items')
    .select('*')
    .eq('user_id', userId)
    .eq('checked', false);

  if (fetchError) throw fetchError;

  const byKey = new Map<string, ShoppingListItem | ShoppingListItemInsert>();
  for (const item of existingItems ?? []) {
    byKey.set(itemKey(item.ingredient_name, item.unit), { ...item });
  }

  const touchedKeys = new Set<string>();

  for (const { recipeId, ingredients } of recipes) {
    for (const ingredient of ingredients) {
      const key = itemKey(ingredient.name, ingredient.unit);
      const existing = byKey.get(key);
      touchedKeys.add(key);

      if (existing) {
        const sourceIds = existing.source_recipe_ids ?? [];
        existing.quantity =
          existing.quantity != null && ingredient.quantity != null
            ? existing.quantity + ingredient.quantity
            : (existing.quantity ?? ingredient.quantity);
        existing.source_recipe_ids = sourceIds.includes(recipeId) ? sourceIds : [...sourceIds, recipeId];
      } else {
        byKey.set(key, {
          user_id: userId,
          ingredient_name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          aisle: ingredient.aisle,
          checked: false,
          source_recipe_ids: [recipeId],
        });
      }
    }
  }

  const inserts: ShoppingListItemInsert[] = [];
  const updates: { id: string; quantity: number | null; source_recipe_ids: string[] }[] = [];

  for (const key of touchedKeys) {
    const item = byKey.get(key)!;
    if ('id' in item && item.id) {
      updates.push({ id: item.id, quantity: item.quantity ?? null, source_recipe_ids: item.source_recipe_ids ?? [] });
    } else {
      inserts.push(item as ShoppingListItemInsert);
    }
  }

  if (inserts.length > 0) {
    const { error: insertError } = await supabase.from('shopping_list_items').insert(inserts);
    if (insertError) throw insertError;
  }

  await Promise.all(
    updates.map(({ id, quantity, source_recipe_ids }) =>
      supabase
        .from('shopping_list_items')
        .update({ quantity, source_recipe_ids })
        .eq('id', id)
        .then(({ error }) => {
          if (error) throw error;
        })
    )
  );

  return { addedCount: inserts.length, mergedCount: updates.length };
}

export async function addRecipeIngredientsToShoppingList(
  userId: string,
  recipe: Recipe
): Promise<{ addedCount: number; mergedCount: number }> {
  return mergeIngredientsIntoShoppingList(userId, [{ recipeId: recipe.id, ingredients: recipe.ingredients }]);
}

export async function generateShoppingListFromRecipes(
  userId: string,
  recipes: Recipe[]
): Promise<{ addedCount: number; mergedCount: number }> {
  return mergeIngredientsIntoShoppingList(
    userId,
    recipes.map((recipe) => ({ recipeId: recipe.id, ingredients: recipe.ingredients }))
  );
}

/**
 * Untags a recipe from any shopping list items it contributed to; an item
 * with no remaining source recipes is removed entirely, otherwise it's left
 * in place (quantities aren't split back out per-recipe, so this can leave
 * a shared item's quantity slightly high rather than risk under-buying).
 */
export async function removeRecipeFromShoppingList(userId: string, recipeId: string): Promise<void> {
  const { data: items, error: fetchError } = await supabase
    .from('shopping_list_items')
    .select('*')
    .eq('user_id', userId)
    .contains('source_recipe_ids', [recipeId]);

  if (fetchError) throw fetchError;
  if (!items || items.length === 0) return;

  const toDelete: string[] = [];
  const toUpdate: { id: string; source_recipe_ids: string[] }[] = [];

  for (const item of items) {
    const remaining = item.source_recipe_ids.filter((id) => id !== recipeId);
    if (remaining.length === 0) {
      toDelete.push(item.id);
    } else {
      toUpdate.push({ id: item.id, source_recipe_ids: remaining });
    }
  }

  await Promise.all([
    toDelete.length > 0
      ? supabase
          .from('shopping_list_items')
          .delete()
          .in('id', toDelete)
          .then(({ error }) => {
            if (error) throw error;
          })
      : Promise.resolve(),
    ...toUpdate.map(({ id, source_recipe_ids }) =>
      supabase
        .from('shopping_list_items')
        .update({ source_recipe_ids })
        .eq('id', id)
        .then(({ error }) => {
          if (error) throw error;
        })
    ),
  ]);
}
