import { create } from 'zustand';

interface LabelFilterState {
  selectedByBoard: Record<string, string[]>;
  toggle: (boardId: string, labelId: string) => void;
  clear: (boardId: string) => void;
  pruneDeleted: (boardId: string, existingLabelIds: string[]) => void;
}

export const useLabelFilterStore = create<LabelFilterState>((set) => ({
  selectedByBoard: {},

  toggle: (boardId, labelId) =>
    set((state) => {
      const current = state.selectedByBoard[boardId] ?? [];
      const next = current.includes(labelId)
        ? current.filter((id) => id !== labelId)
        : [...current, labelId];
      return {
        selectedByBoard: { ...state.selectedByBoard, [boardId]: next },
      };
    }),

  clear: (boardId) =>
    set((state) => ({
      selectedByBoard: { ...state.selectedByBoard, [boardId]: [] },
    })),

  pruneDeleted: (boardId, existingLabelIds) =>
    set((state) => {
      const current = state.selectedByBoard[boardId];
      if (!current || current.length === 0) return state;
      const existing = new Set(existingLabelIds);
      const next = current.filter((id) => existing.has(id));
      if (next.length === current.length) return state;
      return {
        selectedByBoard: { ...state.selectedByBoard, [boardId]: next },
      };
    }),
}));
