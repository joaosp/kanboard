import { useAuthStore } from '../../../src/client/stores/auth';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
    localStorage.clear();
  });

  it('initial state has null user and token', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('login sets user and token', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com', name: 'Test', createdAt: '2024-01-01' };
    const mockToken = 'jwt-token';

    vi.mock('../../../src/client/api/auth', () => ({
      loginApi: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@example.com', name: 'Test', createdAt: '2024-01-01' }, token: 'jwt-token' } }),
      registerApi: vi.fn(),
    }));

    await useAuthStore.getState().login('test@example.com', 'password');

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.token).toBe(mockToken);
    expect(state.isAuthenticated).toBe(true);
  });

  it('logout clears user and token', () => {
    useAuthStore.setState({
      user: { id: 'user-1', email: 'test@example.com', name: 'Test', createdAt: '2024-01-01' },
      token: 'jwt-token',
      isAuthenticated: true,
    });

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});
