import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-lg font-bold text-text">Recipe detail</Text>
        <Text className="mt-1 text-sm text-text-muted">Recipe {id} coming soon.</Text>
      </View>
    </SafeAreaView>
  );
}
