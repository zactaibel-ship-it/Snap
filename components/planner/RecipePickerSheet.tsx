import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { Sheet } from '@/components/ui/Sheet';
import { Skeleton } from '@/components/ui/Skeleton';
import { useRecipes } from '@/hooks/useRecipes';
import { haptics } from '@/lib/haptics';
import { applyRecipeFiltersAndSearch, DEFAULT_FILTERS } from '@/lib/recipeFilters';
import type { MealType, Recipe } from '@/lib/database.types';

interface RecipePickerSheetProps {
  visible: boolean;
  onClose: () => void;
  mealType: MealType | null;
  onSelectRecipe: (recipe: Recipe) => void;
}

export function RecipePickerSheet({ visible, onClose, mealType, onSelectRecipe }: RecipePickerSheetProps) {
  const [search, setSearch] = useState('');
  const { data: recipes, isLoading } = useRecipes();

  const results = useMemo(
    () => applyRecipeFiltersAndSearch(recipes ?? [], search, DEFAULT_FILTERS),
    [recipes, search]
  );

  const handleClose = () => {
    setSearch('');
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={handleClose}>
      <View className="gap-4 pb-2" style={{ height: 480 }}>
        <View className="gap-1">
          <Text className="text-xl font-bold text-text">
            {mealType ? `Pick a recipe for ${mealType}` : 'Pick a recipe'}
          </Text>
          <Text className="text-sm text-text-muted">Search your saved recipes.</Text>
        </View>

        <View className="flex-row items-center gap-2 rounded-2xl border border-border bg-surface px-3.5">
          <Ionicons name="search" size={16} color="#6B7280" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search recipes..."
            placeholderTextColor="#6B7280"
            className="h-11 flex-1 text-sm text-text"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search your saved recipes"
          />
        </View>

        {isLoading ? (
          <View className="gap-3">
            {[1, 2, 3].map((key) => (
              <View key={key} className="flex-row items-center gap-3">
                <Skeleton width={48} height={48} radius={12} />
                <View className="flex-1 gap-2">
                  <Skeleton height={13} width="70%" />
                  <Skeleton height={11} width="40%" />
                </View>
              </View>
            ))}
          </View>
        ) : results.length === 0 ? (
          <Text className="py-6 text-center text-sm text-text-muted">
            {recipes?.length ? 'No recipes match your search.' : "You don't have any saved recipes yet."}
          </Text>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Select recipe: ${item.title}`}
                onPress={() => {
                  haptics.selection();
                  onSelectRecipe(item);
                  handleClose();
                }}
                className="min-h-[44px] flex-row items-center gap-3 border-b border-border py-2.5"
              >
                <View className="h-12 w-12 overflow-hidden rounded-xl bg-border">
                  {item.thumbnail_url ? (
                    <Image source={{ uri: item.thumbnail_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
                  ) : (
                    <View className="h-full w-full items-center justify-center">
                      <Ionicons name="restaurant-outline" size={18} color="#6B7280" />
                    </View>
                  )}
                </View>
                <View className="flex-1">
                  <Text numberOfLines={1} className="text-sm font-semibold text-text">
                    {item.title}
                  </Text>
                  {item.creator_name ? (
                    <Text numberOfLines={1} className="text-xs text-text-muted">
                      {item.creator_name}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            )}
          />
        )}
      </View>
    </Sheet>
  );
}
