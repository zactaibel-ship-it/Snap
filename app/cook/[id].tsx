import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CookModeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <View className="flex-row items-center justify-between px-5 pt-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close cook mode"
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full bg-white/10"
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </Pressable>
      </View>
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-lg font-bold text-white">Cook mode</Text>
        <Text className="mt-1 text-center text-sm text-white/70">
          Step-through cooking for recipe {id} coming soon.
        </Text>
      </View>
    </SafeAreaView>
  );
}
