import { create } from 'zustand';

export type ExtractionStatus = 'pending' | 'extracting' | 'success' | 'error';

export interface ExtractionJob {
  id: string;
  sourceUrl: string;
  status: ExtractionStatus;
  error?: string;
}

interface ExtractionState {
  jobs: Record<string, ExtractionJob>;
  startExtraction: (id: string, sourceUrl: string) => void;
  updateStatus: (id: string, status: ExtractionStatus, error?: string) => void;
  removeJob: (id: string) => void;
}

export const useExtractionStore = create<ExtractionState>((set) => ({
  jobs: {},
  startExtraction: (id, sourceUrl) =>
    set((state) => ({
      jobs: {
        ...state.jobs,
        [id]: { id, sourceUrl, status: 'pending' },
      },
    })),
  updateStatus: (id, status, error) =>
    set((state) => ({
      jobs: {
        ...state.jobs,
        [id]: { ...state.jobs[id], status, error },
      },
    })),
  removeJob: (id) =>
    set((state) => {
      const { [id]: _removed, ...rest } = state.jobs;
      return { jobs: rest };
    }),
}));
