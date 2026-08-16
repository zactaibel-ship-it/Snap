import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ExtractionLimitError, extractRecipe } from '@/lib/api/extract';
import { deleteRecipe, getRecipeById, getRecipes, updateRecipe } from '@/lib/api/recipes';
import { useAuth } from '@/hooks/useAuth';
import { haptics } from '@/lib/haptics';
import { useExtractionStore } from '@/stores/extractionStore';
import { usePaywallStore } from '@/stores/paywallStore';
import { useUndoStore } from '@/stores/undoStore';
import type { Database, Recipe } from '@/lib/database.types';

type RecipeUpdate = Database['public']['Tables']['recipes']['Update'];

const RECIPE_STALE_TIME = 1000 * 60 * 5;

export function useRecipes() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ['recipes', userId],
    queryFn: () => getRecipes(userId!),
    enabled: !!userId,
    staleTime: RECIPE_STALE_TIME,
  });
}

export function useRecipe(id: string | undefined) {
  return useQuery({
    queryKey: ['recipe', id],
    queryFn: () => getRecipeById(id!),
    enabled: !!id,
    staleTime: RECIPE_STALE_TIME,
  });
}

export function useExtractRecipe() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const start = useExtractionStore((state) => state.start);
  const setStatus = useExtractionStore((state) => state.setStatus);
  const setError = useExtractionStore((state) => state.setError);
  const reset = useExtractionStore((state) => state.reset);

  return useMutation({
    mutationFn: async (url: string) => {
      if (!session?.user) throw new Error('You need to be signed in to add a recipe.');

      start(url);

      // The edge function is a single request/response — these timers advance
      // the loader through realistic steps while that call is in flight.
      const toTranscribing = setTimeout(() => setStatus('transcribing'), 1800);
      const toExtracting = setTimeout(() => setStatus('extracting'), 4500);

      try {
        const result = await extractRecipe(url, session.user.id);
        setStatus('saving');
        return result;
      } finally {
        clearTimeout(toTranscribing);
        clearTimeout(toExtracting);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      haptics.success();
      reset();
    },
    onError: (error: Error) => {
      if (error instanceof ExtractionLimitError) {
        haptics.warning();
        reset();
        usePaywallStore.getState().open('extraction_limit');
        return;
      }
      haptics.error();
      setError(error.message);
    },
  });
}

interface UpdateRecipeContext {
  previousRecipe: Recipe | null | undefined;
  previousLists: [readonly unknown[], Recipe[] | undefined][];
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient();

  return useMutation<Recipe, Error, { id: string; updates: RecipeUpdate }, UpdateRecipeContext>({
    mutationFn: ({ id, updates }) => updateRecipe(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['recipe', id] });

      const previousRecipe = queryClient.getQueryData<Recipe | null>(['recipe', id]);
      const previousLists = queryClient.getQueriesData<Recipe[]>({ queryKey: ['recipes'] });

      if (previousRecipe) {
        queryClient.setQueryData(['recipe', id], { ...previousRecipe, ...updates });
      }
      queryClient.setQueriesData<Recipe[]>({ queryKey: ['recipes'] }, (old) =>
        old?.map((recipe) => (recipe.id === id ? { ...recipe, ...updates } : recipe))
      );

      return { previousRecipe, previousLists };
    },
    onError: (_error, { id }, context) => {
      if (!context) return;
      queryClient.setQueryData(['recipe', id], context.previousRecipe);
      context.previousLists.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['recipe', id] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}

/**
 * Optimistically removes a recipe and schedules the actual Supabase delete
 * 5 seconds out via the global undo toast — call the returned function, then
 * either the user taps Undo (restoring the cache) or the timer commits it.
 */
export function useDeleteRecipeWithUndo() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const show = useUndoStore((state) => state.show);
  const userId = session?.user.id;

  return useCallback(
    (recipe: Recipe) => {
      const listKey = ['recipes', userId];
      queryClient.setQueryData<Recipe[]>(listKey, (old) => old?.filter((item) => item.id !== recipe.id) ?? []);
      queryClient.setQueryData(['recipe', recipe.id], null);

      show({
        id: recipe.id,
        message: 'Recipe deleted',
        onUndo: () => {
          queryClient.setQueryData<Recipe[]>(listKey, (old) => {
            const withoutDuplicate = old?.filter((item) => item.id !== recipe.id) ?? [];
            return [...withoutDuplicate, recipe].sort((a, b) => b.created_at.localeCompare(a.created_at));
          });
          queryClient.setQueryData(['recipe', recipe.id], recipe);
        },
        onCommit: async () => {
          try {
            await deleteRecipe(recipe.id);
          } catch {
            // The delete failed server-side — resync from the server rather
            // than leave the client believing it succeeded.
            queryClient.invalidateQueries({ queryKey: ['recipes'] });
          }
        },
      });
    },
    [queryClient, show, userId]
  );
}
