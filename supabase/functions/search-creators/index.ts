// Supabase Edge Function: search-creators
//
// Proxies YouTube Data API v3 channel lookups so the API key stays
// server-side. Two modes:
//   { mode: 'search', query: string }              — search for channels by name/URL
//   { mode: 'stats', channels: string[] }           — fetch stats for known channel IDs/@handles
//
// Required secrets: YOUTUBE_DATA_API_KEY

import { CORS_HEADERS, jsonResponse } from '../_shared/cors.ts';
import { resolveYouTubeChannels, searchYouTubeChannels } from '../_shared/youtube.ts';

const YOUTUBE_DATA_API_KEY = Deno.env.get('YOUTUBE_DATA_API_KEY') ?? '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (!YOUTUBE_DATA_API_KEY) {
    return jsonResponse({ error: 'not_configured', message: 'YouTube API key is not configured.' }, 500);
  }

  try {
    const body = await req.json();

    if (body?.mode === 'search') {
      const query = body.query;
      if (typeof query !== 'string' || !query.trim()) {
        return jsonResponse({ error: 'invalid_query', message: 'A search query is required.' }, 400);
      }
      const channels = await searchYouTubeChannels(query.trim(), YOUTUBE_DATA_API_KEY, 8);
      return jsonResponse({ channels });
    }

    if (body?.mode === 'stats') {
      const channels = body.channels;
      if (!Array.isArray(channels) || channels.some((c) => typeof c !== 'string')) {
        return jsonResponse({ error: 'invalid_channels', message: 'channels must be a string array.' }, 400);
      }
      const results = await resolveYouTubeChannels(channels, YOUTUBE_DATA_API_KEY);
      return jsonResponse({ channels: results });
    }

    return jsonResponse({ error: 'invalid_mode', message: "mode must be 'search' or 'stats'." }, 400);
  } catch (error) {
    console.error('search-creators error:', error);
    return jsonResponse({ error: 'search_failed', message: 'Something went wrong. Please try again.' }, 500);
  }
});
