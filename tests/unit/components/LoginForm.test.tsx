import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../../src/client/components/Auth/LoginForm/LoginForm.module.css', () => ({
  default: { container: 'c', form: 'f', title: 't', error: 'e', link: 'l' },
}));
vi.mock('../../../src/client/components/shared/Button/Button.module.css', () => ({
  default: { button: 'b', primary: 'p', md: 'md', sm: 'sm' },
}));
vi.mock('../../../src/client/components/shared/Input/Input.module.css', () => ({
  default: { wrapper: 'w', input: 'i', label: 'l' },
}));

const { navigate, login } = vi.hoisted(() => ({
  navigate: vi.fn(),
  login: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

vi.mock('../../../src/client/stores/auth', () => ({
  useAuthStore: ((sel: (s: { login: typeof login }) => unknown) => sel({ login })) as never,
}));

import { LoginForm } from '../../../src/client/components/Auth/LoginForm/LoginForm';

describe('LoginForm', () => {
  beforeEach(() => {
    navigate.mockClear();
    login.mockReset();
  });

  function setup() {
    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>,
    );
  }

  it('logs in with email and password, then navigates', async () => {
    login.mockResolvedValue(undefined);
    setup();

    fireEvent.change(screen.getByTestId('login-email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'secret' } });
    fireEvent.submit(screen.getByTestId('login-form'));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('a@b.com', 'secret');
      expect(navigate).toHaveBeenCalledWith('/boards');
    });
  });

  it('shows the error message when login throws', async () => {
    login.mockRejectedValue(new Error('Invalid creds'));
    setup();

    fireEvent.change(screen.getByTestId('login-email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'x' } });
    fireEvent.submit(screen.getByTestId('login-form'));

    expect(await screen.findByTestId('login-error')).toHaveTextContent('Invalid creds');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows a fallback error message on non-Error throws', async () => {
    login.mockRejectedValue('nope');
    setup();
    fireEvent.submit(screen.getByTestId('login-form'));

    expect(await screen.findByTestId('login-error')).toHaveTextContent('Login failed');
  });
});
