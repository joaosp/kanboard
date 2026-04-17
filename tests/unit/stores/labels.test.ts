vi.mock('../../../src/client/api/labels', () => ({
  fetchBoardLabelsApi: vi.fn(),
  createLabelApi: vi.fn(),
  updateLabelApi: vi.fn(),
  deleteLabelApi: vi.fn(),
  attachLabelApi: vi.fn(),
  detachLabelApi: vi.fn(),
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

import { useLabelsStore } from '../../../src/client/stores/labels';
import {
  fetchBoardLabelsApi,
  createLabelApi,
  updateLabelApi,
  deleteLabelApi,
  attachLabelApi,
  detachLabelApi,
} from '../../../src/client/api/labels';
import { useBoardsStore } from '../../../src/client/stores/boards';
import { useUiStore } from '../../../src/client/stores/ui';
import type { Label } from '../../../src/client/types';

const BOARD_ID = 'board-1';
const CARD_ID = 'card-1';

function makeLabel(overrides: Partial<Label> = {}): Label {
  return {
    id: 'label-1',
    boardId: BOARD_ID,
    name: 'Bug',
    color: 'red',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    ...overrides,
  };
}

describe('useLabelsStore', () => {
  const fetchBoard = vi.fn();
  const addToast = vi.fn();

  beforeEach(() => {
    useLabelsStore.setState({
      byBoard: {},
      isLoadingByBoard: {},
      errorByBoard: {},
    });
    vi.clearAllMocks();
    fetchBoard.mockResolvedValue(undefined);
    vi.mocked(useBoardsStore.getState).mockReturnValue({
      fetchBoard,
    } as unknown as ReturnType<typeof useBoardsStore.getState>);
    vi.mocked(useUiStore.getState).mockReturnValue({
      addToast,
    } as unknown as ReturnType<typeof useUiStore.getState>);
  });

  describe('fetchLabels', () => {
    it('populates byBoard on success', async () => {
      const labels = [makeLabel()];
      vi.mocked(fetchBoardLabelsApi).mockResolvedValue({ data: labels });

      await useLabelsStore.getState().fetchLabels(BOARD_ID);

      expect(fetchBoardLabelsApi).toHaveBeenCalledWith(BOARD_ID);
      expect(useLabelsStore.getState().byBoard[BOARD_ID]).toEqual(labels);
      expect(useLabelsStore.getState().isLoadingByBoard[BOARD_ID]).toBe(false);
    });

    it('surfaces error via toast and rethrows on failure', async () => {
      vi.mocked(fetchBoardLabelsApi).mockRejectedValue(new Error('boom'));

      await expect(useLabelsStore.getState().fetchLabels(BOARD_ID)).rejects.toThrow('boom');
      expect(addToast).toHaveBeenCalledWith('boom', 'error');
      expect(useLabelsStore.getState().errorByBoard[BOARD_ID]).toBe('boom');
    });
  });

  describe('createLabel', () => {
    it('calls api and refetches the board on success', async () => {
      const label = makeLabel();
      vi.mocked(createLabelApi).mockResolvedValue({ data: label });

      const result = await useLabelsStore
        .getState()
        .createLabel(BOARD_ID, { name: 'Bug', color: 'red' });

      expect(createLabelApi).toHaveBeenCalledWith(BOARD_ID, { name: 'Bug', color: 'red' });
      expect(result).toEqual(label);
      expect(fetchBoard).toHaveBeenCalledWith(BOARD_ID);
      expect(useLabelsStore.getState().byBoard[BOARD_ID]).toEqual([label]);
    });

    it('surfaces duplicate-name error via toast and rethrows', async () => {
      vi.mocked(createLabelApi).mockRejectedValue(
        new Error('A label named "Bug" already exists on this board.'),
      );

      await expect(
        useLabelsStore.getState().createLabel(BOARD_ID, { name: 'Bug', color: 'red' }),
      ).rejects.toThrow('already exists');
      expect(addToast).toHaveBeenCalledWith(
        'A label named "Bug" already exists on this board.',
        'error',
      );
      expect(fetchBoard).not.toHaveBeenCalled();
    });
  });

  describe('updateLabel', () => {
    it('updates label and refetches board on success', async () => {
      const original = makeLabel();
      const updated = makeLabel({ name: 'Defect' });
      useLabelsStore.setState({ byBoard: { [BOARD_ID]: [original] } });
      vi.mocked(updateLabelApi).mockResolvedValue({ data: updated });

      const result = await useLabelsStore
        .getState()
        .updateLabel(BOARD_ID, original.id, { name: 'Defect' });

      expect(updateLabelApi).toHaveBeenCalledWith(original.id, { name: 'Defect' });
      expect(result).toEqual(updated);
      expect(fetchBoard).toHaveBeenCalledWith(BOARD_ID);
      expect(useLabelsStore.getState().byBoard[BOARD_ID]?.[0]).toEqual(updated);
    });

    it('surfaces error via toast and rethrows', async () => {
      vi.mocked(updateLabelApi).mockRejectedValue(new Error('duplicate'));

      await expect(
        useLabelsStore.getState().updateLabel(BOARD_ID, 'label-1', { name: 'X' }),
      ).rejects.toThrow('duplicate');
      expect(addToast).toHaveBeenCalledWith('duplicate', 'error');
      expect(fetchBoard).not.toHaveBeenCalled();
    });
  });

  describe('deleteLabel', () => {
    it('deletes label and refetches board on success', async () => {
      const label = makeLabel();
      useLabelsStore.setState({ byBoard: { [BOARD_ID]: [label] } });
      vi.mocked(deleteLabelApi).mockResolvedValue({ data: undefined });

      await useLabelsStore.getState().deleteLabel(BOARD_ID, label.id);

      expect(deleteLabelApi).toHaveBeenCalledWith(label.id);
      expect(fetchBoard).toHaveBeenCalledWith(BOARD_ID);
      expect(useLabelsStore.getState().byBoard[BOARD_ID]).toEqual([]);
    });

    it('surfaces error via toast and rethrows', async () => {
      vi.mocked(deleteLabelApi).mockRejectedValue(new Error('nope'));

      await expect(
        useLabelsStore.getState().deleteLabel(BOARD_ID, 'label-1'),
      ).rejects.toThrow('nope');
      expect(addToast).toHaveBeenCalledWith('nope', 'error');
      expect(fetchBoard).not.toHaveBeenCalled();
    });
  });

  describe('attachLabel', () => {
    it('calls api and refetches board on success', async () => {
      vi.mocked(attachLabelApi).mockResolvedValue({
        data: { cardId: CARD_ID, labelId: 'label-1', createdAt: '2024-01-01' },
      });

      await useLabelsStore.getState().attachLabel(BOARD_ID, CARD_ID, 'label-1');

      expect(attachLabelApi).toHaveBeenCalledWith(CARD_ID, 'label-1');
      expect(fetchBoard).toHaveBeenCalledWith(BOARD_ID);
    });

    it('surfaces error via toast and rethrows', async () => {
      vi.mocked(attachLabelApi).mockRejectedValue(new Error('cross-board'));

      await expect(
        useLabelsStore.getState().attachLabel(BOARD_ID, CARD_ID, 'label-1'),
      ).rejects.toThrow('cross-board');
      expect(addToast).toHaveBeenCalledWith('cross-board', 'error');
      expect(fetchBoard).not.toHaveBeenCalled();
    });
  });

  describe('detachLabel', () => {
    it('calls api and refetches board on success', async () => {
      vi.mocked(detachLabelApi).mockResolvedValue({ data: undefined });

      await useLabelsStore.getState().detachLabel(BOARD_ID, CARD_ID, 'label-1');

      expect(detachLabelApi).toHaveBeenCalledWith(CARD_ID, 'label-1');
      expect(fetchBoard).toHaveBeenCalledWith(BOARD_ID);
    });

    it('surfaces error via toast and rethrows', async () => {
      vi.mocked(detachLabelApi).mockRejectedValue(new Error('fail'));

      await expect(
        useLabelsStore.getState().detachLabel(BOARD_ID, CARD_ID, 'label-1'),
      ).rejects.toThrow('fail');
      expect(addToast).toHaveBeenCalledWith('fail', 'error');
      expect(fetchBoard).not.toHaveBeenCalled();
    });
  });
});
