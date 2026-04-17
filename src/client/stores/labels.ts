import { create } from 'zustand';
import { Label, LabelColor } from '../types';
import {
  fetchBoardLabelsApi,
  createLabelApi,
  updateLabelApi,
  deleteLabelApi,
  attachLabelApi,
  detachLabelApi,
} from '../api/labels';
import { useBoardsStore } from './boards';
import { useUiStore } from './ui';

interface LabelsState {
  byBoard: Record<string, Label[]>;
  isLoadingByBoard: Record<string, boolean>;
  errorByBoard: Record<string, string | null>;
  fetchLabels: (boardId: string) => Promise<void>;
  createLabel: (boardId: string, data: { name: string; color: LabelColor }) => Promise<Label>;
  updateLabel: (
    boardId: string,
    labelId: string,
    patch: { name?: string; color?: LabelColor },
  ) => Promise<Label>;
  deleteLabel: (boardId: string, labelId: string) => Promise<void>;
  attachLabel: (boardId: string, cardId: string, labelId: string) => Promise<void>;
  detachLabel: (boardId: string, cardId: string, labelId: string) => Promise<void>;
}

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong.';
}

export const useLabelsStore = create<LabelsState>((set) => ({
  byBoard: {},
  isLoadingByBoard: {},
  errorByBoard: {},

  fetchLabels: async (boardId: string) => {
    set((state) => ({
      isLoadingByBoard: { ...state.isLoadingByBoard, [boardId]: true },
      errorByBoard: { ...state.errorByBoard, [boardId]: null },
    }));
    try {
      const response = await fetchBoardLabelsApi(boardId);
      set((state) => ({
        byBoard: { ...state.byBoard, [boardId]: response.data },
        isLoadingByBoard: { ...state.isLoadingByBoard, [boardId]: false },
      }));
    } catch (err) {
      const message = toMessage(err);
      set((state) => ({
        isLoadingByBoard: { ...state.isLoadingByBoard, [boardId]: false },
        errorByBoard: { ...state.errorByBoard, [boardId]: message },
      }));
      useUiStore.getState().addToast(message, 'error');
      throw err;
    }
  },

  createLabel: async (boardId, data) => {
    try {
      const response = await createLabelApi(boardId, data);
      set((state) => ({
        byBoard: {
          ...state.byBoard,
          [boardId]: [...(state.byBoard[boardId] ?? []), response.data],
        },
      }));
      await useBoardsStore.getState().fetchBoard(boardId);
      return response.data;
    } catch (err) {
      useUiStore.getState().addToast(toMessage(err), 'error');
      throw err;
    }
  },

  updateLabel: async (boardId, labelId, patch) => {
    try {
      const response = await updateLabelApi(labelId, patch);
      set((state) => {
        const current = state.byBoard[boardId] ?? [];
        return {
          byBoard: {
            ...state.byBoard,
            [boardId]: current.map((l) => (l.id === labelId ? response.data : l)),
          },
        };
      });
      await useBoardsStore.getState().fetchBoard(boardId);
      return response.data;
    } catch (err) {
      useUiStore.getState().addToast(toMessage(err), 'error');
      throw err;
    }
  },

  deleteLabel: async (boardId, labelId) => {
    try {
      await deleteLabelApi(labelId);
      set((state) => {
        const current = state.byBoard[boardId] ?? [];
        return {
          byBoard: {
            ...state.byBoard,
            [boardId]: current.filter((l) => l.id !== labelId),
          },
        };
      });
      await useBoardsStore.getState().fetchBoard(boardId);
    } catch (err) {
      useUiStore.getState().addToast(toMessage(err), 'error');
      throw err;
    }
  },

  attachLabel: async (boardId, cardId, labelId) => {
    try {
      await attachLabelApi(cardId, labelId);
      await useBoardsStore.getState().fetchBoard(boardId);
    } catch (err) {
      useUiStore.getState().addToast(toMessage(err), 'error');
      throw err;
    }
  },

  detachLabel: async (boardId, cardId, labelId) => {
    try {
      await detachLabelApi(cardId, labelId);
      await useBoardsStore.getState().fetchBoard(boardId);
    } catch (err) {
      useUiStore.getState().addToast(toMessage(err), 'error');
      throw err;
    }
  },
}));
