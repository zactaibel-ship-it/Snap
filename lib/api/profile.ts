import { invokeFunction } from '@/lib/api/invokeFunction';
import { supabase } from '@/lib/supabase';
import type { User } from '@/lib/database.types';

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<User, 'dietary_preferences' | 'supermarket_preference' | 'avatar_url' | 'push_token'>>
): Promise<User> {
  const { data, error } = await supabase.from('users').update(updates).eq('id', userId).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteAccount(): Promise<void> {
  await invokeFunction('delete-account', {});
}
