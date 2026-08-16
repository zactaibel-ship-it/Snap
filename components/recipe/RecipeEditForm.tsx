import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DIETARY_TAGS, formatTagLabel } from '@/constants/recipeTags';
import { useUpdateRecipe } from '@/hooks/useRecipes';
import type { Recipe } from '@/lib/database.types';

interface DraftIngredient {
  name: string;
  quantity: string;
  unit: string;
  aisle: string | null;
}

function toDraftIngredients(recipe: Recipe): DraftIngredient[] {
  return recipe.ingredients.map((ingredient) => ({
    name: ingredient.name,
    quantity: ingredient.quantity != null ? String(ingredient.quantity) : '',
    unit: ingredient.unit ?? '',
    aisle: ingredient.aisle,
  }));
}

interface RecipeEditFormProps {
  recipe: Recipe;
  onCancel: () => void;
  onSaved: () => void;
  onDelete: () => void;
}

export function RecipeEditForm({ recipe, onCancel, onSaved, onDelete }: RecipeEditFormProps) {
  const [title, setTitle] = useState(recipe.title);
  const [description, setDescription] = useState(recipe.description ?? '');
  const [servings, setServings] = useState(String(recipe.servings));
  const [prepTime, setPrepTime] = useState(recipe.prep_time_minutes != null ? String(recipe.prep_time_minutes) : '');
  const [cookTime, setCookTime] = useState(recipe.cook_time_minutes != null ? String(recipe.cook_time_minutes) : '');
  const [dietaryTags, setDietaryTags] = useState<string[]>(recipe.dietary_tags);
  const [ingredients, setIngredients] = useState<DraftIngredient[]>(toDraftIngredients(recipe));
  const [steps, setSteps] = useState<string[]>(recipe.steps);

  const updateRecipe = useUpdateRecipe();

  const toggleDietaryTag = (tag: string) => {
    setDietaryTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]));
  };

  const updateIngredient = (index: number, patch: Partial<DraftIngredient>) => {
    setIngredients((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeIngredient = (index: number) => {
    setIngredients((current) => current.filter((_, i) => i !== index));
  };

  const addIngredient = () => {
    setIngredients((current) => [...current, { name: '', quantity: '', unit: '', aisle: 'other' }]);
  };

  const updateStep = (index: number, value: string) => {
    setSteps((current) => current.map((item, i) => (i === index ? value : item)));
  };

  const removeStep = (index: number) => {
    setSteps((current) => current.filter((_, i) => i !== index));
  };

  const addStep = () => {
    setSteps((current) => [...current, '']);
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    const cleanedIngredients = ingredients.filter((ingredient) => ingredient.name.trim().length > 0);
    const cleanedSteps = steps.map((step) => step.trim()).filter((step) => step.length > 0);

    if (!trimmedTitle) {
      Alert.alert('Title required', 'Give this recipe a title before saving.');
      return;
    }
    if (cleanedIngredients.length === 0) {
      Alert.alert('Add an ingredient', 'This recipe needs at least one ingredient.');
      return;
    }
    if (cleanedSteps.length === 0) {
      Alert.alert('Add a step', 'This recipe needs at least one method step.');
      return;
    }

    try {
      await updateRecipe.mutateAsync({
        id: recipe.id,
        updates: {
          title: trimmedTitle,
          description: description.trim() || null,
          servings: Number(servings) > 0 ? Math.round(Number(servings)) : recipe.servings,
          prep_time_minutes: prepTime.trim() ? Math.max(0, Math.round(Number(prepTime))) : null,
          cook_time_minutes: cookTime.trim() ? Math.max(0, Math.round(Number(cookTime))) : null,
          dietary_tags: dietaryTags,
          ingredients: cleanedIngredients.map((ingredient) => ({
            name: ingredient.name.trim(),
            quantity: ingredient.quantity.trim() ? Number(ingredient.quantity) : null,
            unit: ingredient.unit.trim() || null,
            aisle: ingredient.aisle,
          })),
          steps: cleanedSteps,
        },
      });
      onSaved();
    } catch (error) {
      Alert.alert('Something went wrong', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete recipe?', `"${recipe.title}" will be removed from your library.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between border-b border-border px-5 py-3">
        <Pressable
          onPress={onCancel}
          disabled={updateRecipe.isPending}
          accessibilityRole="button"
          accessibilityLabel="Cancel editing"
          accessibilityState={{ disabled: updateRecipe.isPending }}
        >
          <Text className="text-base text-text-muted">Cancel</Text>
        </Pressable>
        <Text className="text-base font-bold text-text">Edit recipe</Text>
        <Pressable
          onPress={handleSave}
          disabled={updateRecipe.isPending}
          accessibilityRole="button"
          accessibilityLabel="Save recipe"
          accessibilityState={{ disabled: updateRecipe.isPending, busy: updateRecipe.isPending }}
        >
          <Text className="text-base font-bold text-primary">{updateRecipe.isPending ? 'Saving...' : 'Save'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }} keyboardShouldPersistTaps="handled">
        <Input label="Title" value={title} onChangeText={setTitle} placeholder="Recipe title" />

        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="A short summary of this recipe"
          multiline
          numberOfLines={3}
          className="min-h-[80px] py-3"
        />

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Input label="Servings" value={servings} onChangeText={setServings} keyboardType="number-pad" />
          </View>
          <View className="flex-1">
            <Input label="Prep (min)" value={prepTime} onChangeText={setPrepTime} keyboardType="number-pad" />
          </View>
          <View className="flex-1">
            <Input label="Cook (min)" value={cookTime} onChangeText={setCookTime} keyboardType="number-pad" />
          </View>
        </View>

        <View className="gap-2.5">
          <Text className="text-sm font-medium text-text">Dietary tags</Text>
          <View className="flex-row flex-wrap gap-2">
            {DIETARY_TAGS.map((tag) => {
              const selected = dietaryTags.includes(tag);
              return (
                <Pressable
                  key={tag}
                  onPress={() => toggleDietaryTag(tag)}
                  accessibilityRole="checkbox"
                  accessibilityLabel={formatTagLabel(tag)}
                  accessibilityState={{ checked: selected }}
                  className={`rounded-2xl border px-3.5 py-2 ${
                    selected ? 'border-primary bg-primary' : 'border-border bg-surface'
                  }`}
                >
                  <Text className={`text-sm font-medium ${selected ? 'text-white' : 'text-text'}`}>
                    {formatTagLabel(tag)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="gap-2.5">
          <Text className="text-sm font-medium text-text">Ingredients</Text>
          <View className="gap-2">
            {ingredients.map((ingredient, index) => (
              <View key={index} className="flex-row items-center gap-2">
                <TextInput
                  value={ingredient.name}
                  onChangeText={(value) => updateIngredient(index, { name: value })}
                  placeholder="Ingredient"
                  placeholderTextColor="#6B7280"
                  className="h-11 flex-[2] rounded-xl border border-border bg-surface px-3 text-sm text-text"
                />
                <TextInput
                  value={ingredient.quantity}
                  onChangeText={(value) => updateIngredient(index, { quantity: value })}
                  placeholder="Qty"
                  placeholderTextColor="#6B7280"
                  keyboardType="decimal-pad"
                  className="h-11 flex-1 rounded-xl border border-border bg-surface px-3 text-sm text-text"
                />
                <TextInput
                  value={ingredient.unit}
                  onChangeText={(value) => updateIngredient(index, { unit: value })}
                  placeholder="Unit"
                  placeholderTextColor="#6B7280"
                  className="h-11 flex-1 rounded-xl border border-border bg-surface px-3 text-sm text-text"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove ingredient"
                  onPress={() => removeIngredient(index)}
                  hitSlop={11}
                >
                  <Ionicons name="close-circle" size={22} color="#EF4444" />
                </Pressable>
              </View>
            ))}
          </View>
          <Button label="Add ingredient" variant="outline" onPress={addIngredient} />
        </View>

        <View className="gap-2.5">
          <Text className="text-sm font-medium text-text">Method</Text>
          <View className="gap-2">
            {steps.map((step, index) => (
              <View key={index} className="flex-row items-start gap-2">
                <Text className="mt-3 w-5 text-xs font-bold text-primary">{index + 1}.</Text>
                <TextInput
                  value={step}
                  onChangeText={(value) => updateStep(index, value)}
                  placeholder={`Step ${index + 1}`}
                  placeholderTextColor="#6B7280"
                  multiline
                  className="min-h-[44px] flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove step"
                  onPress={() => removeStep(index)}
                  hitSlop={11}
                  className="mt-2"
                >
                  <Ionicons name="close-circle" size={22} color="#EF4444" />
                </Pressable>
              </View>
            ))}
          </View>
          <Button label="Add step" variant="outline" onPress={addStep} />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={handleDelete}
          className="items-center rounded-2xl border border-error/30 bg-error/5 py-3.5"
        >
          <Text className="text-sm font-semibold text-error">Delete recipe</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
