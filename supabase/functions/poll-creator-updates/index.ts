// Supabase Edge Function: poll-creator-updates
//
// Scheduled (configure in the Supabase dashboard: every 6 hours). Checks
// every auto-import-enabled followed creator that's due, imports any videos
// published since it was last checked, and pushes a notification to the
// follower.
//
// Required secrets: YOUTUBE_DATA_API_KEY
// Auto-provided: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'npm:@supabase/supabase-js@2';

import { CORS_HEADERS, jsonResponse } from '../_shared/cors.ts';
import { sendExpoPushNotification } from '../_shared/push.ts';
import { getChannelRecentVideos } from '../_shared/youtube.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const YOUTUBE_DATA_API_KEY = Deno.env.get('YOUTUBE_DATA_API_KEY') ?? '';

const CHECK_INTERVAL_HOURS = 6;
const VIDEOS_PER_CHECK = 5;

async function extractOne(url: string, userId: string, followedCreatorId: string): Promise<Record<string, unknown> | null> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/extract-recipe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ url, user_id: userId, followed_creator_id: followedCreatorId }),
  });

  const body = await response.json().catch(() => ({}));
  return response.ok ? (body.recipe ?? null) : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (!YOUTUBE_DATA_API_KEY) {
    return jsonResponse({ error: 'not_configured', message: 'YouTube API key is not configured.' }, 500);
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const cutoff = new Date(Date.now() - CHECK_INTERVAL_HOURS * 60 * 60 * 1000).toISOString();

  const { data: dueCreators, error: creatorsError } = await adminClient
    .from('followed_creators')
    .select('*')
    .eq('auto_import', true)
    .or(`last_checked_at.is.null,last_checked_at.lt.${cutoff}`);

  if (creatorsError) {
    console.error('poll-creator-updates: failed to load due creators', creatorsError);
    return jsonResponse({ error: 'query_failed', message: creatorsError.message }, 500);
  }

  const youtubeCreators = (dueCreators ?? []).filter((creator) => creator.platform === 'youtube');

  const userIds = [...new Set(youtubeCreators.map((creator) => creator.user_id))];
  const { data: users } = userIds.length
    ? await adminClient.from('users').select('id, push_token').in('id', userIds)
    : { data: [] };
  const pushTokenByUserId = new Map((users ?? []).map((user) => [user.id, user.push_token as string | null]));

  let creatorsChecked = 0;
  let recipesImported = 0;

  for (const creator of youtubeCreators) {
    creatorsChecked += 1;

    try {
      const videos = await getChannelRecentVideos(creator.platform_creator_id, YOUTUBE_DATA_API_KEY, VIDEOS_PER_CHECK);
      const lastCheckedAt = creator.last_checked_at ? new Date(creator.last_checked_at) : null;
      const newVideos = lastCheckedAt
        ? videos.filter((video) => new Date(video.publishedAt) > lastCheckedAt)
        : videos;

      const importedRecipes: Record<string, unknown>[] = [];
      for (const video of newVideos) {
        const recipe = await extractOne(video.url, creator.user_id, creator.id);
        if (recipe) importedRecipes.push(recipe);
      }

      if (importedRecipes.length > 0) {
        recipesImported += importedRecipes.length;
        const pushToken = pushTokenByUserId.get(creator.user_id);
        if (pushToken) {
          const body =
            importedRecipes.length === 1
              ? `New recipe imported from ${creator.creator_name}.`
              : `${importedRecipes.length} new recipes imported from ${creator.creator_name}.`;
          await sendExpoPushNotification({
            to: pushToken,
            title: `${creator.creator_name} posted a new recipe!`,
            body,
            data: { recipe_id: importedRecipes[0].id },
          });
        }
      }

      await adminClient
        .from('followed_creators')
        .update({ last_checked_at: new Date().toISOString() })
        .eq('id', creator.id);
    } catch (error) {
      console.error(`poll-creator-updates: failed processing creator ${creator.id}`, error);
    }
  }

  return jsonResponse({ creatorsChecked, recipesImported });
});
