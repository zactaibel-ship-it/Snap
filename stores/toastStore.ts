import { create } from 'zustand';

interface ToastState {
  message: string | null;
  show: (message: string, durationMs?: number) => void;
}

let hideTimeout: ReturnType<typeof setTimeout> | undefined;

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  show: (message, durationMs = 3000) => {
    if (hideTimeout) clearTimeout(hideTimeout);
    set({ message });
    hideTimeout = setTimeout(() => set({ message: null }), durationMs);
  },
}));
