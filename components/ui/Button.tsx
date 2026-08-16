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
  secondary: { container: 'bg-accent', label: 'text-white' },
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
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? '#1B4332' : '#FFFFFF'} />
      ) : (
        <>
          {icon}
          <Text className={`text-base font-semibold ${styles.label}`}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}
