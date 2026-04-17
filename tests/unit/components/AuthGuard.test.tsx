import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../../src/client/components/shared/Spinner/Spinner.module.css', () => ({
  default: { spinner: 'spinner', sm: 'sm', md: 'md', lg: 'lg' },
}));

const initialize = vi.fn();
let mockAuthenticated = false;

vi.mock('../../../src/client/stores/auth', () => ({
  useAuthStore: () => ({ isAuthenticated: mockAuthenticated, initialize }),
}));

import { AuthGuard } from '../../../src/client/components/Auth/AuthGuard';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AuthGuard />}>
          <Route path="/" element={<div data-testid="protected">protected</div>} />
        </Route>
        <Route path="/login" element={<div data-testid="login">login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AuthGuard', () => {
  beforeEach(() => {
    initialize.mockClear();
  });

  it('renders the protected outlet when authenticated', () => {
    mockAuthenticated = true;
    renderAt('/');
    expect(screen.getByTestId('protected')).toBeInTheDocument();
    expect(initialize).toHaveBeenCalled();
  });

  it('redirects to /login when not authenticated', () => {
    mockAuthenticated = false;
    renderAt('/');
    expect(screen.getByTestId('login')).toBeInTheDocument();
  });
});
