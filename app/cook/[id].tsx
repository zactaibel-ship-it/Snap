import { useEffect, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import ConfettiCannon from 'react-native-confetti-cannon';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { IngredientRow } from '@/components/recipe/IngredientRow';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useRecipe, useUpdateRecipe } from '@/hooks/useRecipes';
import { useIngredientCheckStore } from '@/stores/ingredientCheckStore';

function PrepStat({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="items-center gap-1">
      <Ionicons name={icon} size={22} color="#FFFFFF" />
      <Text className="text-lg font-bold text-white">{value}</Text>
      <Text className="text-xs text-white/60">{label}</Text>
    </View>
  );
}

export default function CookModeScreen() {
  useKeepAwake();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: recipe, isLoading } = useRecipe(id);
  const updateRecipe = useUpdateRecipe();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const isChecked = useIngredientCheckStore((state) => state.isChecked);
  const toggleChecked = useIngredientCheckStore((state) => state.toggle);

  const scrollRef = useRef<ScrollView>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [isIngredientsOpen, setIsIngredientsOpen] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);

  const steps = recipe?.steps ?? [];
  const totalPages = steps.length + 2; // prep info + steps + completion
  const isPrepPage = pageIndex === 0;
  const isCompletionPage = pageIndex === steps.length + 1;
  const progress = steps.length === 0 ? 1 : Math.min(pageIndex, steps.length) / steps.length;

  const progressValue = useSharedValue(0);
  useEffect(() => {
    progressValue.value = withTiming(progress, { duration: 250 });
  }, [progress, progressValue]);
  const progressBarStyle = useAnimatedStyle(() => ({ width: `${progressValue.value * 100}%` }));

  useEffect(() => {
    if (isCompletionPage) setIsCelebrating(true);
  }, [isCompletionPage]);

  const goToPage = (index: number) => {
    const clamped = Math.max(0, Math.min(totalPages - 1, index));
    scrollRef.current?.scrollTo({ x: clamped * width, animated: true });
    setPageIndex(clamped);
  };

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setPageIndex(newIndex);
  };

  const handleRate = (rating: number) => {
    if (!recipe) return;
    updateRecipe.mutate({ id: recipe.id, updates: { rating } });
  };

  const checkedCount = recipe ? recipe.ingredients.filter((_, index) => isChecked(recipe.id, index)).length : 0;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-primary">
        <View className="gap-3 p-5">
          <SkeletonCard />
        </View>
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView className="flex-1 bg-primary">
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Text className="text-center text-lg font-bold text-white">Recipe not found</Text>
          <Button label="Go back" variant="outline" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-primary">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar hidden />

      <View style={{ paddingTop: insets.top + 8 }} className="flex-row items-center justify-between px-5">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Exit cook mode"
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full bg-white/10"
        >
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </Pressable>
        <Text className="text-sm font-medium text-white/80">
          {isPrepPage ? 'Get ready' : isCompletionPage ? 'All done' : `Step ${pageIndex} of ${steps.length}`}
        </Text>
        <View className="h-11 w-11" />
      </View>

      <View className="mx-5 mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
        <Animated.View className="h-full rounded-full bg-accent" style={progressBarStyle} />
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        className="flex-1"
      >
        <View style={{ width }} className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-3xl font-bold text-white">{recipe.title}</Text>
          <View className="mt-8 flex-row gap-8">
            <PrepStat icon="people-outline" label="Servings" value={String(recipe.servings)} />
            <PrepStat
              icon="alarm-outline"
              label="Prep"
              value={recipe.prep_time_minutes != null ? `${recipe.prep_time_minutes}m` : '–'}
            />
            <PrepStat
              icon="flame-outline"
              label="Cook"
              value={recipe.cook_time_minutes != null ? `${recipe.cook_time_minutes}m` : '–'}
            />
          </View>
          <Text className="mt-8 text-center text-base text-white/70">
            {recipe.ingredients.length} ingredients · {steps.length} steps
          </Text>
        </View>

        {steps.map((step, index) => (
          <View key={index} style={{ width }} className="flex-1 items-center justify-center px-8">
            <Text className="text-center text-2xl font-semibold leading-9 text-white">{step}</Text>
          </View>
        ))}

        <View style={{ width }} className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-2xl font-bold text-white">Cooked! How did it go?</Text>
          <View className="mt-6 flex-row gap-2">
            {[1, 2, 3, 4, 5].map((star) => {
              const filled = (recipe.rating ?? 0) >= star;
              return (
                <Pressable key={star} accessibilityLabel={`Rate ${star} stars`} onPress={() => handleRate(star)} hitSlop={6}>
                  <Ionicons name={filled ? 'star' : 'star-outline'} size={36} color={filled ? '#52B788' : 'rgba(255,255,255,0.3)'} />
                </Pressable>
              );
            })}
          </View>
          {recipe.rating ? <Text className="mt-3 text-sm text-white/70">Thanks for rating!</Text> : null}
          <Button label="Done" variant="secondary" onPress={() => router.back()} className="mt-10 px-10" />
        </View>
      </ScrollView>

      {!isCompletionPage ? (
        <View className="gap-3 px-5" style={{ paddingBottom: insets.bottom + 16 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setIsIngredientsOpen(true)}
            className="flex-row items-center justify-center gap-2 self-center rounded-full bg-white/10 px-4 py-2"
          >
            <Ionicons name="list-outline" size={16} color="#FFFFFF" />
            <Text className="text-sm font-medium text-white">
              Ingredients ({checkedCount}/{recipe.ingredients.length})
            </Text>
            <Ionicons name="chevron-up" size={14} color="#FFFFFF" />
          </Pressable>

          <View className="flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous"
              disabled={isPrepPage}
              onPress={() => goToPage(pageIndex - 1)}
              className={`h-14 w-14 items-center justify-center rounded-full bg-white/10 ${isPrepPage ? 'opacity-30' : ''}`}
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={pageIndex === steps.length ? 'Finish' : 'Next'}
              onPress={() => goToPage(pageIndex + 1)}
              className="h-14 flex-1 flex-row items-center justify-center gap-2 rounded-full bg-white"
            >
              <Text className="text-base font-bold text-primary">
                {isPrepPage ? 'Start cooking' : pageIndex === steps.length ? 'Finish' : 'Next'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#1B4332" />
            </Pressable>
          </View>
        </View>
      ) : null}

      {isCompletionPage && isCelebrating ? (
        <ConfettiCannon
          count={80}
          origin={{ x: width / 2, y: 0 }}
          fadeOut
          onAnimationEnd={() => setIsCelebrating(false)}
        />
      ) : null}

      <Sheet visible={isIngredientsOpen} onClose={() => setIsIngredientsOpen(false)}>
        <View className="gap-3 pb-2">
          <Text className="text-xl font-bold text-text">Ingredients</Text>
          <View>
            {recipe.ingredients.map((ingredient, index) => (
              <IngredientRow
                key={`${ingredient.name}-${index}`}
                ingredient={ingredient}
                checked={isChecked(recipe.id, index)}
                onToggle={() => toggleChecked(recipe.id, index)}
              />
            ))}
          </View>
        </View>
      </Sheet>
    </View>
  );
}
