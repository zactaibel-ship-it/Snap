import { Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';

import type { Recipe, VideoPlatform } from '@/lib/database.types';

const PLATFORM_ICONS: Record<VideoPlatform, keyof typeof Ionicons.glyphMap> = {
  youtube: 'logo-youtube',
  tiktok: 'logo-tiktok',
  instagram: 'logo-instagram',
};

interface RecipeCardProps {
  recipe: Recipe;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

  return (
    <Link href={`/recipe/${recipe.id}`} asChild>
      <Pressable
        className="flex-1 overflow-hidden rounded-3xl bg-surface"
        style={{
          shadowColor: '#1C1C1E',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <View className="aspect-square w-full bg-border">
          {recipe.thumbnail_url ? (
            <Image source={{ uri: recipe.thumbnail_url }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Ionicons name="restaurant-outline" size={28} color="#6B7280" />
            </View>
          )}
          <View className="absolute left-2 top-2 h-7 w-7 items-center justify-center rounded-full bg-black/50">
            <Ionicons name={PLATFORM_ICONS[recipe.video_platform]} size={15} color="#FFFFFF" />
          </View>
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
