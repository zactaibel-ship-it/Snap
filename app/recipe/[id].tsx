import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { MealPlanPickerSheet } from '@/components/planner/MealPlanPickerSheet';
import { IngredientRow } from '@/components/recipe/IngredientRow';
import { RecipeEditForm } from '@/components/recipe/RecipeEditForm';
import { StepRow } from '@/components/recipe/StepRow';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { NetworkError } from '@/components/ui/NetworkError';
import { Skeleton } from '@/components/ui/Skeleton';
import { useDeleteRecipeWithUndo, useRecipe } from '@/hooks/useRecipes';
import { useAddRecipeToShoppingList } from '@/hooks/useShoppingList';
import { haptics } from '@/lib/haptics';
import { scaleIngredients } from '@/lib/scaling';
import { useIngredientCheckStore } from '@/stores/ingredientCheckStore';
import type { VideoPlatform } from '@/lib/database.types';

const PLATFORM_LABELS: Record<VideoPlatform, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
};

const PLATFORM_ICONS: Record<VideoPlatform, keyof typeof Ionicons.glyphMap> = {
  youtube: 'logo-youtube',
  tiktok: 'logo-tiktok',
  instagram: 'logo-instagram',
};

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: recipe, isLoading, isError, refetch } = useRecipe(id);
  const insets = useSafeAreaInsets();

  const [servings, setServings] = useState<number | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isMealPlanSheetOpen, setIsMealPlanSheetOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const addToShoppingList = useAddRecipeToShoppingList();
  const deleteRecipeWithUndo = useDeleteRecipeWithUndo();
  const isIngredientChecked = useIngredientCheckStore((state) => state.isChecked);
  const toggleIngredientChecked = useIngredientCheckStore((state) => state.toggle);

  const currentServings = servings ?? recipe?.servings ?? 1;

  const scaledIngredients = useMemo(() => {
    if (!recipe) return [];
    return scaleIngredients(recipe.ingredients, recipe.servings, currentServings);
  }, [recipe, currentServings]);

  const handleShare = async (sourceUrl: string, title: string) => {
    try {
      await Share.share({ message: `${title} — extracted with Snip\n${sourceUrl}`, url: sourceUrl });
    } catch {
      // Share sheet dismissed — nothing to do.
    }
  };

  const handleAddToShoppingList = async () => {
    if (!recipe) return;
    try {
      const result = await addToShoppingList.mutateAsync(recipe);
      const total = result.addedCount + result.mergedCount;
      Alert.alert('Added to shopping list', `${total} ingredient${total === 1 ? '' : 's'} added.`);
    } catch (error) {
      Alert.alert('Something went wrong', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Skeleton height={288} radius={0} />
        <View className="gap-4 p-5">
          <Skeleton height={22} width="80%" />
          <Skeleton height={14} width="40%" />
          <Skeleton height={80} radius={24} />
          <Skeleton height={16} width="30%" />
          <Skeleton height={14} />
          <Skeleton height={14} />
          <Skeleton height={14} width="70%" />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Stack.Screen options={{ headerShown: true, title: '' }} />
        <NetworkError onRetry={refetch} message="We couldn't load this recipe." />
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Stack.Screen options={{ headerShown: true, title: '' }} />
        <View className="flex-1 items-center justify-center">
          <EmptyState
            illustration={<Ionicons name="help-circle-outline" size={56} color="#6B7280" />}
            title="Recipe not found"
            description="This recipe may have been removed."
            ctaLabel="Go back"
            onPressCta={() => router.back()}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (isEditing) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <RecipeEditForm
          recipe={recipe}
          onCancel={() => setIsEditing(false)}
          onSaved={() => setIsEditing(false)}
          onDelete={() => {
            deleteRecipeWithUndo(recipe);
            router.back();
          }}
        />
      </>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView bounces={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="h-72 w-full bg-border">
          {recipe.thumbnail_url ? (
            <Image source={{ uri: recipe.thumbnail_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Ionicons name="restaurant-outline" size={48} color="#6B7280" />
            </View>
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.55)', 'transparent', 'rgba(0,0,0,0.65)']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View
            className="absolute left-0 right-0 flex-row items-center justify-between px-4"
            style={{ top: insets.top + 8 }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => router.back()}
              className="h-11 w-11 items-center justify-center rounded-full bg-black/40"
            >
              <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
            </Pressable>
            <View className="flex-row gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit recipe"
                onPress={() => setIsEditing(true)}
                className="h-11 w-11 items-center justify-center rounded-full bg-black/40"
              >
                <Ionicons name="pencil" size={18} color="#FFFFFF" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share recipe"
                onPress={() => handleShare(recipe.source_url, recipe.title)}
                className="h-11 w-11 items-center justify-center rounded-full bg-black/40"
              >
                <Ionicons name="share-outline" size={20} color="#FFFFFF" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark recipe'}
                onPress={() => setIsBookmarked((current) => !current)}
                className="h-11 w-11 items-center justify-center rounded-full bg-black/40"
              >
                <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={20} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          <View className="absolute bottom-4 left-5 right-5 gap-1.5">
            <View className="flex-row items-center gap-1.5 self-start rounded-full bg-black/40 px-2.5 py-1">
              <Ionicons name={PLATFORM_ICONS[recipe.video_platform]} size={12} color="#FFFFFF" />
              <Text className="text-xs font-medium text-white">{PLATFORM_LABELS[recipe.video_platform]}</Text>
            </View>
            <Text className="text-2xl font-bold text-white">{recipe.title}</Text>
            {recipe.creator_name ? <Text className="text-sm text-white/80">{recipe.creator_name}</Text> : null}
          </View>
        </View>

        <View className="gap-6 px-5 pt-5">
          {recipe.creator_name ? (
            <View className="flex-row items-center gap-2 rounded-2xl bg-accent/10 px-4 py-3">
              <Ionicons name="sparkles" size={16} color="#1B4332" />
              <Text className="flex-1 text-sm text-primary">
                From <Text className="font-semibold">{recipe.creator_name}</Text>
              </Text>
            </View>
          ) : null}

          {recipe.description ? (
            <Text className="text-sm leading-5 text-text-muted">{recipe.description}</Text>
          ) : null}

          <View className="flex-row rounded-3xl bg-surface p-4" style={cardShadow}>
            <View className="flex-1 items-center gap-1">
              <Ionicons name="alarm-outline" size={18} color="#6B7280" />
              <Text className="text-sm font-semibold text-text">{recipe.prep_time_minutes ?? '–'}m</Text>
              <Text className="text-xs text-text-muted">Prep</Text>
            </View>
            <View className="w-px bg-border" />
            <View className="flex-1 items-center gap-1">
              <Ionicons name="flame-outline" size={18} color="#6B7280" />
              <Text className="text-sm font-semibold text-text">{recipe.cook_time_minutes ?? '–'}m</Text>
              <Text className="text-xs text-text-muted">Cook</Text>
            </View>
            <View className="w-px bg-border" />
            <View className="flex-1 items-center gap-1.5">
              <View className="flex-row items-center gap-3">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Decrease servings"
                  onPress={() => {
                    haptics.selection();
                    setServings(Math.max(1, currentServings - 1));
                  }}
                  hitSlop={10}
                  className="h-6 w-6 items-center justify-center rounded-full bg-border"
                >
                  <Ionicons name="remove" size={14} color="#1C1C1E" />
                </Pressable>
                <Text className="text-sm font-semibold text-text">{currentServings}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Increase servings"
                  onPress={() => {
                    haptics.selection();
                    setServings(currentServings + 1);
                  }}
                  hitSlop={10}
                  className="h-6 w-6 items-center justify-center rounded-full bg-border"
                >
                  <Ionicons name="add" size={14} color="#1C1C1E" />
                </Pressable>
              </View>
              <Text className="text-xs text-text-muted">Servings</Text>
            </View>
          </View>

          {recipe.dietary_tags.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {recipe.dietary_tags.map((tag) => (
                <Badge key={tag} label={tag} tone="primary" />
              ))}
            </View>
          ) : null}

          <View className="gap-2">
            <Text className="text-lg font-bold text-text">Ingredients</Text>
            <View>
              {scaledIngredients.map((ingredient, index) => (
                <IngredientRow
                  key={`${ingredient.name}-${index}`}
                  ingredient={ingredient}
                  checked={isIngredientChecked(recipe.id, index)}
                  onToggle={() => toggleIngredientChecked(recipe.id, index)}
                />
              ))}
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-lg font-bold text-text">Method</Text>
            <View>
              {recipe.steps.map((step, index) => (
                <StepRow key={index} index={index} step={step} />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="gap-2 border-t border-border bg-surface px-5 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
        <Button label="Cook now" onPress={() => router.push(`/cook/${recipe.id}`)} />
        <View className="flex-row gap-2">
          <Button
            label="Add to meal plan"
            variant="outline"
            className="flex-1"
            onPress={() => setIsMealPlanSheetOpen(true)}
          />
          <Button
            label="Add to shopping list"
            variant="outline"
            className="flex-1"
            onPress={handleAddToShoppingList}
            loading={addToShoppingList.isPending}
          />
        </View>
      </View>

      <MealPlanPickerSheet
        visible={isMealPlanSheetOpen}
        onClose={() => setIsMealPlanSheetOpen(false)}
        recipeId={recipe.id}
      />
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
