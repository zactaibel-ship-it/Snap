import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  followCreator,
  getCreatorRecipes,
  getFollowedCreatorById,
  getFollowedCreators,
  getYouTubeCreatorStats,
  searchYouTubeCreators,
  setAutoImport,
  triggerCreatorImport,
  unfollowCreator,
  type YouTubeChannelStats,
} from '@/lib/api/creators';
import { SUGGESTED_CREATORS } from '@/constants/suggestedCreators';
import { useAuth } from '@/hooks/useAuth';
import { extractChannelRefFromInput } from '@/lib/youtubeChannelRef';
import { useToastStore } from '@/stores/toastStore';
import type { CreatorPlatform, Database } from '@/lib/database.types';

export function useFollowedCreators() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ['followed-creators', userId],
    queryFn: () => getFollowedCreators(userId!),
    enabled: !!userId,
  });
}

export function useCreator(id: string | undefined) {
  return useQuery({
    queryKey: ['creator', id],
    queryFn: () => getFollowedCreatorById(id!),
    enabled: !!id,
  });
}

export function useCreatorRecipes(id: string | undefined) {
  return useQuery({
    queryKey: ['creator-recipes', id],
    queryFn: () => getCreatorRecipes(id!),
    enabled: !!id,
  });
}

export function useCreatorLiveStats(platformCreatorId: string | undefined) {
  return useQuery({
    queryKey: ['creator-live-stats', platformCreatorId],
    queryFn: async () => {
      const channels = await getYouTubeCreatorStats([platformCreatorId!]);
      return channels[0] ?? null;
    },
    enabled: !!platformCreatorId,
    staleTime: 60 * 60 * 1000,
  });
}

export function useSearchCreators(query: string) {
  const trimmed = query.trim();
  const channelRef = extractChannelRefFromInput(trimmed);

  return useQuery({
    queryKey: ['creator-search', trimmed],
    queryFn: () => (channelRef ? getYouTubeCreatorStats([channelRef]) : searchYouTubeCreators(trimmed)),
    enabled: trimmed.length >= 2,
  });
}

export function useSuggestedCreators() {
  return useQuery({
    queryKey: ['suggested-creators'],
    queryFn: async () => {
      const stats = await getYouTubeCreatorStats(SUGGESTED_CREATORS.map((creator) => creator.channelRef));
      // Matched by the ref each result echoes back — batched channels.list
      // lookups don't reliably preserve request order, so positional
      // matching would silently mix up creators.
      const statsByRef = new Map(stats.map((channel) => [channel.ref, channel]));

      return SUGGESTED_CREATORS.map((seed) => ({
        seed,
        stats: statsByRef.get(seed.channelRef) ?? null,
      })).filter((entry): entry is { seed: (typeof SUGGESTED_CREATORS)[number]; stats: YouTubeChannelStats } =>
        !!entry.stats
      );
    },
    staleTime: 60 * 60 * 1000,
  });
}

type FollowedCreatorInsert = Database['public']['Tables']['followed_creators']['Insert'];

export function useFollowCreator() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.show);
  const userId = session?.user.id;

  return useMutation({
    mutationFn: async (channel: { platform: CreatorPlatform; id: string; title: string; handle: string | null; avatarUrl: string | null }) => {
      if (!userId) throw new Error('You need to be signed in to follow a creator.');

      const insert: FollowedCreatorInsert = {
        user_id: userId,
        platform: channel.platform,
        platform_creator_id: channel.id,
        creator_name: channel.title,
        creator_handle: channel.handle ?? channel.title,
        avatar_url: channel.avatarUrl,
        auto_import: true,
        last_checked_at: null,
      };

      const creator = await followCreator(insert);
      const { imported } = await triggerCreatorImport(creator.id, userId, 5);
      return { creator, imported };
    },
    onSuccess: ({ creator, imported }) => {
      queryClient.invalidateQueries({ queryKey: ['followed-creators'] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      showToast(
        imported > 0
          ? `Imported ${imported} recipe${imported === 1 ? '' : 's'} from ${creator.creator_name}`
          : `Now following ${creator.creator_name}`
      );
    },
  });
}

export function useUnfollowCreator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => unfollowCreator(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followed-creators'] });
    },
  });
}

export function useToggleAutoImport(creatorId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (autoImport: boolean) => setAutoImport(creatorId!, autoImport),
    onSuccess: (updated) => {
      queryClient.setQueryData(['creator', creatorId], updated);
      queryClient.invalidateQueries({ queryKey: ['followed-creators'] });
    },
  });
}

export function useTriggerManualImport(creatorId: string | undefined) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.show);

  return useMutation({
    mutationFn: async () => {
      if (!session?.user || !creatorId) throw new Error('Not signed in.');
      return triggerCreatorImport(creatorId, session.user.id, 5);
    },
    onSuccess: ({ imported }) => {
      queryClient.invalidateQueries({ queryKey: ['creator-recipes', creatorId] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      showToast(imported > 0 ? `Imported ${imported} new recipe${imported === 1 ? '' : 's'}` : 'No new recipes found');
    },
  });
}
