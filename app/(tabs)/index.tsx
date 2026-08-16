import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/EmptyState';

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-5 pb-2 pt-4">
        <Text className="text-3xl font-bold text-text">Snip</Text>
        <Text className="text-base text-text-muted">Your recipe feed</Text>
      </View>
      <View className="flex-1 items-center justify-center">
        <EmptyState
          illustration={<Ionicons name="restaurant-outline" size={56} color="#52B788" />}
          title="No recipes yet"
          description="Paste a YouTube, TikTok, or Instagram Reel link to extract your first recipe."
        />
      </View>
    </SafeAreaView>
  );
}
