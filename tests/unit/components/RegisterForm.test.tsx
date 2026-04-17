import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../../src/client/components/Auth/RegisterForm/RegisterForm.module.css', () => ({
  default: { container: 'c', form: 'f', title: 't', error: 'e', link: 'l' },
}));
vi.mock('../../../src/client/components/shared/Button/Button.module.css', () => ({
  default: { button: 'b', primary: 'p', md: 'md', sm: 'sm' },
}));
vi.mock('../../../src/client/components/shared/Input/Input.module.css', () => ({
  default: { wrapper: 'w', input: 'i', label: 'l' },
}));

const { navigate, register } = vi.hoisted(() => ({
  navigate: vi.fn(),
  register: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

vi.mock('../../../src/client/stores/auth', () => ({
  useAuthStore: ((sel: (s: { register: typeof register }) => unknown) =>
    sel({ register })) as never,
}));

import { RegisterForm } from '../../../src/client/components/Auth/RegisterForm/RegisterForm';

describe('RegisterForm', () => {
  beforeEach(() => {
    navigate.mockClear();
    register.mockReset();
  });

  function setup() {
    render(
      <MemoryRouter>
        <RegisterForm />
      </MemoryRouter>,
    );
  }

  it('registers and navigates on success', async () => {
    register.mockResolvedValue(undefined);
    setup();

    fireEvent.change(screen.getByTestId('register-name'), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByTestId('register-email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByTestId('register-password'), { target: { value: 'secret' } });
    fireEvent.submit(screen.getByTestId('register-form'));

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith('a@b.com', 'Alice', 'secret');
      expect(navigate).toHaveBeenCalledWith('/boards');
    });
  });

  it('shows the error message when register throws', async () => {
    register.mockRejectedValue(new Error('Email taken'));
    setup();
    fireEvent.submit(screen.getByTestId('register-form'));

    expect(await screen.findByTestId('register-error')).toHaveTextContent('Email taken');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows a fallback error message on non-Error throws', async () => {
    register.mockRejectedValue('nope');
    setup();
    fireEvent.submit(screen.getByTestId('register-form'));

    expect(await screen.findByTestId('register-error')).toHaveTextContent('Registration failed');
  });
});
