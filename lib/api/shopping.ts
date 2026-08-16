import { supabase } from '@/lib/supabase';
import type { Database, Recipe, ShoppingListItem } from '@/lib/database.types';

type ShoppingListItemInsert = Database['public']['Tables']['shopping_list_items']['Insert'];

function itemKey(name: string, unit: string | null): string {
  return `${name.trim().toLowerCase()}::${(unit ?? '').trim().toLowerCase()}`;
}

/**
 * Merges a recipe's ingredients into the user's shopping list: quantities for
 * an ingredient already on the (unchecked) list are summed and the recipe is
 * added to its source_recipe_ids, otherwise a new item is inserted.
 */
export async function addRecipeIngredientsToShoppingList(
  userId: string,
  recipe: Recipe
): Promise<{ addedCount: number; mergedCount: number }> {
  const { data: existingItems, error: fetchError } = await supabase
    .from('shopping_list_items')
    .select('*')
    .eq('user_id', userId)
    .eq('checked', false);

  if (fetchError) throw fetchError;

  const existingByKey = new Map<string, ShoppingListItem>();
  for (const item of existingItems ?? []) {
    existingByKey.set(itemKey(item.ingredient_name, item.unit), item);
  }

  const updates: { id: string; quantity: number | null; source_recipe_ids: string[] }[] = [];
  const inserts: ShoppingListItemInsert[] = [];

  for (const ingredient of recipe.ingredients) {
    const key = itemKey(ingredient.name, ingredient.unit);
    const existing = existingByKey.get(key);

    if (existing) {
      const alreadyLinked = existing.source_recipe_ids.includes(recipe.id);
      updates.push({
        id: existing.id,
        quantity:
          existing.quantity != null && ingredient.quantity != null
            ? existing.quantity + ingredient.quantity
            : (existing.quantity ?? ingredient.quantity),
        source_recipe_ids: alreadyLinked
          ? existing.source_recipe_ids
          : [...existing.source_recipe_ids, recipe.id],
      });
    } else {
      inserts.push({
        user_id: userId,
        ingredient_name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        aisle: ingredient.aisle,
        checked: false,
        source_recipe_ids: [recipe.id],
      });
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
