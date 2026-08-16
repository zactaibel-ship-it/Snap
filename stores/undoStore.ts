import { create } from 'zustand';

interface PendingAction {
  id: string;
  message: string;
  durationMs: number;
  onUndo: () => void;
  onCommit: () => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

interface UndoState {
  pending: PendingAction | null;
  show: (input: {
    id: string;
    message: string;
    onUndo: () => void;
    onCommit: () => void;
    durationMs?: number;
  }) => void;
  undo: () => void;
}

export const useUndoStore = create<UndoState>((set, get) => ({
  pending: null,
  show: ({ id, message, onUndo, onCommit, durationMs = 5000 }) => {
    // A second delete before the first one's timer fires commits the first
    // immediately rather than silently dropping it.
    const current = get().pending;
    if (current) {
      clearTimeout(current.timeoutId);
      current.onCommit();
    }

    const timeoutId = setTimeout(() => {
      onCommit();
      set((state) => (state.pending?.id === id ? { pending: null } : state));
    }, durationMs);

    set({ pending: { id, message, durationMs, onUndo, onCommit, timeoutId } });
  },
  undo: () => {
    const current = get().pending;
    if (!current) return;
    clearTimeout(current.timeoutId);
    current.onUndo();
    set({ pending: null });
  },
}));
