import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { formatQuantity } from '@/lib/scaling';
import type { Ingredient } from '@/lib/database.types';

interface IngredientRowProps {
  ingredient: Ingredient;
  checked?: boolean;
  onToggle?: () => void;
}

export function IngredientRow({ ingredient, checked = false, onToggle }: IngredientRowProps) {
  const amount = [ingredient.quantity != null ? formatQuantity(ingredient.quantity) : null, ingredient.unit]
    .filter(Boolean)
    .join(' ');

  return (
    <Pressable onPress={onToggle} className="flex-row items-center gap-3 border-b border-border py-3">
      <View
        className={`h-6 w-6 items-center justify-center rounded-full border-2 ${
          checked ? 'border-primary bg-primary' : 'border-border'
        }`}
      >
        {checked ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
      </View>
      <View className="flex-1 flex-row items-baseline gap-2">
        {amount ? (
          <Text className={`text-sm font-semibold ${checked ? 'text-text-muted line-through' : 'text-text'}`}>
            {amount}
          </Text>
        ) : null}
        <Text className={`flex-1 text-sm ${checked ? 'text-text-muted line-through' : 'text-text'}`}>
          {ingredient.name}
        </Text>
      </View>
    </Pressable>
  );
}
