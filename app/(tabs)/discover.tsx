import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CreatorCard } from '@/components/creator/CreatorCard';
import { SkeletonCard } from '@/components/ui/Skeleton';
import {
  useFollowCreator,
  useFollowedCreators,
  useSearchCreators,
  useSuggestedCreators,
  useUnfollowCreator,
} from '@/hooks/useCreators';
import type { YouTubeChannelInfo } from '@/lib/api/creators';

export default function DiscoverScreen() {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(searchInput), 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const isSearching = debouncedQuery.trim().length >= 2;

  const { data: followedCreators, isLoading: isFollowedLoading } = useFollowedCreators();
  const { data: suggested, isLoading: isSuggestedLoading } = useSuggestedCreators();
  const { data: searchResults, isLoading: isSearchLoading } = useSearchCreators(debouncedQuery);

  const followCreator = useFollowCreator();
  const unfollowCreator = useUnfollowCreator();
  const [followingChannelId, setFollowingChannelId] = useState<string | null>(null);

  const followedIds = useMemo(
    () => new Set((followedCreators ?? []).map((creator) => creator.platform_creator_id)),
    [followedCreators]
  );

  const followedIdToRecordId = useMemo(
    () => new Map((followedCreators ?? []).map((creator) => [creator.platform_creator_id, creator.id])),
    [followedCreators]
  );

  const suggestedToShow = useMemo(
    () => (suggested ?? []).filter((entry) => !followedIds.has(entry.stats.id)),
    [suggested, followedIds]
  );

  const handleFollow = async (channel: YouTubeChannelInfo) => {
    setFollowingChannelId(channel.id);
    try {
      await followCreator.mutateAsync({
        platform: 'youtube',
        id: channel.id,
        title: channel.title,
        handle: channel.handle,
        avatarUrl: channel.avatarUrl,
      });
    } catch (error) {
      Alert.alert('Could not follow creator', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setFollowingChannelId(null);
    }
  };

  const handleUnfollow = (channelId: string, name: string) => {
    const recordId = followedIdToRecordId.get(channelId);
    if (!recordId) return;
    Alert.alert('Unfollow creator?', `You'll stop getting new recipes from ${name}.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unfollow', style: 'destructive', onPress: () => unfollowCreator.mutate(recordId) },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-5 pb-2 pt-4">
        <Text className="text-3xl font-bold text-text">Discover</Text>
        <Text className="text-base text-text-muted">Follow your favourite cooking creators</Text>
      </View>

      <View className="px-5 pb-2">
        <View className="flex-row items-center gap-2 rounded-2xl border border-border bg-surface px-3.5">
          <Ionicons name="search" size={16} color="#6B7280" />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Search for a creator or paste their channel URL"
            placeholderTextColor="#6B7280"
            className="h-11 flex-1 text-sm text-text"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchInput ? (
            <Pressable accessibilityLabel="Clear search" onPress={() => setSearchInput('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color="#6B7280" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 24 }}>
        {isSearching ? (
          <View className="gap-2">
            <Text className="text-sm font-semibold uppercase text-text-muted">Search results</Text>
            {isSearchLoading ? (
              <View className="gap-2">
                <SkeletonCard />
              </View>
            ) : searchResults && searchResults.length > 0 ? (
              <View className="gap-2">
                {searchResults.map((channel) => {
                  const isFollowing = followedIds.has(channel.id);
                  return (
                    <CreatorCard
                      key={channel.id}
                      name={channel.title}
                      handle={channel.handle}
                      avatarUrl={channel.avatarUrl}
                      platform="youtube"
                      subscriberCount={channel.subscriberCount}
                      isFollowing={isFollowing}
                      isImporting={followingChannelId === channel.id && followCreator.isPending}
                      onPressFollow={() =>
                        isFollowing ? handleUnfollow(channel.id, channel.title) : handleFollow(channel)
                      }
                    />
                  );
                })}
              </View>
            ) : (
              <Text className="text-sm text-text-muted">No creators found for &ldquo;{debouncedQuery}&rdquo;.</Text>
            )}
          </View>
        ) : (
          <>
            {isFollowedLoading ? null : (followedCreators?.length ?? 0) > 0 ? (
              <View className="gap-2">
                <Text className="text-sm font-semibold uppercase text-text-muted">Following</Text>
                <View className="gap-2">
                  {followedCreators!.map((creator) => (
                    <CreatorCard
                      key={creator.id}
                      name={creator.creator_name}
                      handle={creator.creator_handle}
                      avatarUrl={creator.avatar_url}
                      platform={creator.platform}
                      recipeCount={creator.recipeCount}
                      isFollowing
                      onPressCard={() => router.push(`/creator/${creator.id}`)}
                      onPressFollow={() => handleUnfollow(creator.platform_creator_id, creator.creator_name)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <View className="gap-2">
              <Text className="text-sm font-semibold uppercase text-text-muted">Suggested</Text>
              {isSuggestedLoading ? (
                <SkeletonCard />
              ) : (
                <View className="gap-2">
                  {suggestedToShow.map(({ seed, stats }) => (
                    <CreatorCard
                      key={stats.id}
                      name={seed.name}
                      handle={stats.handle}
                      avatarUrl={stats.avatarUrl}
                      platform="youtube"
                      subscriberCount={stats.subscriberCount}
                      isFollowing={false}
                      isImporting={followingChannelId === stats.id && followCreator.isPending}
                      onPressFollow={() => handleFollow(stats)}
                    />
                  ))}
                </View>
              )}
            </View>

            <View className="gap-2 rounded-3xl bg-surface p-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name="share-outline" size={18} color="#1B4332" />
                <Ionicons name="arrow-forward" size={14} color="#6B7280" />
                <Ionicons name="restaurant-outline" size={18} color="#1B4332" />
              </View>
              <Text className="text-sm font-semibold text-text">TikTok & Instagram creators</Text>
              <Text className="text-sm leading-5 text-text-muted">
                To follow TikTok or Instagram creators, share their videos directly to Snip from those apps — we'll
                save the recipe automatically.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
