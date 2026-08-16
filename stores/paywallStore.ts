import { create } from 'zustand';

export type PaywallTrigger =
  | 'extraction_limit'
  | 'creator_limit'
  | 'retailer_checkout'
  | 'future_planning'
  | 'manual';

interface PaywallState {
  isOpen: boolean;
  trigger: PaywallTrigger;
  open: (trigger?: PaywallTrigger) => void;
  close: () => void;
}

export const usePaywallStore = create<PaywallState>((set) => ({
  isOpen: false,
  trigger: 'manual',
  open: (trigger = 'manual') => set({ isOpen: true, trigger }),
  close: () => set({ isOpen: false }),
}));
