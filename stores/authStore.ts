import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

import type { User } from '@/lib/database.types';

interface AuthState {
  session: Session | null;
  profile: User | null;
  isInitialized: boolean;
  isProfileLoaded: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: User | null) => void;
  setInitialized: (isInitialized: boolean) => void;
  setProfileLoaded: (isProfileLoaded: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  isInitialized: false,
  isProfileLoaded: false,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setInitialized: (isInitialized) => set({ isInitialized }),
  setProfileLoaded: (isProfileLoaded) => set({ isProfileLoaded }),
  reset: () => set({ session: null, profile: null, isProfileLoaded: false }),
}));
