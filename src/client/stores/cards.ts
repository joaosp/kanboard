import { create } from 'zustand';
import { Card } from '../types';
import { createCardApi, fetchCardApi, updateCardApi, deleteCardApi } from '../api/cards';
import { useBoardsStore } from './boards';

interface CardsState {
  isLoading: boolean;
  createCard: (listId: string, data: { title: string; description?: string }) => Promise<void>;
  updateCard: (id: string, data: Partial<Pick<Card, 'title' | 'description' | 'position' | 'listId'>>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  fetchCard: (id: string) => Promise<Card>;
}

export const useCardsStore = create<CardsState>((set) => ({
  isLoading: false,

  createCard: async (listId: string, data: { title: string; description?: string }) => {
    set({ isLoading: true });
    try {
      await createCardApi(listId, data);
      const currentBoard = useBoardsStore.getState().currentBoard;
      if (currentBoard) {
        await useBoardsStore.getState().fetchBoard(currentBoard.id);
      }
    } finally {
      set({ isLoading: false });
    }
  },

  updateCard: async (id: string, data: Partial<Pick<Card, 'title' | 'description' | 'position' | 'listId'>>) => {
    set({ isLoading: true });
    try {
      await updateCardApi(id, data);
      const currentBoard = useBoardsStore.getState().currentBoard;
      if (currentBoard) {
        await useBoardsStore.getState().fetchBoard(currentBoard.id);
      }
    } finally {
      set({ isLoading: false });
    }
  },

  deleteCard: async (id: string) => {
    set({ isLoading: true });
    try {
      await deleteCardApi(id);
      const currentBoard = useBoardsStore.getState().currentBoard;
      if (currentBoard) {
        await useBoardsStore.getState().fetchBoard(currentBoard.id);
      }
    } finally {
      set({ isLoading: false });
    }
  },

  fetchCard: async (id: string) => {
    set({ isLoading: true });
    try {
      const response = await fetchCardApi(id);
      return response.data;
    } finally {
      set({ isLoading: false });
    }
  },
}));
