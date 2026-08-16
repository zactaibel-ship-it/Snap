import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addManualShoppingItem,
  addRecipeIngredientsToShoppingList,
  clearCompletedShoppingItems,
  deleteShoppingListItem,
  getShoppingListItems,
  removeRecipeFromShoppingList,
  toggleShoppingItemChecked,
} from '@/lib/api/shopping';
import { useAuth } from '@/hooks/useAuth';
import type { Recipe, ShoppingListItem } from '@/lib/database.types';

export function useShoppingListItems() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ['shopping-list', userId],
    queryFn: () => getShoppingListItems(userId!),
    enabled: !!userId,
  });
}

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

export function useToggleShoppingItem() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const listKey = ['shopping-list', session?.user.id];

  return useMutation({
    mutationFn: ({ id, checked }: { id: string; checked: boolean }) => toggleShoppingItemChecked(id, checked),
    onMutate: async ({ id, checked }) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<ShoppingListItem[]>(listKey);
      queryClient.setQueryData<ShoppingListItem[]>(listKey, (old) =>
        old?.map((item) => (item.id === id ? { ...item, checked } : item))
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(listKey, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
}

export function useDeleteShoppingListItem() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const listKey = ['shopping-list', session?.user.id];

  return useMutation({
    mutationFn: (id: string) => deleteShoppingListItem(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<ShoppingListItem[]>(listKey);
      queryClient.setQueryData<ShoppingListItem[]>(listKey, (old) => old?.filter((item) => item.id !== id));
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(listKey, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
}

export function useClearCompletedItems() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!session?.user) throw new Error('Not signed in.');
      return clearCompletedShoppingItems(session.user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
    },
  });
}

export function useAddManualShoppingItem() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { name: string; quantity: number | null; unit: string | null; aisle: string }) => {
      if (!session?.user) throw new Error('You need to be signed in to update your shopping list.');
      return addManualShoppingItem(session.user.id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
    },
  });
}

export function useRemoveRecipeFromShoppingList() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recipeId: string) => {
      if (!session?.user) throw new Error('Not signed in.');
      return removeRecipeFromShoppingList(session.user.id, recipeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list'] });
    },
  });
}
