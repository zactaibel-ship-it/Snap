import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddRecipeSheet } from '@/components/recipe/AddRecipeSheet';
import { RecipeCard } from '@/components/recipe/RecipeCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useRecipes } from '@/hooks/useRecipes';

const TAB_BAR_CLEARANCE = 72;

export default function HomeScreen() {
  const { data: recipes, isLoading } = useRecipes();
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const hasRecipes = (recipes?.length ?? 0) > 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-5 pb-2 pt-4">
        <Text className="text-3xl font-bold text-text">Snip</Text>
        <Text className="text-base text-text-muted">Your recipe feed</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 flex-row flex-wrap gap-3 px-5 pt-2">
          {[1, 2, 3, 4].map((key) => (
            <View key={key} className="w-[47%]">
              <SkeletonCard />
            </View>
          ))}
        </View>
      ) : hasRecipes ? (
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 20 }}
          contentContainerStyle={{ gap: 12, paddingTop: 8, paddingBottom: insets.bottom + TAB_BAR_CLEARANCE + 16 }}
          renderItem={({ item }) => <RecipeCard recipe={item} />}
        />
      ) : (
        <View className="flex-1 items-center justify-center">
          <EmptyState
            illustration={<Ionicons name="restaurant-outline" size={56} color="#52B788" />}
            title="No recipes yet"
            description="Paste your first video link to get started — tap the + button below."
          />
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add a recipe"
        onPress={() => setIsAddSheetOpen(true)}
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
    </SafeAreaView>
  );
}
