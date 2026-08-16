// Supabase Edge Function: import-creator-recipes
//
// Receives { creator_id, user_id, max_videos = 5 }. Fetches the creator's
// most recent videos and runs each through extract-recipe, skipping videos
// that aren't recipes or that this user already has.
//
// Required secrets: YOUTUBE_DATA_API_KEY
// Auto-provided: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'npm:@supabase/supabase-js@2';

import { CORS_HEADERS, jsonResponse } from '../_shared/cors.ts';
import { getChannelRecentVideos } from '../_shared/youtube.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const YOUTUBE_DATA_API_KEY = Deno.env.get('YOUTUBE_DATA_API_KEY') ?? '';

interface ExtractResult {
  recipe?: Record<string, unknown>;
  error?: string;
}

async function extractOne(url: string, userId: string, followedCreatorId: string): Promise<ExtractResult> {
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
  if (!response.ok) return { error: body?.error ?? 'extraction_failed' };
  return { recipe: body.recipe };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { creator_id: creatorId, user_id: userId, max_videos: maxVideosInput } = await req.json();
    const maxVideos = typeof maxVideosInput === 'number' && maxVideosInput > 0 ? Math.min(maxVideosInput, 10) : 5;

    if (typeof creatorId !== 'string' || !creatorId.trim()) {
      return jsonResponse({ error: 'invalid_creator', message: 'A creator_id is required.' }, 400);
    }
    if (typeof userId !== 'string' || !userId.trim()) {
      return jsonResponse({ error: 'invalid_user', message: 'A user_id is required.' }, 401);
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: callerUser },
    } = await callerClient.auth.getUser();

    if (!callerUser || callerUser.id !== userId) {
      return jsonResponse({ error: 'unauthorized', message: 'You are not authorised to perform this action.' }, 401);
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: creator, error: creatorError } = await adminClient
      .from('followed_creators')
      .select('*')
      .eq('id', creatorId)
      .eq('user_id', userId)
      .maybeSingle();

    if (creatorError || !creator) {
      return jsonResponse({ error: 'creator_not_found', message: 'Could not find that followed creator.' }, 404);
    }

    if (creator.platform !== 'youtube') {
      return jsonResponse({ imported: 0, recipes: [], message: 'Automatic import is only available for YouTube.' });
    }
    if (!YOUTUBE_DATA_API_KEY) {
      return jsonResponse({ error: 'not_configured', message: 'YouTube API key is not configured.' }, 500);
    }

    const videos = await getChannelRecentVideos(creator.platform_creator_id, YOUTUBE_DATA_API_KEY, maxVideos);

    const recipes: Record<string, unknown>[] = [];
    for (const video of videos) {
      const result = await extractOne(video.url, userId, creatorId);
      if (result.recipe) recipes.push(result.recipe);
    }

    await adminClient
      .from('followed_creators')
      .update({ last_checked_at: new Date().toISOString() })
      .eq('id', creatorId);

    return jsonResponse({ imported: recipes.length, recipes });
  } catch (error) {
    console.error('import-creator-recipes error:', error);
    return jsonResponse({ error: 'import_failed', message: 'Something went wrong. Please try again.' }, 500);
  }
});
