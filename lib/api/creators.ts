import { supabase } from '@/lib/supabase';
import { invokeFunction } from '@/lib/api/invokeFunction';
import type { Database, FollowedCreator, Recipe } from '@/lib/database.types';

export interface YouTubeChannelInfo {
  id: string;
  title: string;
  handle: string | null;
  avatarUrl: string | null;
  subscriberCount: number | null;
}

/** Stats-mode results echo back the ref the caller requested (a channel ID or an @handle), since batched
 * lookups don't reliably return results in request order. */
export interface YouTubeChannelStats extends YouTubeChannelInfo {
  ref: string;
}

export type FollowedCreatorWithCount = FollowedCreator & { recipeCount: number };

export async function getFollowedCreators(userId: string): Promise<FollowedCreatorWithCount[]> {
  const [creatorsResult, recipesResult] = await Promise.all([
    supabase.from('followed_creators').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('recipes').select('followed_creator_id').eq('user_id', userId).not('followed_creator_id', 'is', null),
  ]);

  if (creatorsResult.error) throw creatorsResult.error;
  if (recipesResult.error) throw recipesResult.error;

  const recipeCounts = new Map<string, number>();
  for (const row of recipesResult.data ?? []) {
    const creatorId = row.followed_creator_id;
    if (!creatorId) continue;
    recipeCounts.set(creatorId, (recipeCounts.get(creatorId) ?? 0) + 1);
  }

  return (creatorsResult.data ?? []).map((creator) => ({
    ...creator,
    recipeCount: recipeCounts.get(creator.id) ?? 0,
  }));
}

export async function getFollowedCreatorById(id: string): Promise<FollowedCreator | null> {
  const { data, error } = await supabase.from('followed_creators').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getCreatorRecipes(creatorId: string): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('followed_creator_id', creatorId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function followCreator(
  input: Database['public']['Tables']['followed_creators']['Insert']
): Promise<FollowedCreator> {
  const { data, error } = await supabase.from('followed_creators').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function unfollowCreator(id: string): Promise<void> {
  const { error } = await supabase.from('followed_creators').delete().eq('id', id);
  if (error) throw error;
}

export async function setAutoImport(id: string, autoImport: boolean): Promise<FollowedCreator> {
  const { data, error } = await supabase
    .from('followed_creators')
    .update({ auto_import: autoImport })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function searchYouTubeCreators(query: string): Promise<YouTubeChannelInfo[]> {
  const result = await invokeFunction<{ channels: YouTubeChannelInfo[] }>('search-creators', {
    mode: 'search',
    query,
  });
  return result.channels;
}

export async function getYouTubeCreatorStats(channelRefs: string[]): Promise<YouTubeChannelStats[]> {
  if (channelRefs.length === 0) return [];
  const result = await invokeFunction<{ channels: YouTubeChannelStats[] }>('search-creators', {
    mode: 'stats',
    channels: channelRefs,
  });
  return result.channels;
}

export async function triggerCreatorImport(
  creatorId: string,
  userId: string,
  maxVideos = 5
): Promise<{ imported: number; recipes: Recipe[] }> {
  return invokeFunction('import-creator-recipes', { creator_id: creatorId, user_id: userId, max_videos: maxVideos });
}
