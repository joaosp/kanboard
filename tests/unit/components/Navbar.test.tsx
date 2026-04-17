import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../../src/client/components/Layout/Navbar/Navbar.module.css', () => ({
  default: { navbar: 'navbar', brand: 'brand', userSection: 'us', userName: 'un', logoutButton: 'lb' },
}));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

const logout = vi.fn();
let mockUser: { id: string; name: string } | null = { id: 'u-1', name: 'Alice' };

vi.mock('../../../src/client/stores/auth', () => ({
  useAuthStore: () => ({ user: mockUser, logout }),
}));

import { Navbar } from '../../../src/client/components/Layout/Navbar/Navbar';

describe('Navbar', () => {
  beforeEach(() => {
    navigate.mockClear();
    logout.mockClear();
    mockUser = { id: 'u-1', name: 'Alice' };
  });

  it('shows the current user name', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('navbar-user')).toHaveTextContent('Alice');
  });

  it('logs out and navigates on logout click', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId('logout-button'));
    expect(logout).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('renders with no user name if unauthenticated', () => {
    mockUser = null;
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('navbar-user')).toBeEmptyDOMElement();
  });
});
