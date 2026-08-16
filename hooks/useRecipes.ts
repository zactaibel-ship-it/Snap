import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { extractRecipe } from '@/lib/api/extract';
import { getRecipeById, getRecipes } from '@/lib/api/recipes';
import { useAuth } from '@/hooks/useAuth';
import { useExtractionStore } from '@/stores/extractionStore';

export function useRecipes() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ['recipes', userId],
    queryFn: () => getRecipes(userId!),
    enabled: !!userId,
  });
}

export function useRecipe(id: string | undefined) {
  return useQuery({
    queryKey: ['recipe', id],
    queryFn: () => getRecipeById(id!),
    enabled: !!id,
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
      reset();
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });
}
