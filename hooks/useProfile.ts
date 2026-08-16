import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '@/hooks/useAuth';
import { requestAndRegisterPushNotifications } from '@/hooks/usePushNotifications';
import { uploadAvatar } from '@/lib/api/avatar';
import { deleteAccount, updateUserProfile } from '@/lib/api/profile';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { SupermarketPreference } from '@/lib/database.types';

export function useUpdateDietaryPreferences() {
  const { session } = useAuth();
  const setProfile = useAuthStore((state) => state.setProfile);

  return useMutation({
    mutationFn: (dietaryPreferences: string[]) => {
      if (!session?.user) throw new Error('Not signed in.');
      return updateUserProfile(session.user.id, { dietary_preferences: dietaryPreferences });
    },
    onSuccess: setProfile,
  });
}

export function useUpdateSupermarketPreference() {
  const { session } = useAuth();
  const setProfile = useAuthStore((state) => state.setProfile);

  return useMutation({
    mutationFn: (supermarketPreference: SupermarketPreference) => {
      if (!session?.user) throw new Error('Not signed in.');
      return updateUserProfile(session.user.id, { supermarket_preference: supermarketPreference });
    },
    onSuccess: setProfile,
  });
}

export function useUpdateAvatar() {
  const { session } = useAuth();
  const setProfile = useAuthStore((state) => state.setProfile);

  return useMutation({
    mutationFn: async () => {
      if (!session?.user) throw new Error('Not signed in.');

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Photo library access is required to change your avatar.');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0]) return null;

      const avatarUrl = await uploadAvatar(session.user.id, result.assets[0].uri);
      return updateUserProfile(session.user.id, { avatar_url: avatarUrl });
    },
    onSuccess: (profile) => {
      if (profile) setProfile(profile);
    },
  });
}

export function useToggleNotifications() {
  const { session } = useAuth();
  const setProfile = useAuthStore((state) => state.setProfile);

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!session?.user) throw new Error('Not signed in.');
      if (!enabled) {
        return updateUserProfile(session.user.id, { push_token: null });
      }
      await requestAndRegisterPushNotifications(session.user.id);
      const { data, error } = await supabase.from('users').select('*').eq('id', session.user.id).single();
      if (error) throw error;
      return data;
    },
    onSuccess: setProfile,
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const reset = useAuthStore((state) => state.reset);

  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      queryClient.clear();
      reset();
    },
  });
}
