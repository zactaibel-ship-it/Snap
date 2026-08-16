/**
 * If the input looks like a pasted YouTube channel URL, pulls out the
 * channel ID or @handle so it can be looked up directly instead of run
 * through a fuzzy text search. Returns null for anything else (plain
 * search terms).
 */
export function extractChannelRefFromInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed.includes('youtube.com') && !trimmed.includes('youtu.be')) return null;

  const channelIdMatch = trimmed.match(/youtube\.com\/channel\/(UC[\w-]+)/);
  if (channelIdMatch) return channelIdMatch[1];

  const handleMatch = trimmed.match(/youtube\.com\/@([\w.-]+)/);
  if (handleMatch) return `@${handleMatch[1]}`;

  return null;
}
