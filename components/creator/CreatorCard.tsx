import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { haptics } from '@/lib/haptics';
import type { CreatorPlatform } from '@/lib/database.types';

const PLATFORM_ICONS: Record<CreatorPlatform, keyof typeof Ionicons.glyphMap> = {
  youtube: 'logo-youtube',
  tiktok: 'logo-tiktok',
};

function formatCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(count);
}

interface CreatorCardProps {
  name: string;
  handle: string | null;
  avatarUrl: string | null;
  platform: CreatorPlatform;
  subscriberCount?: number | null;
  recipeCount?: number;
  isFollowing: boolean;
  isImporting?: boolean;
  onPressCard?: () => void;
  onPressFollow?: () => void;
}

export function CreatorCard({
  name,
  handle,
  avatarUrl,
  platform,
  subscriberCount,
  recipeCount,
  isFollowing,
  isImporting = false,
  onPressCard,
  onPressFollow,
}: CreatorCardProps) {
  const metaParts = [
    subscriberCount != null ? `${formatCount(subscriberCount)} subscribers` : null,
    recipeCount != null ? `${recipeCount} recipe${recipeCount === 1 ? '' : 's'}` : null,
  ].filter(Boolean);

  return (
    <View className="flex-row items-center gap-3 rounded-3xl bg-surface p-3" style={cardShadow}>
      <Pressable
        onPress={onPressCard}
        disabled={!onPressCard}
        className="flex-1 flex-row items-center gap-3"
        accessibilityRole={onPressCard ? 'button' : undefined}
      >
        <View className="overflow-hidden rounded-full bg-border" style={{ width: 52, height: 52 }}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Ionicons name="person" size={22} color="#6B7280" />
            </View>
          )}
        </View>

        <View className="flex-1 gap-0.5">
          <Text numberOfLines={1} className="text-sm font-semibold text-text">
            {name}
          </Text>
          <View className="flex-row items-center gap-1">
            <Ionicons name={PLATFORM_ICONS[platform]} size={12} color="#6B7280" />
            {handle ? (
              <Text numberOfLines={1} className="text-xs text-text-muted">
                {handle}
              </Text>
            ) : null}
          </View>
          {metaParts.length > 0 ? (
            <Text numberOfLines={1} className="text-xs text-text-muted">
              {metaParts.join(' · ')}
            </Text>
          ) : null}
        </View>
      </Pressable>

      {isImporting ? (
        <View className="flex-row items-center gap-1.5 rounded-2xl bg-primary/10 px-3 py-2">
          <ActivityIndicator size="small" color="#1B4332" />
          <Text className="text-xs font-medium text-primary">Importing...</Text>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isFollowing ? `Unfollow ${name}` : `Follow ${name}`}
          onPress={() => {
            haptics.selection();
            onPressFollow?.();
          }}
          className={`min-h-[44px] items-center justify-center rounded-2xl px-3.5 py-2 ${
            isFollowing ? 'border border-border bg-surface' : 'bg-primary'
          }`}
        >
          <Text className={`text-xs font-semibold ${isFollowing ? 'text-text' : 'text-white'}`}>
            {isFollowing ? 'Following' : '+ Follow'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const cardShadow = {
  shadowColor: '#1C1C1E',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
};
