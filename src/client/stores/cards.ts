import { create } from 'zustand';
import { Card } from '../types';
import { createCardApi, fetchCardApi, updateCardApi, deleteCardApi } from '../api/cards';
import { useBoardsStore } from './boards';
import { useUiStore } from './ui';

interface CardsState {
  isLoading: boolean;
  createCard: (listId: string, data: { title: string; description?: string }) => Promise<void>;
  updateCard: (id: string, data: Partial<Pick<Card, 'title' | 'description' | 'position' | 'listId'>>) => Promise<void>;
  moveCard: (
    cardId: string,
    target: { listId: string; position: number; sourceListId: string },
  ) => Promise<void>;
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

  moveCard: async (
    cardId: string,
    { listId, position, sourceListId }: { listId: string; position: number; sourceListId: string },
  ) => {
    const boardsStore = useBoardsStore.getState();
    const snapshot = boardsStore.currentBoard;

    // Optimistically mutate local state first so the UI commits without awaiting the network.
    boardsStore.applyCardMove(cardId, listId, position);

    const crossList = listId !== sourceListId;
    const payload: { position: number; listId?: string } = crossList
      ? { position, listId }
      : { position };

    try {
      await updateCardApi(cardId, payload);
    } catch (err) {
      // Revert to the pre-drag snapshot so the card snaps back.
      useBoardsStore.getState().restoreBoardSnapshot(snapshot);
      useUiStore.getState().addToast('Move failed', 'error');
      throw err;
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
