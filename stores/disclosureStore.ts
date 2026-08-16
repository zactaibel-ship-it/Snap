import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface DisclosureState {
  hasSeenAffiliateDisclosure: boolean;
  dismissAffiliateDisclosure: () => void;
}

/** Persisted so the "we may earn a commission" notice only ever shows once per install. */
export const useDisclosureStore = create<DisclosureState>()(
  persist(
    (set) => ({
      hasSeenAffiliateDisclosure: false,
      dismissAffiliateDisclosure: () => set({ hasSeenAffiliateDisclosure: true }),
    }),
    {
      name: 'snip-disclosures',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
