// Supabase Edge Function: extract-recipe
//
// Receives { url, user_id }, detects the source platform, gathers whatever
// context is available (YouTube: metadata + captions transcript; TikTok /
// Instagram: Open Graph metadata only), sends that context to GPT-4o to
// extract a structured recipe, validates the result, and saves it to the
// `recipes` table.
//
// Required secrets (set with `supabase secrets set`):
//   OPENAI_API_KEY        — OpenAI API key used for GPT-4o extraction
//   YOUTUBE_DATA_API_KEY  — YouTube Data API v3 key
// Auto-provided by the Supabase runtime:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const YOUTUBE_DATA_API_KEY = Deno.env.get('YOUTUBE_DATA_API_KEY') ?? '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Platform = 'youtube' | 'tiktok' | 'instagram';

const DIETARY_TAGS = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'dairy-free',
  'nut-free',
  'low-carb',
  'high-protein',
];

const AISLES = [
  'produce',
  'meat',
  'dairy',
  'bakery',
  'frozen',
  'tinned',
  'dry-goods',
  'condiments',
  'alcohol',
  'other',
];

class ExtractionError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function detectPlatform(url: string): Platform | null {
  const normalised = url.toLowerCase();
  if (normalised.includes('youtube.com') || normalised.includes('youtu.be')) return 'youtube';
  if (normalised.includes('tiktok.com')) return 'tiktok';
  if (normalised.includes('instagram.com/reel') || normalised.includes('instagram.com/p')) return 'instagram';
  return null;
}

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&?/]+)/,
    /(?:youtu\.be\/)([^?&/]+)/,
    /(?:youtube\.com\/shorts\/)([^?&/]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n/g, ' ');
}

async function fetchYouTubeDetails(videoId: string) {
  if (!YOUTUBE_DATA_API_KEY) {
    throw new ExtractionError('extraction_failed', 'YouTube API key is not configured.', 500);
  }

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${YOUTUBE_DATA_API_KEY}`
  );
  if (!response.ok) {
    throw new ExtractionError('video_not_found', 'Could not fetch video details from YouTube.', 502);
  }

  const data = await response.json();
  const item = data.items?.[0];
  if (!item) {
    throw new ExtractionError('video_not_found', "We couldn't find that video.", 404);
  }

  const thumbnails = item.snippet?.thumbnails ?? {};
  const thumbnailUrl =
    thumbnails.maxres?.url ?? thumbnails.high?.url ?? thumbnails.medium?.url ?? thumbnails.default?.url ?? null;

  return {
    title: item.snippet?.title as string,
    description: (item.snippet?.description as string) ?? '',
    creatorName: (item.snippet?.channelTitle as string) ?? null,
    thumbnailUrl,
  };
}

async function fetchYouTubeTranscript(videoId: string): Promise<string | null> {
  try {
    const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    const html = await pageResponse.text();

    const match = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;/s);
    if (!match) return null;

    const playerResponse = JSON.parse(match[1]);
    const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks as
      | Array<{ baseUrl: string; languageCode: string }>
      | undefined;
    if (!tracks || tracks.length === 0) return null;

    const track = tracks.find((t) => t.languageCode === 'en') ?? tracks[0];
    const captionResponse = await fetch(track.baseUrl);
    const xml = await captionResponse.text();

    const text = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)]
      .map((m) => decodeHtmlEntities(m[1]))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return text || null;
  } catch {
    return null;
  }
}

function extractMetaTag(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeHtmlEntities(match[1]);
  }
  return null;
}

async function fetchOpenGraphMetadata(url: string) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SnipBot/1.0; +https://snip.app)' },
  });
  if (!response.ok) {
    throw new ExtractionError('video_not_found', "We couldn't reach that link.", 502);
  }
  const html = await response.text();

  return {
    title: extractMetaTag(html, 'og:title'),
    description: extractMetaTag(html, 'og:description'),
    thumbnailUrl: extractMetaTag(html, 'og:image'),
  };
}

interface ExtractedContext {
  title: string;
  description: string;
  creatorName: string | null;
  thumbnailUrl: string | null;
  content: string;
  lowConfidence: boolean;
}

async function gatherContext(platform: Platform, url: string): Promise<ExtractedContext> {
  if (platform === 'youtube') {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) throw new ExtractionError('invalid_url', "That doesn't look like a valid YouTube link.");

    const details = await fetchYouTubeDetails(videoId);
    const transcript = await fetchYouTubeTranscript(videoId);
    const content = `${details.title}\n\n${details.description}\n\n${transcript ?? ''}`.slice(0, 6000);

    return {
      title: details.title,
      description: details.description,
      creatorName: details.creatorName,
      thumbnailUrl: details.thumbnailUrl,
      content,
      lowConfidence: !transcript,
    };
  }

  const metadata = await fetchOpenGraphMetadata(url);
  const title = metadata.title ?? 'Untitled recipe';
  const description = metadata.description ?? '';
  const content = `${title}\n\n${description}`.slice(0, 6000);

  return {
    title,
    description,
    creatorName: null,
    thumbnailUrl: metadata.thumbnailUrl,
    content,
    lowConfidence: description.trim().length < 120,
  };
}

const SYSTEM_PROMPT = `You are a recipe extraction assistant. Extract a complete recipe from the provided video content. Return ONLY valid JSON matching the schema provided. If this is not a cooking video, return {"error": "not_a_recipe"}. Be precise with quantities and units. Use metric units (grams, ml, cm). Infer missing quantities where reasonable rather than leaving them null.`;

function buildUserMessage(input: { title: string; creatorName: string | null; platform: Platform; content: string }) {
  return `Extract a recipe from this cooking video:
Title: ${input.title}
Creator: ${input.creatorName ?? 'Unknown'}
Platform: ${input.platform}
Content: ${input.content}

Return JSON matching this exact schema:
{
  title: string,
  description: string (2-3 sentence summary),
  servings: number,
  prep_time_minutes: number,
  cook_time_minutes: number,
  dietary_tags: string[] (from: vegetarian, vegan, gluten-free, dairy-free, nut-free, low-carb, high-protein),
  ingredients: [{
    name: string,
    quantity: number | null,
    unit: string | null,
    aisle: string (from: produce, meat, dairy, bakery, frozen, tinned, dry-goods, condiments, alcohol, other)
  }],
  steps: string[] (clear numbered steps, each a complete sentence)
}`;
}

async function extractRecipeWithAI(input: {
  title: string;
  creatorName: string | null;
  platform: Platform;
  content: string;
}): Promise<Record<string, unknown>> {
  if (!OPENAI_API_KEY) {
    throw new ExtractionError('extraction_failed', 'OpenAI API key is not configured.', 500);
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.2,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserMessage(input) },
      ],
    }),
  });

  if (!response.ok) {
    throw new ExtractionError('extraction_failed', 'The recipe extraction service is unavailable right now.', 502);
  }

  const completion = await response.json();
  const raw = completion.choices?.[0]?.message?.content;
  if (!raw) throw new ExtractionError('extraction_failed', 'The extraction service returned an empty response.', 502);

  try {
    return JSON.parse(raw);
  } catch {
    throw new ExtractionError('extraction_failed', 'The extraction service returned an unexpected response.', 502);
  }
}

interface ValidatedRecipe {
  title: string;
  description: string;
  servings: number;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  dietary_tags: string[];
  ingredients: { name: string; quantity: number | null; unit: string | null; aisle: string }[];
  steps: string[];
}

function validateRecipePayload(payload: Record<string, unknown>): ValidatedRecipe {
  if (typeof payload.error === 'string') {
    throw new ExtractionError('not_a_recipe', "This doesn't look like a cooking video.");
  }

  if (typeof payload.title !== 'string' || !payload.title.trim()) {
    throw new ExtractionError('extraction_failed', 'The extracted recipe is missing a title.', 502);
  }
  if (!Array.isArray(payload.ingredients) || payload.ingredients.length === 0) {
    throw new ExtractionError('extraction_failed', 'The extracted recipe has no ingredients.', 502);
  }
  if (!Array.isArray(payload.steps) || payload.steps.length === 0) {
    throw new ExtractionError('extraction_failed', 'The extracted recipe has no method steps.', 502);
  }

  const ingredients = payload.ingredients.map((ingredient) => {
    const record = ingredient as Record<string, unknown>;
    return {
      name: typeof record.name === 'string' ? record.name : 'Unknown ingredient',
      quantity: typeof record.quantity === 'number' ? record.quantity : null,
      unit: typeof record.unit === 'string' ? record.unit : null,
      aisle: AISLES.includes(record.aisle as string) ? (record.aisle as string) : 'other',
    };
  });

  const steps = payload.steps.filter((step): step is string => typeof step === 'string' && step.trim().length > 0);

  const dietaryTags = Array.isArray(payload.dietary_tags)
    ? payload.dietary_tags.filter((tag): tag is string => DIETARY_TAGS.includes(tag as string))
    : [];

  return {
    title: payload.title.trim(),
    description: typeof payload.description === 'string' ? payload.description : '',
    servings: typeof payload.servings === 'number' && payload.servings > 0 ? Math.round(payload.servings) : 4,
    prep_time_minutes: typeof payload.prep_time_minutes === 'number' ? Math.round(payload.prep_time_minutes) : null,
    cook_time_minutes: typeof payload.cook_time_minutes === 'number' ? Math.round(payload.cook_time_minutes) : null,
    dietary_tags: dietaryTags,
    ingredients,
    steps,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { url, user_id: userId } = await req.json();

    if (typeof url !== 'string' || !url.trim()) {
      throw new ExtractionError('invalid_url', 'A video URL is required.');
    }
    if (typeof userId !== 'string' || !userId.trim()) {
      throw new ExtractionError('invalid_url', 'A user_id is required.', 401);
    }

    // Verify the caller's session actually belongs to the user_id they're asking us to save as.
    const authHeader = req.headers.get('Authorization') ?? '';
    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: callerUser },
    } = await callerClient.auth.getUser();

    if (!callerUser || callerUser.id !== userId) {
      throw new ExtractionError('unauthorized', 'You are not authorised to perform this action.', 401);
    }

    const platform = detectPlatform(url);
    if (!platform) {
      throw new ExtractionError('unsupported_platform', 'Only YouTube, TikTok, and Instagram Reels are supported.');
    }

    const context = await gatherContext(platform, url);
    const aiPayload = await extractRecipeWithAI({
      title: context.title,
      creatorName: context.creatorName,
      platform,
      content: context.content,
    });
    const recipe = validateRecipePayload(aiPayload);

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: savedRecipe, error: insertError } = await adminClient
      .from('recipes')
      .insert({
        user_id: userId,
        title: recipe.title,
        description: recipe.description,
        source_url: url,
        video_platform: platform,
        thumbnail_url: context.thumbnailUrl,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        servings: recipe.servings,
        prep_time_minutes: recipe.prep_time_minutes,
        cook_time_minutes: recipe.cook_time_minutes,
        dietary_tags: recipe.dietary_tags,
        creator_name: context.creatorName,
        extracted_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (insertError) {
      throw new ExtractionError('extraction_failed', insertError.message, 500);
    }

    return jsonResponse({ recipe: savedRecipe, lowConfidence: context.lowConfidence });
  } catch (error) {
    if (error instanceof ExtractionError) {
      return jsonResponse({ error: error.code, message: error.message }, error.status);
    }
    console.error('extract-recipe error:', error);
    return jsonResponse({ error: 'extraction_failed', message: 'Something went wrong. Please try again.' }, 500);
  }
});
