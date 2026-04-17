import { useUiStore } from '../../../src/client/stores/ui';

describe('useUiStore', () => {
  beforeEach(() => {
    useUiStore.setState({ activeModal: null, toasts: [] });
  });

  describe('modals', () => {
    it('openModal sets activeModal', () => {
      useUiStore.getState().openModal('createBoard');
      expect(useUiStore.getState().activeModal).toBe('createBoard');
    });

    it('closeModal clears activeModal', () => {
      useUiStore.setState({ activeModal: 'createBoard' });
      useUiStore.getState().closeModal();
      expect(useUiStore.getState().activeModal).toBeNull();
    });
  });

  describe('toasts', () => {
    it('addToast appends a toast with generated id', () => {
      useUiStore.getState().addToast('Saved', 'success');

      const toasts = useUiStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0]).toMatchObject({ message: 'Saved', type: 'success' });
      expect(toasts[0]?.id).toBeTruthy();
    });

    it('addToast preserves existing toasts', () => {
      useUiStore.setState({
        toasts: [{ id: 'old', message: 'Hi', type: 'info' }],
      });
      useUiStore.getState().addToast('New', 'error');
      expect(useUiStore.getState().toasts).toHaveLength(2);
    });

    it('removeToast removes the toast with the given id', () => {
      useUiStore.setState({
        toasts: [
          { id: 'a', message: '1', type: 'info' },
          { id: 'b', message: '2', type: 'info' },
        ],
      });
      useUiStore.getState().removeToast('a');
      expect(useUiStore.getState().toasts).toEqual([{ id: 'b', message: '2', type: 'info' }]);
    });

    it('removeToast is a no-op when id does not match', () => {
      useUiStore.setState({
        toasts: [{ id: 'a', message: '1', type: 'info' }],
      });
      useUiStore.getState().removeToast('missing');
      expect(useUiStore.getState().toasts).toHaveLength(1);
    });
  });
});
