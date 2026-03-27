import { create } from 'zustand';
import { Board } from '../types';
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
}));
