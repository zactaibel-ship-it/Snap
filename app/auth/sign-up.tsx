import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

export default function SignUpScreen() {
  const { signUpWithEmail } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignUp = async () => {
    setIsSubmitting(true);
    try {
      await signUpWithEmail(email.trim(), password, fullName.trim());
    } catch (error) {
      Alert.alert('Sign up failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-center px-6"
      >
        <View className="mb-10 gap-2">
          <Text className="text-3xl font-bold text-text">Create your account</Text>
          <Text className="text-base text-text-muted">Turn any recipe video into a recipe you can cook.</Text>
        </View>

        <View className="gap-4">
          <Input
            label="Full name"
            autoCapitalize="words"
            autoComplete="name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Jamie Oliver"
          />
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
            autoComplete="password-new"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
          />
          <Button
            label="Create account"
            onPress={handleSignUp}
            loading={isSubmitting}
            disabled={!fullName || !email || !password}
            className="mt-2"
          />
        </View>

        <View className="mt-8 flex-row justify-center gap-1.5">
          <Text className="text-sm text-text-muted">Already have an account?</Text>
          <Link href="/auth/sign-in">
            <Text className="text-sm font-semibold text-primary">Sign in</Text>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
