// Thin wrapper around the bits of the YouTube Data API v3 the creator
// following feature needs. The API key never leaves the edge function —
// clients call search-creators / import-creator-recipes instead of hitting
// Google directly.

export interface ChannelInfo {
  id: string;
  title: string;
  handle: string | null;
  avatarUrl: string | null;
  subscriberCount: number | null;
}

// deno-lint-ignore no-explicit-any
function mapChannelItem(item: any): ChannelInfo {
  const snippet = item.snippet ?? {};
  const statistics = item.statistics ?? {};
  const thumbnails = snippet.thumbnails ?? {};
  const customUrl: string | undefined = snippet.customUrl;

  return {
    id: item.id,
    title: snippet.title ?? 'Unknown creator',
    handle: customUrl ? (customUrl.startsWith('@') ? customUrl : `@${customUrl}`) : null,
    avatarUrl: thumbnails.high?.url ?? thumbnails.medium?.url ?? thumbnails.default?.url ?? null,
    subscriberCount:
      statistics.subscriberCount != null && statistics.hiddenSubscriberCount !== true
        ? Number(statistics.subscriberCount)
        : null,
  };
}

export async function searchYouTubeChannels(query: string, apiKey: string, maxResults = 8): Promise<ChannelInfo[]> {
  const searchResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=${maxResults}&key=${apiKey}`
  );
  if (!searchResponse.ok) throw new Error('YouTube channel search failed.');

  const searchData = await searchResponse.json();
  // deno-lint-ignore no-explicit-any
  const ids: string[] = (searchData.items ?? [])
    .map((item: any) => item.snippet?.channelId ?? item.id?.channelId)
    .filter((id: string | undefined): id is string => !!id);

  if (ids.length === 0) return [];
  return getYouTubeChannelStatsByIds(ids, apiKey);
}

export async function getYouTubeChannelStatsByIds(ids: string[], apiKey: string): Promise<ChannelInfo[]> {
  if (ids.length === 0) return [];

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${ids.join(',')}&key=${apiKey}`
  );
  if (!response.ok) throw new Error('YouTube channel lookup failed.');

  const data = await response.json();
  return (data.items ?? []).map(mapChannelItem);
}

export async function getYouTubeChannelByHandle(handle: string, apiKey: string): Promise<ChannelInfo | null> {
  const cleanHandle = handle.replace(/^@/, '');
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${encodeURIComponent(cleanHandle)}&key=${apiKey}`
  );
  if (!response.ok) return null;

  const data = await response.json();
  const item = data.items?.[0];
  return item ? mapChannelItem(item) : null;
}

export interface ResolvedChannel extends ChannelInfo {
  /** Whatever the caller originally passed in for this entry (a channel ID or an @handle) — lets the
   * caller match results back to its request list without depending on API response ordering, which
   * is unreliable for batched channels.list?id=... lookups and differs entirely between the ID batch
   * and the individually-resolved handles. */
  ref: string;
}

/** Resolves a mixed list of raw channel IDs (start with "UC") and @handles into ChannelInfo, in as few requests as possible. */
export async function resolveYouTubeChannels(refs: string[], apiKey: string): Promise<ResolvedChannel[]> {
  const ids = refs.filter((ref) => ref.startsWith('UC'));
  const handles = refs.filter((ref) => !ref.startsWith('UC'));

  const [byId, byHandle] = await Promise.all([
    getYouTubeChannelStatsByIds(ids, apiKey),
    Promise.all(handles.map(async (handle) => ({ handle, channel: await getYouTubeChannelByHandle(handle, apiKey) }))),
  ]);

  const idResults: ResolvedChannel[] = byId.map((channel) => ({ ...channel, ref: channel.id }));
  const handleResults: ResolvedChannel[] = byHandle
    .filter((result): result is { handle: string; channel: ChannelInfo } => result.channel !== null)
    .map((result) => ({ ...result.channel, ref: result.handle }));

  return [...idResults, ...handleResults];
}

export interface VideoInfo {
  videoId: string;
  title: string;
  publishedAt: string;
  url: string;
}

export async function getChannelRecentVideos(channelId: string, apiKey: string, maxResults = 5): Promise<VideoInfo[]> {
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=${maxResults}&type=video&key=${apiKey}`
  );
  if (!response.ok) throw new Error('YouTube video search failed.');

  const data = await response.json();
  const videos: VideoInfo[] = [];

  // deno-lint-ignore no-explicit-any
  for (const item of data.items ?? []) {
    const videoId = item.id?.videoId;
    if (!videoId) continue;
    videos.push({
      videoId,
      title: item.snippet?.title ?? 'Untitled video',
      publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
      url: `https://www.youtube.com/watch?v=${videoId}`,
    });
  }

  return videos;
}
