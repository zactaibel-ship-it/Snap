import { forwardRef, useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, className, onFocus, onBlur, ...rest }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <View className="w-full">
        {label ? <Text className="mb-1.5 text-sm font-medium text-text">{label}</Text> : null}
        <TextInput
          ref={ref}
          className={`min-h-[48px] rounded-2xl border bg-surface px-4 text-base text-text ${
            error ? 'border-error' : isFocused ? 'border-primary' : 'border-border'
          } ${className ?? ''}`}
          placeholderTextColor="#6B7280"
          onFocus={(event) => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          {...rest}
        />
        {error ? <Text className="mt-1 text-xs text-error">{error}</Text> : null}
      </View>
    );
  }
);

Input.displayName = 'Input';
