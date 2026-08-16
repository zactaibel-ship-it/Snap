import { View, type ViewProps } from 'react-native';

export function Card({ className, style, ...rest }: ViewProps & { className?: string }) {
  return (
    <View
      className={`rounded-3xl bg-surface p-4 ${className ?? ''}`}
      style={[
        {
          shadowColor: '#1C1C1E',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2,
        },
        style,
      ]}
      {...rest}
    />
  );
}
