import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';

interface ButtonProps extends PressableProps {
  label: string;
  variant?: Variant;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<Variant, { container: string; label: string }> = {
  primary: { container: 'bg-primary', label: 'text-white' },
  // White text on the light-green accent fails WCAG AA contrast (~2.5:1) — dark text clears 6.8:1.
  secondary: { container: 'bg-accent', label: 'text-text' },
  outline: { container: 'bg-transparent border border-border', label: 'text-text' },
  ghost: { container: 'bg-transparent', label: 'text-primary' },
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  icon,
  disabled,
  className,
  ...rest
}: ButtonProps & { className?: string }) {
  const styles = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      className={`min-h-[48px] flex-row items-center justify-center gap-2 rounded-2xl px-6 ${styles.container} ${isDisabled ? 'opacity-50' : ''} ${className ?? ''}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : '#1B4332'} />
      ) : (
        <>
          {icon}
          <Text className={`text-base font-semibold ${styles.label}`}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}
