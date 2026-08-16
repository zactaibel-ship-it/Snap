import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { Link } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

export default function SignInScreen() {
  const { signInWithEmail, signInWithApple } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignIn = async () => {
    setIsSubmitting(true);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (error) {
      Alert.alert('Sign in failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await signInWithApple();
    } catch (error) {
      if (error instanceof Error && error.message.includes('ERR_REQUEST_CANCELED')) return;
      Alert.alert('Apple sign in failed', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-center px-6"
      >
        <View className="mb-10 gap-2">
          <Text className="text-3xl font-bold text-text">Welcome back</Text>
          <Text className="text-base text-text-muted">Sign in to keep cooking with Snip.</Text>
        </View>

        <View className="gap-4">
          <Input
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
          />
          <Input
            label="Password"
            secureTextEntry
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
          />
          <Button
            label="Sign in"
            onPress={handleSignIn}
            loading={isSubmitting}
            disabled={!email || !password}
            className="mt-2"
          />

          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={16}
              style={{ height: 48 }}
              onPress={handleAppleSignIn}
            />
          )}
        </View>

        <View className="mt-8 flex-row justify-center gap-1.5">
          <Text className="text-sm text-text-muted">Don&apos;t have an account?</Text>
          <Link href="/auth/sign-up">
            <Text className="text-sm font-semibold text-primary">Sign up</Text>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
