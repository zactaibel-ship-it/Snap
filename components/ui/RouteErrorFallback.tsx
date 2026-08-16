import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ErrorBoundaryProps } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { logger } from '@/lib/logger';

import { Button } from './Button';

/** Export this as `ErrorBoundary` from a route file to have expo-router catch render
 * crashes on that screen and show this fallback instead of a blank white screen. */
export function RouteErrorFallback({ error, retry }: ErrorBoundaryProps) {
  logger.error('Route crashed:', error);

  return (
    <SafeAreaView className="flex-1 items-center justify-center gap-4 bg-background px-8">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-error/10">
        <Ionicons name="warning-outline" size={32} color="#EF4444" />
      </View>
      <View className="items-center gap-1.5">
        <Text className="text-center text-lg font-bold text-text">Something went wrong</Text>
        <Text className="text-center text-sm text-text-muted">
          This screen ran into a problem. You can try again, or restart the app if it keeps happening.
        </Text>
      </View>
      <Button
        label="Try again"
        variant="outline"
        onPress={retry}
        className="mt-2 px-8"
        accessibilityLabel="Retry this screen"
      />
    </SafeAreaView>
  );
}
