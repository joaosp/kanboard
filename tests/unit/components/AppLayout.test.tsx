import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../../src/client/components/Layout/AppLayout/AppLayout.module.css', () => ({
  default: { layout: 'l', content: 'c' },
}));
vi.mock('../../../src/client/components/Layout/Navbar/Navbar.module.css', () => ({
  default: { navbar: 'nav', brand: 'b', userSection: 's', userName: 'u', logoutButton: 'lb' },
}));
vi.mock('../../../src/client/components/shared/ToastContainer/ToastContainer.module.css', () => ({
  default: { container: 'container' },
}));
vi.mock('../../../src/client/components/shared/Toast/Toast.module.css', () => ({
  default: { toast: 't', success: 's', error: 'e', info: 'i', closeButton: 'c' },
}));

vi.mock('../../../src/client/stores/auth', () => ({
  useAuthStore: () => ({ user: { id: 'u-1', name: 'Alice' }, logout: vi.fn() }),
}));

vi.mock('../../../src/client/stores/ui', () => ({
  useUiStore: ((sel?: (s: { toasts: unknown[]; removeToast: () => void }) => unknown) => {
    const state = { toasts: [], removeToast: vi.fn() };
    return sel ? sel(state) : state;
  }) as never,
}));

import { AppLayout } from '../../../src/client/components/Layout/AppLayout/AppLayout';

describe('AppLayout', () => {
  it('renders the navbar and the outlet content', () => {
    render(
      <MemoryRouter initialEntries={['/boards']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/boards" element={<div data-testid="boards-page">Boards</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
    expect(screen.getByTestId('boards-page')).toBeInTheDocument();
  });
});
