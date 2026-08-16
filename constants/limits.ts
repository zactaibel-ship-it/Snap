/** Mirrors FREE_MONTHLY_EXTRACTION_LIMIT in supabase/functions/extract-recipe — kept in
 * sync manually since edge functions run in a separate Deno module graph. */
export const FREE_EXTRACTION_LIMIT = 10;

export const FREE_CREATOR_FOLLOW_LIMIT = 3;

/** Mirrors the reset check in extract-recipe: a stale reset_date means this month hasn't used any extractions yet. */
export function getEffectiveExtractionCount(extractionCount: number, extractionResetDate: string | null): number {
  const now = new Date();
  const monthStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
  return extractionResetDate === monthStart ? extractionCount : 0;
}
