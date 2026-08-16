import { useMemo } from 'react';
import { Alert, FlatList, Image, Pressable, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RecipeCard } from '@/components/recipe/RecipeCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import {
  useCreator,
  useCreatorLiveStats,
  useCreatorRecipes,
  useToggleAutoImport,
  useTriggerManualImport,
  useUnfollowCreator,
} from '@/hooks/useCreators';

function formatCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(count);
}

export default function CreatorProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: creator, isLoading } = useCreator(id);
  const { data: recipes, isLoading: isRecipesLoading } = useCreatorRecipes(id);
  const { data: liveStats } = useCreatorLiveStats(creator?.platform_creator_id);

  const toggleAutoImport = useToggleAutoImport(id);
  const triggerManualImport = useTriggerManualImport(id);
  const unfollowCreator = useUnfollowCreator();

  const channelUrl = useMemo(() => {
    if (!creator) return null;
    return creator.platform === 'youtube'
      ? `https://www.youtube.com/channel/${creator.platform_creator_id}`
      : `https://www.tiktok.com/@${creator.creator_handle.replace(/^@/, '')}`;
  }, [creator]);

  const handleUnfollow = () => {
    if (!creator) return;
    Alert.alert('Unfollow creator?', `You'll stop getting new recipes from ${creator.creator_name}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unfollow',
        style: 'destructive',
        onPress: async () => {
          await unfollowCreator.mutateAsync(creator.id);
          router.back();
        },
      },
    ]);
  };

  const handleManualImport = async () => {
    try {
      await triggerManualImport.mutateAsync();
    } catch (error) {
      Alert.alert('Something went wrong', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="gap-3 p-5">
          <SkeletonCard />
        </View>
      </SafeAreaView>
    );
  }

  if (!creator) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <EmptyState
            illustration={<Ionicons name="help-circle-outline" size={56} color="#6B7280" />}
            title="Creator not found"
            description="This creator may no longer be followed."
            ctaLabel="Go back"
            onPressCta={() => router.back()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const subscriberCount = liveStats?.subscriberCount ?? null;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <FlatList
        data={recipes ?? []}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 20 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 32 }}
        ListHeaderComponent={
          <View className="gap-5 px-5 pb-5 pt-4">
            <View className="items-center gap-3">
              <View className="h-24 w-24 overflow-hidden rounded-full bg-border">
                {creator.avatar_url ? (
                  <Image source={{ uri: creator.avatar_url }} className="h-full w-full" resizeMode="cover" />
                ) : (
                  <View className="h-full w-full items-center justify-center">
                    <Ionicons name="person" size={36} color="#6B7280" />
                  </View>
                )}
              </View>
              <View className="items-center gap-0.5">
                <Text className="text-xl font-bold text-text">{creator.creator_name}</Text>
                <View className="flex-row items-center gap-1.5">
                  <Ionicons
                    name={creator.platform === 'youtube' ? 'logo-youtube' : 'logo-tiktok'}
                    size={13}
                    color="#6B7280"
                  />
                  <Text className="text-sm text-text-muted">{creator.creator_handle}</Text>
                </View>
                {subscriberCount != null ? (
                  <Text className="text-xs text-text-muted">{formatCount(subscriberCount)} subscribers</Text>
                ) : null}
              </View>
              <Button
                label="Following"
                variant="outline"
                onPress={handleUnfollow}
                loading={unfollowCreator.isPending}
                className="px-8"
              />
            </View>

            <View className="gap-3 rounded-3xl bg-surface p-4" style={cardShadow}>
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-sm font-semibold text-text">Auto-import new recipes</Text>
                  <Text className="text-xs text-text-muted">
                    {creator.auto_import
                      ? 'New videos are extracted automatically.'
                      : "You'll need to check for new recipes yourself."}
                  </Text>
                </View>
                <Switch
                  value={creator.auto_import}
                  onValueChange={(value) => toggleAutoImport.mutate(value)}
                  trackColor={{ false: '#E5E7EB', true: '#52B788' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {!creator.auto_import ? (
                <Button
                  label="Check for new recipes"
                  variant="outline"
                  onPress={handleManualImport}
                  loading={triggerManualImport.isPending}
                />
              ) : null}
            </View>

            {channelUrl ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => WebBrowser.openBrowserAsync(channelUrl)}
                className="flex-row items-center justify-center gap-2 py-2"
              >
                <Text className="text-sm font-semibold text-primary">Visit Channel</Text>
                <Ionicons name="open-outline" size={14} color="#1B4332" />
              </Pressable>
            ) : null}

            <Text className="text-lg font-bold text-text">Recipes</Text>
          </View>
        }
        ListEmptyComponent={
          isRecipesLoading ? (
            <View className="flex-row flex-wrap gap-3 px-5">
              <View className="w-[47%]">
                <SkeletonCard />
              </View>
              <View className="w-[47%]">
                <SkeletonCard />
              </View>
            </View>
          ) : (
            <View className="px-5">
              <EmptyState
                illustration={<Ionicons name="restaurant-outline" size={48} color="#52B788" />}
                title="No recipes yet"
                description="Recipes imported from this creator will show up here."
              />
            </View>
          )
        }
        renderItem={({ item }) => <RecipeCard recipe={item} />}
      />
    </SafeAreaView>
  );
}

const cardShadow = {
  shadowColor: '#1C1C1E',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
};
