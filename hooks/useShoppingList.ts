import { useMutation, useQueryClient } from '@tanstack/react-query';

import { addRecipeIngredientsToShoppingList } from '@/lib/api/shopping';
import { useAuth } from '@/hooks/useAuth';
import type { Recipe } from '@/lib/database.types';

export function useAddRecipeToShoppingList() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recipe: Recipe) => {
      if (!session?.user) throw new Error('You need to be signed in to update your shopping list.');
      return addRecipeIngredientsToShoppingList(session.user.id, recipe);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
    },
  });
}
