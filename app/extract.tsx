import { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RecipeExtractingLoader } from '@/components/recipe/RecipeExtractingLoader';
import { Button } from '@/components/ui/Button';
import { useExtractRecipe } from '@/hooks/useRecipes';
import { ExtractionLimitError } from '@/lib/api/extract';
import { useExtractionStore } from '@/stores/extractionStore';

/**
 * Receives a shared TikTok/Instagram link handed off from the iOS share
 * extension (ShareExtension.tsx → openHostApp('extract?url=...')) and runs
 * it straight through the normal extraction pipeline.
 */
export default function ExtractFromShareScreen() {
  const { url } = useLocalSearchParams<{ url: string }>();
  const { mutateAsync } = useExtractRecipe();
  const status = useExtractionStore((state) => state.status);
  const error = useExtractionStore((state) => state.error);
  const reset = useExtractionStore((state) => state.reset);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current || !url) return;
    hasStarted.current = true;

    mutateAsync(url)
      .then(({ recipe }) => {
        router.replace(`/recipe/${recipe.id}`);
      })
      .catch((error) => {
        if (error instanceof ExtractionLimitError) {
          // The paywall opens itself (via useExtractRecipe's onError) on top of whatever's underneath.
          router.replace('/(tabs)');
          return;
        }
        // Other errors are surfaced via extractionStore and rendered below.
      });
  }, [url, mutateAsync]);

  const handleDismiss = () => {
    reset();
    router.replace('/(tabs)');
  };

  return (
    <View className="flex-1 items-center justify-center bg-black/60 px-6">
      <SafeAreaView className="w-full max-w-sm rounded-3xl bg-surface p-6">
        {!url ? (
          <View className="items-center gap-3">
            <Text className="text-center text-base font-semibold text-text">Nothing to save</Text>
            <Button label="Close" variant="outline" onPress={handleDismiss} />
          </View>
        ) : status === 'error' ? (
          <View className="items-center gap-3">
            <Text className="text-center text-base font-semibold text-text">Couldn&apos;t save this recipe</Text>
            {error ? <Text className="text-center text-sm text-text-muted">{error}</Text> : null}
            <Button label="OK" variant="outline" onPress={handleDismiss} />
          </View>
        ) : (
          <View className="items-center gap-2">
            <Text className="text-center text-lg font-bold text-text">Saving from your share...</Text>
            <RecipeExtractingLoader status={status === 'idle' ? 'fetching' : status} />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
