import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { Recipe } from '@/lib/database.types';

interface ExtractRecipeFunctionResponse {
  recipe: Recipe;
  lowConfidence?: boolean;
}

const ERROR_MESSAGES: Record<string, string> = {
  unsupported_platform: 'Only YouTube, TikTok, and Instagram Reel links are supported right now.',
  invalid_url: "That doesn't look like a valid link. Check it and try again.",
  video_not_found: "We couldn't find that video. Double-check the link and try again.",
  not_a_recipe: "This doesn't look like a cooking video, so we couldn't extract a recipe from it.",
  extraction_failed: "We couldn't extract a recipe from this video. Please try again.",
  unauthorized: 'Your session has expired. Please sign in again.',
};

function mapErrorCode(code: string | undefined, fallback: string): string {
  if (!code) return fallback;
  return ERROR_MESSAGES[code] ?? fallback;
}

export async function extractRecipe(url: string, userId: string): Promise<{ recipe: Recipe; lowConfidence: boolean }> {
  const { data, error } = await supabase.functions.invoke<ExtractRecipeFunctionResponse>(
    'extract-recipe',
    { body: { url, user_id: userId } }
  );

  if (error) {
    let code: string | undefined;
    if (error instanceof FunctionsHttpError) {
      try {
        const body = await error.context.json();
        code = body?.error;
      } catch {
        // Response body wasn't JSON — no code to map, fall back to a generic message.
      }
    }
    throw new Error(mapErrorCode(code, error.message || 'Something went wrong. Please try again.'));
  }

  if (!data?.recipe) {
    throw new Error('Something went wrong. Please try again.');
  }

  return { recipe: data.recipe, lowConfidence: !!data.lowConfidence };
}
