import { create } from 'zustand';
import { Board, Card } from '../types';
import { fetchBoardsApi, fetchBoardApi, createBoardApi, updateBoardApi, deleteBoardApi } from '../api/boards';

interface BoardsState {
  boards: Board[];
  currentBoard: Board | null;
  isLoading: boolean;
  fetchBoards: () => Promise<void>;
  fetchBoard: (id: string) => Promise<void>;
  createBoard: (name: string) => Promise<Board>;
  updateBoard: (id: string, name: string) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
  applyCardMove: (cardId: string, targetListId: string, targetPosition: number) => void;
  restoreBoardSnapshot: (snapshot: Board | null) => void;
}

export const useBoardsStore = create<BoardsState>((set) => ({
  boards: [],
  currentBoard: null,
  isLoading: false,

  fetchBoards: async () => {
    set({ isLoading: true });
    try {
      const response = await fetchBoardsApi();
      set({ boards: response.data });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchBoard: async (id: string) => {
    set({ isLoading: true });
    try {
      const response = await fetchBoardApi(id);
      set({ currentBoard: response.data });
    } finally {
      set({ isLoading: false });
    }
  },

  createBoard: async (name: string) => {
    const response = await createBoardApi(name);
    set((state) => ({ boards: [...state.boards, response.data] }));
    return response.data;
  },

  updateBoard: async (id: string, name: string) => {
    const response = await updateBoardApi(id, name);
    set((state) => ({
      boards: state.boards.map((b) => (b.id === id ? { ...b, name: response.data.name } : b)),
      currentBoard: state.currentBoard?.id === id
        ? { ...state.currentBoard, name: response.data.name }
        : state.currentBoard,
    }));
  },

  deleteBoard: async (id: string) => {
    await deleteBoardApi(id);
    set((state) => ({
      boards: state.boards.filter((b) => b.id !== id),
      currentBoard: state.currentBoard?.id === id ? null : state.currentBoard,
    }));
  },

  applyCardMove: (cardId: string, targetListId: string, targetPosition: number) =>
    set((state) => {
      const board = state.currentBoard;
      if (!board || !board.lists) return state;

      // Locate the moving card and its source list.
      let movingCard: Card | null = null;
      let sourceListId: string | null = null;
      for (const list of board.lists) {
        const found = (list.cards ?? []).find((c) => c.id === cardId);
        if (found) {
          movingCard = found;
          sourceListId = list.id;
          break;
        }
      }
      if (!movingCard || sourceListId === null) return state;

      const moving = movingCard;
      const sourceListIdFinal = sourceListId;
      const isCrossList = sourceListIdFinal !== targetListId;

      const nextLists = board.lists.map((list) => {
        if (list.id === sourceListIdFinal && list.id === targetListId) {
          // Same-list reorder: remove, reinsert, renumber.
          const remaining = (list.cards ?? []).filter((c) => c.id !== cardId);
          const clamped = Math.max(0, Math.min(targetPosition, remaining.length));
          const reinserted: Card[] = [
            ...remaining.slice(0, clamped),
            { ...moving, listId: list.id, position: clamped },
            ...remaining.slice(clamped),
          ].map((c, i) => ({ ...c, position: i }));
          return { ...list, cards: reinserted };
        }

        if (list.id === sourceListIdFinal && isCrossList) {
          const compacted: Card[] = (list.cards ?? [])
            .filter((c) => c.id !== cardId)
            .map((c, i) => ({ ...c, position: i }));
          return { ...list, cards: compacted };
        }

        if (list.id === targetListId && isCrossList) {
          const existing = (list.cards ?? []).filter((c) => c.id !== cardId);
          const clamped = Math.max(0, Math.min(targetPosition, existing.length));
          const inserted: Card[] = [
            ...existing.slice(0, clamped),
            { ...moving, listId: list.id, position: clamped },
            ...existing.slice(clamped),
          ].map((c, i) => ({ ...c, position: i }));
          return { ...list, cards: inserted };
        }

        return list;
      });

      return { currentBoard: { ...board, lists: nextLists } };
    }),

  restoreBoardSnapshot: (snapshot: Board | null) => set({ currentBoard: snapshot }),
}));
