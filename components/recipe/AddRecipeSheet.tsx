import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { useExtractRecipe } from '@/hooks/useRecipes';
import { useExtractionStore } from '@/stores/extractionStore';

import { RecipeExtractingLoader } from './RecipeExtractingLoader';

interface AddRecipeSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function AddRecipeSheet({ visible, onClose }: AddRecipeSheetProps) {
  const [url, setUrl] = useState('');
  const { mutateAsync, isPending } = useExtractRecipe();
  const status = useExtractionStore((state) => state.status);
  const error = useExtractionStore((state) => state.error);
  const reset = useExtractionStore((state) => state.reset);

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setUrl(text.trim());
  };

  const handleSubmit = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    try {
      const { recipe, lowConfidence } = await mutateAsync(trimmedUrl);
      setUrl('');
      onClose();
      router.push(`/recipe/${recipe.id}`);
      if (lowConfidence) {
        Alert.alert(
          'Double-check this one',
          "We didn't have much to go on for this video, so a few details may be off — take a look before you cook."
        );
      }
    } catch {
      // The error is already surfaced via the extraction store — stay open for retry.
    }
  };

  const handleClose = () => {
    if (isPending) return;
    reset();
    setUrl('');
    onClose();
  };

  const isExtracting = isPending && status !== 'error';

  return (
    <Sheet visible={visible} onClose={handleClose}>
      <View className="gap-5 pb-2">
        <View className="gap-1">
          <Text className="text-xl font-bold text-text">Add a recipe</Text>
          <Text className="text-sm text-text-muted">
            Paste a YouTube, TikTok, or Instagram Reel link.
          </Text>
        </View>

        {isExtracting ? (
          <RecipeExtractingLoader status={status} />
        ) : (
          <>
            <View className="flex-row items-start gap-2">
              <View className="flex-1">
                <Input
                  placeholder="https://..."
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  value={url}
                  onChangeText={setUrl}
                />
              </View>
              <Button label="Paste" variant="outline" onPress={handlePaste} className="px-4" />
            </View>

            {status === 'error' && error ? <Text className="text-sm text-error">{error}</Text> : null}

            <Button
              label={status === 'error' ? 'Try again' : 'Extract recipe'}
              onPress={handleSubmit}
              disabled={!url.trim()}
              loading={isPending}
            />
          </>
        )}
      </View>
    </Sheet>
  );
}
