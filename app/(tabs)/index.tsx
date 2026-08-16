import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, Share, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { MealPlanPickerSheet } from '@/components/planner/MealPlanPickerSheet';
import { AddRecipeSheet } from '@/components/recipe/AddRecipeSheet';
import { FilterSheet } from '@/components/recipe/FilterSheet';
import { RecipeCard } from '@/components/recipe/RecipeCard';
import { ActionSheet } from '@/components/ui/ActionSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useDeleteRecipeWithUndo, useRecipes } from '@/hooks/useRecipes';
import { useAddRecipeToShoppingList } from '@/hooks/useShoppingList';
import { applyRecipeFiltersAndSearch, countActiveFilters, DEFAULT_FILTERS, type RecipeFilters } from '@/lib/recipeFilters';
import { formatTagLabel } from '@/constants/recipeTags';
import { useOnboardingTooltipStore } from '@/stores/onboardingTooltipStore';
import type { Recipe } from '@/lib/database.types';

const TAB_BAR_CLEARANCE = 72;

type ViewMode = 'grid' | 'list';

export default function HomeScreen() {
  const { data: recipes, isLoading, isRefetching, refetch } = useRecipes();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<RecipeFilters>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [actionSheetRecipe, setActionSheetRecipe] = useState<Recipe | null>(null);
  const [mealPlanRecipeId, setMealPlanRecipeId] = useState<string | null>(null);

  const addToShoppingList = useAddRecipeToShoppingList();
  const deleteRecipeWithUndo = useDeleteRecipeWithUndo();

  const shouldShowFabTooltip = useOnboardingTooltipStore((state) => state.shouldShowFabTooltip);
  const dismissFabTooltip = useOnboardingTooltipStore((state) => state.dismissFabTooltip);

  const visibleRecipes = useMemo(
    () => applyRecipeFiltersAndSearch(recipes ?? [], search, filters),
    [recipes, search, filters]
  );

  const activeFilterCount = countActiveFilters(filters);
  const hasAnyRecipes = (recipes?.length ?? 0) > 0;

  const removeFilterChip = (chip: { type: 'platform' | 'cookTime' | 'sort' | 'dietary'; value?: string }) => {
    setFilters((current) => {
      if (chip.type === 'dietary' && chip.value) {
        return { ...current, dietary: current.dietary.filter((tag) => tag !== chip.value) };
      }
      if (chip.type === 'platform') return { ...current, platform: 'all' };
      if (chip.type === 'cookTime') return { ...current, cookTime: 'all' };
      if (chip.type === 'sort') return { ...current, sort: 'newest' };
      return current;
    });
  };

  const handleShareRecipe = async (recipe: Recipe) => {
    try {
      await Share.share({ message: `${recipe.title} — extracted with Snip\n${recipe.source_url}`, url: recipe.source_url });
    } catch {
      // Share sheet dismissed — nothing to do.
    }
  };

  const handleAddToShoppingList = async (recipe: Recipe) => {
    try {
      const result = await addToShoppingList.mutateAsync(recipe);
      const total = result.addedCount + result.mergedCount;
      Alert.alert('Added to shopping list', `${total} ingredient${total === 1 ? '' : 's'} added.`);
    } catch (error) {
      Alert.alert('Something went wrong', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const handleDeleteRecipe = (recipe: Recipe) => {
    Alert.alert('Delete recipe?', `"${recipe.title}" will be removed from your library.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteRecipeWithUndo(recipe) },
    ]);
  };

  const cookTimeChipLabel: Record<Exclude<RecipeFilters['cookTime'], 'all'>, string> = {
    under15: 'Under 15 min',
    under30: 'Under 30 min',
    under60: 'Under 1 hour',
  };

  const sortChipLabel: Record<RecipeFilters['sort'], string> = {
    newest: 'Newest first',
    quickest: 'Quickest first',
    alphabetical: 'A–Z',
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-5 pb-2 pt-4">
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="text-3xl font-bold text-text">Snip</Text>
            <Text className="text-base text-text-muted">Your recipe feed</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
            onPress={() => setViewMode((current) => (current === 'grid' ? 'list' : 'grid'))}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface"
          >
            <Ionicons name={viewMode === 'grid' ? 'list-outline' : 'grid-outline'} size={20} color="#1C1C1E" />
          </Pressable>
        </View>
      </View>

      {hasAnyRecipes ? (
        <View className="gap-2 px-5 pb-2">
          <View className="flex-row items-center gap-2">
            <View className="flex-1 flex-row items-center gap-2 rounded-2xl border border-border bg-surface px-3.5">
              <Ionicons name="search" size={16} color="#6B7280" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search recipes, ingredients, tags..."
                placeholderTextColor="#6B7280"
                className="h-11 flex-1 text-sm text-text"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {search ? (
                <Pressable accessibilityLabel="Clear search" onPress={() => setSearch('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color="#6B7280" />
                </Pressable>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Filter and sort"
              onPress={() => setIsFilterSheetOpen(true)}
              className="h-11 w-11 items-center justify-center rounded-2xl border border-border bg-surface"
            >
              <Ionicons name="options-outline" size={18} color="#1C1C1E" />
              {activeFilterCount > 0 ? (
                <View className="absolute -right-1 -top-1 h-4 w-4 items-center justify-center rounded-full bg-primary">
                  <Text className="text-[10px] font-bold text-white">{activeFilterCount}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>

          {activeFilterCount > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {filters.platform !== 'all' ? (
                <FilterChip label={filters.platform} onDismiss={() => removeFilterChip({ type: 'platform' })} />
              ) : null}
              {filters.dietary.map((tag) => (
                <FilterChip
                  key={tag}
                  label={formatTagLabel(tag)}
                  onDismiss={() => removeFilterChip({ type: 'dietary', value: tag })}
                />
              ))}
              {filters.cookTime !== 'all' ? (
                <FilterChip
                  label={cookTimeChipLabel[filters.cookTime]}
                  onDismiss={() => removeFilterChip({ type: 'cookTime' })}
                />
              ) : null}
              {filters.sort !== 'newest' ? (
                <FilterChip label={sortChipLabel[filters.sort]} onDismiss={() => removeFilterChip({ type: 'sort' })} />
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {isLoading ? (
        <View className="flex-1 flex-row flex-wrap gap-3 px-5 pt-2">
          {[1, 2, 3, 4].map((key) => (
            <View key={key} className="w-[47%]">
              <SkeletonCard />
            </View>
          ))}
        </View>
      ) : hasAnyRecipes ? (
        visibleRecipes.length > 0 ? (
          <FlatList
            key={viewMode}
            data={visibleRecipes}
            keyExtractor={(item) => item.id}
            numColumns={viewMode === 'grid' ? 2 : 1}
            columnWrapperStyle={viewMode === 'grid' ? { gap: 12, paddingHorizontal: 20 } : undefined}
            contentContainerStyle={{
              gap: 12,
              paddingTop: 8,
              paddingHorizontal: viewMode === 'list' ? 20 : undefined,
              paddingBottom: insets.bottom + TAB_BAR_CLEARANCE + 16,
            }}
            refreshing={isRefetching}
            onRefresh={refetch}
            renderItem={({ item }) => (
              <RecipeCard recipe={item} layout={viewMode} onLongPress={() => setActionSheetRecipe(item)} />
            )}
          />
        ) : (
          <View className="flex-1 items-center justify-center px-8">
            <EmptyState
              illustration={<Ionicons name="search-outline" size={48} color="#6B7280" />}
              title="No matches"
              description="Try a different search term or adjust your filters."
            />
          </View>
        )
      ) : (
        <View className="flex-1 items-center justify-center">
          <EmptyState
            illustration={<Ionicons name="restaurant-outline" size={56} color="#52B788" />}
            title="No recipes yet"
            description="Paste your first video link to get started — tap the + button below."
          />
        </View>
      )}

      {shouldShowFabTooltip && (
        <View
          className="absolute right-5 items-end"
          style={{ bottom: insets.bottom + TAB_BAR_CLEARANCE + 72 }}
          pointerEvents="none"
        >
          <View className="max-w-[180px] rounded-2xl bg-text px-3.5 py-2.5">
            <Text className="text-sm font-medium text-white">Tap + to save your first recipe</Text>
          </View>
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add a recipe"
        onPress={() => {
          dismissFabTooltip();
          setIsAddSheetOpen(true);
        }}
        className="absolute right-5 h-16 w-16 items-center justify-center rounded-full bg-primary"
        style={{
          bottom: insets.bottom + TAB_BAR_CLEARANCE,
          shadowColor: '#1B4332',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
          elevation: 6,
        }}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </Pressable>

      <AddRecipeSheet visible={isAddSheetOpen} onClose={() => setIsAddSheetOpen(false)} />

      <FilterSheet
        visible={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        filters={filters}
        onChange={setFilters}
      />

      <ActionSheet
        visible={!!actionSheetRecipe}
        onClose={() => setActionSheetRecipe(null)}
        title={actionSheetRecipe?.title}
        options={
          actionSheetRecipe
            ? [
                {
                  label: 'Add to Meal Plan',
                  icon: 'calendar-outline',
                  onPress: () => setMealPlanRecipeId(actionSheetRecipe.id),
                },
                {
                  label: 'Add to Shopping List',
                  icon: 'cart-outline',
                  onPress: () => handleAddToShoppingList(actionSheetRecipe),
                },
                {
                  label: 'Share',
                  icon: 'share-outline',
                  onPress: () => handleShareRecipe(actionSheetRecipe),
                },
                {
                  label: 'Delete',
                  icon: 'trash-outline',
                  destructive: true,
                  onPress: () => handleDeleteRecipe(actionSheetRecipe),
                },
              ]
            : []
        }
      />

      <MealPlanPickerSheet
        visible={!!mealPlanRecipeId}
        onClose={() => setMealPlanRecipeId(null)}
        recipeId={mealPlanRecipeId ?? ''}
      />
    </SafeAreaView>
  );
}

function FilterChip({ label, onDismiss }: { label: string; onDismiss: () => void }) {
  return (
    <View className="flex-row items-center gap-1.5 rounded-full bg-primary/10 py-1 pl-3 pr-2">
      <Text className="text-xs font-medium capitalize text-primary">{label}</Text>
      <Pressable accessibilityLabel={`Remove ${label} filter`} onPress={onDismiss} hitSlop={8}>
        <Ionicons name="close" size={12} color="#1B4332" />
      </Pressable>
    </View>
  );
}
