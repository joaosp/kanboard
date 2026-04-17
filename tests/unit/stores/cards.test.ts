vi.mock('../../../src/client/api/cards', () => ({
  createCardApi: vi.fn(),
  fetchCardApi: vi.fn(),
  updateCardApi: vi.fn(),
  deleteCardApi: vi.fn(),
}));

vi.mock('../../../src/client/stores/boards', () => ({
  useBoardsStore: {
    getState: vi.fn(),
  },
}));

vi.mock('../../../src/client/stores/ui', () => ({
  useUiStore: {
    getState: vi.fn(),
  },
}));

import { useCardsStore } from '../../../src/client/stores/cards';
import {
  createCardApi,
  fetchCardApi,
  updateCardApi,
  deleteCardApi,
} from '../../../src/client/api/cards';
import { useBoardsStore } from '../../../src/client/stores/boards';
import { useUiStore } from '../../../src/client/stores/ui';

const LIST_ID = 'list-1';
const CARD_ID = 'card-1';
const BOARD_ID = 'board-1';

describe('useCardsStore', () => {
  const fetchBoard = vi.fn();
  const applyCardMove = vi.fn();
  const restoreBoardSnapshot = vi.fn();
  const addToast = vi.fn();

  beforeEach(() => {
    useCardsStore.setState({ isLoading: false });
    vi.clearAllMocks();
    fetchBoard.mockResolvedValue(undefined);
    vi.mocked(useBoardsStore.getState).mockReturnValue({
      currentBoard: { id: BOARD_ID, name: 'B' },
      fetchBoard,
      applyCardMove,
      restoreBoardSnapshot,
    } as unknown as ReturnType<typeof useBoardsStore.getState>);
    vi.mocked(useUiStore.getState).mockReturnValue({
      addToast,
    } as unknown as ReturnType<typeof useUiStore.getState>);
  });

  describe('createCard', () => {
    it('calls api and refetches the current board', async () => {
      vi.mocked(createCardApi).mockResolvedValue({ data: { id: CARD_ID } as never });

      await useCardsStore.getState().createCard(LIST_ID, { title: 'New' });

      expect(createCardApi).toHaveBeenCalledWith(LIST_ID, { title: 'New' });
      expect(fetchBoard).toHaveBeenCalledWith(BOARD_ID);
      expect(useCardsStore.getState().isLoading).toBe(false);
    });

    it('skips refetch when there is no current board', async () => {
      vi.mocked(useBoardsStore.getState).mockReturnValue({
        currentBoard: null,
        fetchBoard,
      } as unknown as ReturnType<typeof useBoardsStore.getState>);
      vi.mocked(createCardApi).mockResolvedValue({ data: { id: CARD_ID } as never });

      await useCardsStore.getState().createCard(LIST_ID, { title: 'x' });

      expect(fetchBoard).not.toHaveBeenCalled();
    });

    it('resets isLoading even on api failure', async () => {
      vi.mocked(createCardApi).mockRejectedValue(new Error('boom'));

      await expect(useCardsStore.getState().createCard(LIST_ID, { title: 'x' })).rejects.toThrow('boom');
      expect(useCardsStore.getState().isLoading).toBe(false);
    });
  });

  describe('updateCard', () => {
    it('calls api and refetches the current board', async () => {
      vi.mocked(updateCardApi).mockResolvedValue({ data: { id: CARD_ID } as never });

      await useCardsStore.getState().updateCard(CARD_ID, { title: 'New' });

      expect(updateCardApi).toHaveBeenCalledWith(CARD_ID, { title: 'New' });
      expect(fetchBoard).toHaveBeenCalledWith(BOARD_ID);
    });

    it('skips refetch when there is no current board', async () => {
      vi.mocked(useBoardsStore.getState).mockReturnValue({
        currentBoard: null,
        fetchBoard,
      } as unknown as ReturnType<typeof useBoardsStore.getState>);
      vi.mocked(updateCardApi).mockResolvedValue({ data: { id: CARD_ID } as never });

      await useCardsStore.getState().updateCard(CARD_ID, { title: 'x' });

      expect(fetchBoard).not.toHaveBeenCalled();
    });
  });

  describe('deleteCard', () => {
    it('calls api and refetches the current board', async () => {
      vi.mocked(deleteCardApi).mockResolvedValue({ data: undefined } as never);

      await useCardsStore.getState().deleteCard(CARD_ID);

      expect(deleteCardApi).toHaveBeenCalledWith(CARD_ID);
      expect(fetchBoard).toHaveBeenCalledWith(BOARD_ID);
    });
  });

  describe('fetchCard', () => {
    it('returns the card from the api response', async () => {
      const card = { id: CARD_ID, title: 'Fetched' };
      vi.mocked(fetchCardApi).mockResolvedValue({ data: card as never });

      const result = await useCardsStore.getState().fetchCard(CARD_ID);

      expect(fetchCardApi).toHaveBeenCalledWith(CARD_ID);
      expect(result).toEqual(card);
      expect(useCardsStore.getState().isLoading).toBe(false);
    });

    it('resets isLoading on failure', async () => {
      vi.mocked(fetchCardApi).mockRejectedValue(new Error('nope'));

      await expect(useCardsStore.getState().fetchCard(CARD_ID)).rejects.toThrow('nope');
      expect(useCardsStore.getState().isLoading).toBe(false);
    });
  });

  describe('moveCard', () => {
    it('optimistically applies within-list move and PATCHes with position only', async () => {
      vi.mocked(updateCardApi).mockResolvedValue({ data: { id: CARD_ID } as never });

      await useCardsStore.getState().moveCard(CARD_ID, {
        listId: LIST_ID,
        position: 2,
        sourceListId: LIST_ID,
      });

      expect(applyCardMove).toHaveBeenCalledWith(CARD_ID, LIST_ID, 2);
      expect(updateCardApi).toHaveBeenCalledWith(CARD_ID, { position: 2 });
      expect(restoreBoardSnapshot).not.toHaveBeenCalled();
      expect(addToast).not.toHaveBeenCalled();
    });

    it('optimistically applies cross-list move and PATCHes with listId + position', async () => {
      vi.mocked(updateCardApi).mockResolvedValue({ data: { id: CARD_ID } as never });

      await useCardsStore.getState().moveCard(CARD_ID, {
        listId: 'list-2',
        position: 0,
        sourceListId: LIST_ID,
      });

      expect(applyCardMove).toHaveBeenCalledWith(CARD_ID, 'list-2', 0);
      expect(updateCardApi).toHaveBeenCalledWith(CARD_ID, {
        position: 0,
        listId: 'list-2',
      });
    });

    it('reverts snapshot and surfaces a toast when the PATCH fails', async () => {
      const snapshot = { id: BOARD_ID, name: 'B' };
      vi.mocked(useBoardsStore.getState).mockReturnValue({
        currentBoard: snapshot,
        fetchBoard,
        applyCardMove,
        restoreBoardSnapshot,
      } as unknown as ReturnType<typeof useBoardsStore.getState>);
      vi.mocked(updateCardApi).mockRejectedValue(new Error('nope'));

      await expect(
        useCardsStore
          .getState()
          .moveCard(CARD_ID, { listId: LIST_ID, position: 1, sourceListId: LIST_ID }),
      ).rejects.toThrow('nope');

      expect(applyCardMove).toHaveBeenCalledWith(CARD_ID, LIST_ID, 1);
      expect(restoreBoardSnapshot).toHaveBeenCalledWith(snapshot);
      expect(addToast).toHaveBeenCalledWith('Move failed', 'error');
    });

    it('passes a null snapshot to restoreBoardSnapshot when no board was loaded', async () => {
      vi.mocked(useBoardsStore.getState).mockReturnValue({
        currentBoard: null,
        fetchBoard,
        applyCardMove,
        restoreBoardSnapshot,
      } as unknown as ReturnType<typeof useBoardsStore.getState>);
      vi.mocked(updateCardApi).mockRejectedValue(new Error('boom'));

      await expect(
        useCardsStore
          .getState()
          .moveCard(CARD_ID, { listId: LIST_ID, position: 0, sourceListId: LIST_ID }),
      ).rejects.toThrow('boom');

      expect(restoreBoardSnapshot).toHaveBeenCalledWith(null);
      expect(addToast).toHaveBeenCalledWith('Move failed', 'error');
    });
  });
});
