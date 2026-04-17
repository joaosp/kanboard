vi.mock('../../../src/client/api/auth', () => ({
  loginApi: vi.fn(),
  registerApi: vi.fn(),
}));

import { useAuthStore } from '../../../src/client/stores/auth';
import { loginApi, registerApi } from '../../../src/client/api/auth';

const mockUser = { id: 'user-1', email: 'test@example.com', name: 'Test', createdAt: '2024-01-01' };
const mockToken = 'jwt-token';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('initial state has null user and token', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('login sets user/token and persists to localStorage', async () => {
    vi.mocked(loginApi).mockResolvedValue({ data: { user: mockUser, token: mockToken } });

    await useAuthStore.getState().login('test@example.com', 'password');

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.token).toBe(mockToken);
    expect(state.isAuthenticated).toBe(true);
    expect(localStorage.getItem('token')).toBe(mockToken);
    expect(JSON.parse(localStorage.getItem('user')!)).toEqual(mockUser);
  });

  it('register sets user/token and persists to localStorage', async () => {
    vi.mocked(registerApi).mockResolvedValue({ data: { user: mockUser, token: mockToken } });

    await useAuthStore.getState().register('test@example.com', 'Test', 'password');

    expect(registerApi).toHaveBeenCalledWith('test@example.com', 'Test', 'password');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(localStorage.getItem('token')).toBe(mockToken);
  });

  it('logout clears state and localStorage', () => {
    useAuthStore.setState({ user: mockUser, token: mockToken, isAuthenticated: true });
    localStorage.setItem('token', mockToken);
    localStorage.setItem('user', JSON.stringify(mockUser));

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('initialize restores state from localStorage when both values exist', () => {
    localStorage.setItem('token', mockToken);
    localStorage.setItem('user', JSON.stringify(mockUser));

    useAuthStore.getState().initialize();

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.token).toBe(mockToken);
    expect(state.isAuthenticated).toBe(true);
  });

  it('initialize is a no-op when localStorage is empty', () => {
    useAuthStore.getState().initialize();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('initialize is a no-op when only token is present', () => {
    localStorage.setItem('token', mockToken);

    useAuthStore.getState().initialize();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
