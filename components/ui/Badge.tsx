import { Text, View } from 'react-native';

type Tone = 'neutral' | 'primary' | 'success' | 'error';

interface BadgeProps {
  label: string;
  tone?: Tone;
}

const toneStyles: Record<Tone, { container: string; label: string }> = {
  neutral: { container: 'bg-border/60', label: 'text-text-muted' },
  primary: { container: 'bg-primary/10', label: 'text-primary' },
  success: { container: 'bg-success/10', label: 'text-success' },
  error: { container: 'bg-error/10', label: 'text-error' },
};

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const styles = toneStyles[tone];
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${styles.container}`}>
      <Text className={`text-xs font-medium ${styles.label}`}>{label}</Text>
    </View>
  );
}
