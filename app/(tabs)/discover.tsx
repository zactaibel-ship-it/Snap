import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/EmptyState';

export default function DiscoverScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-5 pb-2 pt-4">
        <Text className="text-3xl font-bold text-text">Discover</Text>
        <Text className="text-base text-text-muted">Follow your favourite cooking creators</Text>
      </View>
      <View className="flex-1 items-center justify-center">
        <EmptyState
          illustration={<Ionicons name="compass-outline" size={56} color="#52B788" />}
          title="No creators followed"
          description="Follow YouTube and TikTok creators to auto-import their new recipes."
        />
      </View>
    </SafeAreaView>
  );
}
