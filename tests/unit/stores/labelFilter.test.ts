import { useLabelFilterStore } from '../../../src/client/stores/labelFilter';

const BOARD_A = 'board-A';
const BOARD_B = 'board-B';

describe('useLabelFilterStore', () => {
  beforeEach(() => {
    useLabelFilterStore.setState({ selectedByBoard: {} });
  });

  describe('toggle', () => {
    it('adds a label id when not already selected', () => {
      useLabelFilterStore.getState().toggle(BOARD_A, 'label-1');
      expect(useLabelFilterStore.getState().selectedByBoard[BOARD_A]).toEqual(['label-1']);
    });

    it('removes a label id when already selected', () => {
      useLabelFilterStore.setState({ selectedByBoard: { [BOARD_A]: ['label-1', 'label-2'] } });
      useLabelFilterStore.getState().toggle(BOARD_A, 'label-1');
      expect(useLabelFilterStore.getState().selectedByBoard[BOARD_A]).toEqual(['label-2']);
    });

    it('keeps selections on other boards untouched', () => {
      useLabelFilterStore.setState({ selectedByBoard: { [BOARD_B]: ['label-x'] } });
      useLabelFilterStore.getState().toggle(BOARD_A, 'label-1');
      expect(useLabelFilterStore.getState().selectedByBoard).toEqual({
        [BOARD_A]: ['label-1'],
        [BOARD_B]: ['label-x'],
      });
    });
  });

  describe('clear', () => {
    it('empties the selection for a board', () => {
      useLabelFilterStore.setState({ selectedByBoard: { [BOARD_A]: ['label-1', 'label-2'] } });
      useLabelFilterStore.getState().clear(BOARD_A);
      expect(useLabelFilterStore.getState().selectedByBoard[BOARD_A]).toEqual([]);
    });

    it('does not affect other boards', () => {
      useLabelFilterStore.setState({
        selectedByBoard: { [BOARD_A]: ['label-1'], [BOARD_B]: ['label-x'] },
      });
      useLabelFilterStore.getState().clear(BOARD_A);
      expect(useLabelFilterStore.getState().selectedByBoard[BOARD_B]).toEqual(['label-x']);
    });
  });

  describe('pruneDeleted', () => {
    it('removes label ids that are no longer in the existing set', () => {
      useLabelFilterStore.setState({
        selectedByBoard: { [BOARD_A]: ['label-1', 'label-2', 'label-3'] },
      });
      useLabelFilterStore.getState().pruneDeleted(BOARD_A, ['label-1', 'label-3']);
      expect(useLabelFilterStore.getState().selectedByBoard[BOARD_A]).toEqual(['label-1', 'label-3']);
    });

    it('is a no-op when nothing changed', () => {
      const initial = { [BOARD_A]: ['label-1', 'label-2'] };
      useLabelFilterStore.setState({ selectedByBoard: initial });
      useLabelFilterStore.getState().pruneDeleted(BOARD_A, ['label-1', 'label-2']);
      expect(useLabelFilterStore.getState().selectedByBoard).toEqual(initial);
    });

    it('is a no-op when the board has no selections', () => {
      useLabelFilterStore.setState({ selectedByBoard: {} });
      useLabelFilterStore.getState().pruneDeleted(BOARD_A, ['label-1']);
      expect(useLabelFilterStore.getState().selectedByBoard).toEqual({});
    });

    it('is a no-op when the board selection is empty', () => {
      useLabelFilterStore.setState({ selectedByBoard: { [BOARD_A]: [] } });
      useLabelFilterStore.getState().pruneDeleted(BOARD_A, ['label-1']);
      expect(useLabelFilterStore.getState().selectedByBoard[BOARD_A]).toEqual([]);
    });
  });
});
