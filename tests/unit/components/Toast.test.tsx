import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('../../../src/client/components/shared/Toast/Toast.module.css', () => ({
  default: { toast: 'toast', success: 'success', error: 'error', info: 'info', closeButton: 'close' },
}));

const removeToast = vi.fn();
vi.mock('../../../src/client/stores/ui', () => ({
  useUiStore: ((sel: (s: { removeToast: typeof removeToast }) => unknown) =>
    sel({ removeToast })) as never,
}));

import { Toast } from '../../../src/client/components/shared/Toast/Toast';

describe('Toast', () => {
  beforeEach(() => {
    removeToast.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders message with the type styling', () => {
    render(<Toast toast={{ id: 't1', message: 'Saved!', type: 'success' }} />);
    expect(screen.getByTestId('toast')).toHaveTextContent('Saved!');
    expect(screen.getByTestId('toast').className).toContain('success');
  });

  it('auto-dismisses after 3 seconds', () => {
    render(<Toast toast={{ id: 't1', message: 'x', type: 'info' }} />);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(removeToast).toHaveBeenCalledWith('t1');
  });

  it('dismisses on close button click', () => {
    render(<Toast toast={{ id: 't1', message: 'x', type: 'info' }} />);
    fireEvent.click(screen.getByTestId('toast-close'));
    expect(removeToast).toHaveBeenCalledWith('t1');
  });
});
