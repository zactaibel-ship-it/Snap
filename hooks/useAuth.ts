import { useCallback, useEffect } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';

import { loginRevenueCatUser, logoutRevenueCatUser } from '@/lib/revenuecat';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Database, SupermarketPreference } from '@/lib/database.types';

export function useAuth() {
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isProfileLoaded = useAuthStore((state) => state.isProfileLoaded);
  const setSession = useAuthStore((state) => state.setSession);
  const setProfile = useAuthStore((state) => state.setProfile);
  const setInitialized = useAuthStore((state) => state.setInitialized);
  const setProfileLoaded = useAuthStore((state) => state.setProfileLoaded);
  const reset = useAuthStore((state) => state.reset);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setInitialized(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, [setSession, setInitialized]);

  useEffect(() => {
    if (session?.user) {
      loginRevenueCatUser(session.user.id).catch((error) =>
        console.warn('Failed to log in RevenueCat user', error)
      );
    } else {
      logoutRevenueCatUser();
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      setProfileLoaded(false);
      return;
    }

    let cancelled = false;

    supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setProfile(data ?? null);
          setProfileLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user, setProfile, setProfileLoaded]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, fullName: string) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw error;
    },
    []
  );

  const signInWithApple = useCallback(async () => {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('Apple Sign In did not return an identity token.');
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    reset();
  }, [reset]);

  const completeOnboarding = useCallback(
    async (dietaryPreferences: string[], supermarketPreference: SupermarketPreference) => {
      if (!session?.user) throw new Error('Not signed in.');

      const payload: Database['public']['Tables']['users']['Insert'] = {
        id: session.user.id,
        email: session.user.email ?? '',
        full_name: (session.user.user_metadata?.full_name as string | undefined) ?? null,
        avatar_url: null,
        dietary_preferences: dietaryPreferences,
        supermarket_preference: supermarketPreference,
      };

      const { data, error } = await supabase.from('users').upsert(payload).select('*').single();

      if (error) throw error;
      setProfile(data);
    },
    [session?.user, setProfile]
  );

  return {
    session,
    profile,
    isSignedIn: !!session,
    isInitialized,
    needsOnboarding: !!session && isProfileLoaded && !profile,
    signInWithEmail,
    signUpWithEmail,
    signInWithApple,
    signOut,
    completeOnboarding,
  };
}
