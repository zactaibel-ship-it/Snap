import { create } from 'zustand';

interface OnboardingTooltipState {
  shouldShowFabTooltip: boolean;
  showFabTooltip: () => void;
  dismissFabTooltip: () => void;
}

export const useOnboardingTooltipStore = create<OnboardingTooltipState>((set) => ({
  shouldShowFabTooltip: false,
  showFabTooltip: () => set({ shouldShowFabTooltip: true }),
  dismissFabTooltip: () => set({ shouldShowFabTooltip: false }),
}));
