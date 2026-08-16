import { Text, View } from 'react-native';

import { Button } from './Button';

interface EmptyStateProps {
  illustration?: React.ReactNode;
  title: string;
  description: string;
  ctaLabel?: string;
  onPressCta?: () => void;
}

export function EmptyState({
  illustration,
  title,
  description,
  ctaLabel,
  onPressCta,
}: EmptyStateProps) {
  return (
    <View className="items-center justify-center gap-4 px-8 py-12">
      {illustration}
      <View className="items-center gap-1.5">
        <Text className="text-center text-lg font-bold text-text">{title}</Text>
        <Text className="text-center text-sm text-text-muted">{description}</Text>
      </View>
      {ctaLabel && onPressCta ? (
        <Button label={ctaLabel} onPress={onPressCta} className="mt-2 px-8" />
      ) : null}
    </View>
  );
}
