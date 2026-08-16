import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

/** Invokes a Supabase edge function, mapping its `{ error: code }` body to a friendlier message where one is provided. */
export async function invokeFunction<T>(
  name: string,
  body: Record<string, unknown>,
  errorMessages: Record<string, string> = {}
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T & { error?: string }>(name, { body });

  if (error) {
    let code: string | undefined;
    if (error instanceof FunctionsHttpError) {
      try {
        const errorBody = await error.context.json();
        code = errorBody?.error;
      } catch {
        // Response body wasn't JSON — no code to map, fall back to a generic message.
      }
    }
    throw new Error((code && errorMessages[code]) || error.message || 'Something went wrong. Please try again.');
  }

  if (!data) throw new Error('No response received.');
  return data;
}
