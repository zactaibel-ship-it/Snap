import { create } from 'zustand';

export type ExtractionStatus =
  | 'idle'
  | 'fetching'
  | 'transcribing'
  | 'extracting'
  | 'saving'
  | 'error';

interface ExtractionState {
  status: ExtractionStatus;
  url: string | null;
  error: string | null;
  start: (url: string) => void;
  setStatus: (status: ExtractionStatus) => void;
  setError: (error: string) => void;
  reset: () => void;
}

export const useExtractionStore = create<ExtractionState>((set) => ({
  status: 'idle',
  url: null,
  error: null,
  start: (url) => set({ status: 'fetching', url, error: null }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ status: 'error', error }),
  reset: () => set({ status: 'idle', url: null, error: null }),
}));
