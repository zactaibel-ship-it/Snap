import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from './Button';

interface NetworkErrorProps {
  onRetry: () => void;
  message?: string;
}

export function NetworkError({ onRetry, message }: NetworkErrorProps) {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-8 py-12">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-error/10">
        <Ionicons name="cloud-offline-outline" size={32} color="#EF4444" />
      </View>
      <View className="items-center gap-1.5">
        <Text className="text-center text-lg font-bold text-text">Something went wrong</Text>
        <Text className="text-center text-sm text-text-muted">
          {message ?? "We couldn't load this right now. Check your connection and try again."}
        </Text>
      </View>
      <Button
        label="Retry"
        variant="outline"
        onPress={onRetry}
        className="mt-2 px-8"
        accessibilityLabel="Retry loading"
      />
    </View>
  );
}
