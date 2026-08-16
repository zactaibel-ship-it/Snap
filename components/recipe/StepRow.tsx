import { Text, View } from 'react-native';

interface StepRowProps {
  index: number;
  step: string;
}

export function StepRow({ index, step }: StepRowProps) {
  return (
    <View className="flex-row gap-3 py-2.5">
      <View className="h-7 w-7 items-center justify-center rounded-full bg-primary/10">
        <Text className="text-xs font-bold text-primary">{index + 1}</Text>
      </View>
      <Text className="flex-1 pt-0.5 text-sm leading-5 text-text">{step}</Text>
    </View>
  );
}
