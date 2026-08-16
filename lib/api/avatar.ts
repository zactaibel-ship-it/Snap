import { supabase } from '@/lib/supabase';

/** Uploads a local image (from expo-image-picker) to the public `avatars` storage bucket
 * and returns its public URL. Does not touch users.avatar_url — call sites persist that. */
export async function uploadAvatar(userId: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();

  const path = `${userId}/avatar.jpg`;
  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, arrayBuffer, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  // Cache-bust so the new image shows immediately even though the path is stable.
  return `${data.publicUrl}?t=${Date.now()}`;
}
