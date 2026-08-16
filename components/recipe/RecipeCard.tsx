import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';

import { haptics } from '@/lib/haptics';
import type { Recipe, VideoPlatform } from '@/lib/database.types';

const PLATFORM_ICONS: Record<VideoPlatform, keyof typeof Ionicons.glyphMap> = {
  youtube: 'logo-youtube',
  tiktok: 'logo-tiktok',
  instagram: 'logo-instagram',
};

const cardShadow = {
  shadowColor: '#1C1C1E',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
};

interface RecipeCardProps {
  recipe: Recipe;
  layout?: 'grid' | 'list';
  onLongPress?: () => void;
}

export function RecipeCard({ recipe, layout = 'grid', onLongPress }: RecipeCardProps) {
  const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

  const thumbnail = recipe.thumbnail_url ? (
    <Image
      source={{ uri: recipe.thumbnail_url }}
      style={{ width: '100%', height: '100%' }}
      contentFit="cover"
      transition={150}
      accessibilityIgnoresInvertColors
    />
  ) : (
    <View className="h-full w-full items-center justify-center">
      <Ionicons name="restaurant-outline" size={layout === 'grid' ? 28 : 22} color="#6B7280" />
    </View>
  );

  const platformBadge = (
    <View className="h-7 w-7 items-center justify-center rounded-full bg-black/50">
      <Ionicons name={PLATFORM_ICONS[recipe.video_platform]} size={15} color="#FFFFFF" />
    </View>
  );

  if (layout === 'list') {
    return (
      <Link href={`/recipe/${recipe.id}`} asChild>
        <Pressable
          onPressIn={haptics.selection}
          onLongPress={onLongPress}
          accessibilityRole="button"
          accessibilityLabel={`Open recipe: ${recipe.title}`}
          className="flex-row items-center gap-3 overflow-hidden rounded-3xl bg-surface p-2"
          style={cardShadow}
        >
          <View className="h-20 w-20 overflow-hidden rounded-2xl bg-border">
            {thumbnail}
            <View className="absolute left-1 top-1 h-5 w-5 items-center justify-center rounded-full bg-black/50">
              <Ionicons name={PLATFORM_ICONS[recipe.video_platform]} size={11} color="#FFFFFF" />
            </View>
          </View>
          <View className="flex-1 gap-1 pr-2">
            <Text numberOfLines={2} className="text-sm font-semibold text-text">
              {recipe.title}
            </Text>
            {recipe.creator_name ? (
              <Text numberOfLines={1} className="text-xs text-text-muted">
                {recipe.creator_name}
              </Text>
            ) : null}
            {totalTime > 0 ? (
              <View className="mt-0.5 flex-row items-center gap-1">
                <Ionicons name="time-outline" size={12} color="#6B7280" />
                <Text className="text-xs text-text-muted">{totalTime}m</Text>
              </View>
            ) : null}
          </View>
        </Pressable>
      </Link>
    );
  }

  return (
    <Link href={`/recipe/${recipe.id}`} asChild>
      <Pressable
        onPressIn={haptics.selection}
        onLongPress={onLongPress}
        accessibilityRole="button"
        accessibilityLabel={`Open recipe: ${recipe.title}`}
        className="flex-1 overflow-hidden rounded-3xl bg-surface"
        style={cardShadow}
      >
        <View className="aspect-square w-full bg-border">
          {thumbnail}
          <View className="absolute left-2 top-2">{platformBadge}</View>
          {totalTime > 0 ? (
            <View className="absolute bottom-2 right-2 flex-row items-center gap-1 rounded-full bg-black/50 px-2 py-1">
              <Ionicons name="time-outline" size={12} color="#FFFFFF" />
              <Text className="text-xs font-medium text-white">{totalTime}m</Text>
            </View>
          ) : null}
        </View>
        <View className="gap-1 p-3">
          <Text numberOfLines={2} className="text-sm font-semibold text-text">
            {recipe.title}
          </Text>
          {recipe.creator_name ? (
            <Text numberOfLines={1} className="text-xs text-text-muted">
              {recipe.creator_name}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}
