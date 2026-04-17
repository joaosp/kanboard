import { render, screen } from '@testing-library/react';

vi.mock('../../../src/client/components/shared/ToastContainer/ToastContainer.module.css', () => ({
  default: { container: 'container' },
}));
vi.mock('../../../src/client/components/shared/Toast/Toast.module.css', () => ({
  default: { toast: 'toast', success: 'success', error: 'error', info: 'info', closeButton: 'close' },
}));

let mockToasts: Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }> = [];

vi.mock('../../../src/client/stores/ui', () => ({
  useUiStore: ((sel: (s: { toasts: typeof mockToasts; removeToast: () => void }) => unknown) =>
    sel({ toasts: mockToasts, removeToast: vi.fn() })) as never,
}));

import { ToastContainer } from '../../../src/client/components/shared/ToastContainer/ToastContainer';

describe('ToastContainer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when no toasts', () => {
    mockToasts = [];
    const { container } = render(<ToastContainer />);
    expect(container.firstChild).toBeNull();
  });

  it('renders one toast per entry', () => {
    mockToasts = [
      { id: 'a', message: 'one', type: 'success' },
      { id: 'b', message: 'two', type: 'error' },
    ];
    render(<ToastContainer />);
    expect(screen.getAllByTestId('toast')).toHaveLength(2);
    expect(screen.getByText('one')).toBeInTheDocument();
    expect(screen.getByText('two')).toBeInTheDocument();
  });
});
