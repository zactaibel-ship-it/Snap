import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { formatQuantity } from '@/lib/scaling';
import type { Recipe, ShoppingListItem } from '@/lib/database.types';

interface ShoppingItemProps {
  item: ShoppingListItem;
  recipesById: Map<string, Recipe>;
  onToggle: () => void;
  onDelete: () => void;
}

function DeleteAction({ progress, onDelete }: { progress: SharedValue<number>; onDelete: () => void }) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - Math.min(progress.value, 1)) * 72 }],
  }));

  return (
    <Animated.View style={[{ width: 72 }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Delete item"
        onPress={onDelete}
        className="h-full flex-1 items-center justify-center bg-error"
      >
        <Ionicons name="trash" size={20} color="#FFFFFF" />
      </Pressable>
    </Animated.View>
  );
}

export function ShoppingItem({ item, recipesById, onToggle, onDelete }: ShoppingItemProps) {
  const amount = [item.quantity != null ? formatQuantity(item.quantity) : null, item.unit].filter(Boolean).join(' ');
  const recipeChips = item.source_recipe_ids
    .map((id) => recipesById.get(id))
    .filter((recipe): recipe is Recipe => !!recipe);

  return (
    <Swipeable
      renderRightActions={(progress) => <DeleteAction progress={progress} onDelete={onDelete} />}
      overshootRight={false}
    >
      <View className="flex-row items-center gap-3 bg-surface px-4 py-3">
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: item.checked }}
          onPress={onToggle}
          className={`h-6 w-6 items-center justify-center rounded-full border-2 ${
            item.checked ? 'border-primary bg-primary' : 'border-border'
          }`}
        >
          {item.checked ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
        </Pressable>

        <View className="flex-1 gap-1">
          <View className="flex-row flex-wrap items-baseline gap-1.5">
            <Text className={`text-sm font-semibold ${item.checked ? 'text-text-muted line-through' : 'text-text'}`}>
              {item.ingredient_name}
            </Text>
            {amount ? (
              <Text className={`text-xs ${item.checked ? 'text-text-muted line-through' : 'text-text-muted'}`}>
                {amount}
              </Text>
            ) : null}
          </View>
          {recipeChips.length > 0 ? (
            <View className="flex-row flex-wrap gap-1.5">
              {recipeChips.map((recipe) => (
                <Pressable
                  key={recipe.id}
                  onPress={() => router.push(`/recipe/${recipe.id}`)}
                  className="rounded-full bg-primary/10 px-2 py-0.5"
                >
                  <Text numberOfLines={1} className="text-[10px] font-medium text-primary">
                    {recipe.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </Swipeable>
  );
}
