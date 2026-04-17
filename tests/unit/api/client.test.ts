vi.mock('../../../src/client/stores/auth', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({ token: null })),
  },
}));

import { apiClient } from '../../../src/client/api/client';
import { useAuthStore } from '../../../src/client/stores/auth';

describe('apiClient', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    vi.mocked(useAuthStore.getState).mockReturnValue({ token: null } as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('get sends GET with JSON headers and no body', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { hello: 'world' } }),
    });

    const result = await apiClient.get<{ hello: string }>('/api/ping');

    expect(fetchMock).toHaveBeenCalledWith('/api/ping', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(result).toEqual({ data: { hello: 'world' } });
  });

  it('includes Bearer token when auth store has one', async () => {
    vi.mocked(useAuthStore.getState).mockReturnValue({ token: 'abc' } as never);
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: null }) });

    await apiClient.get('/api/me');

    expect(fetchMock).toHaveBeenCalledWith('/api/me', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer abc',
      },
    });
  });

  it('post serializes body as JSON', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 201, json: async () => ({ data: { id: 1 } }) });

    await apiClient.post('/api/x', { a: 1 });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/x',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ a: 1 }) }),
    );
  });

  it('post sends no body when none provided', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 201, json: async () => ({ data: null }) });

    await apiClient.post('/api/x');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/x',
      expect.objectContaining({ method: 'POST', body: undefined }),
    );
  });

  it('patch serializes body as JSON', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: null }) });

    await apiClient.patch('/api/x/1', { name: 'n' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/x/1',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: 'n' }) }),
    );
  });

  it('delete handles 204 No Content by returning undefined data', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204 });

    const result = await apiClient.delete('/api/x/1');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/x/1',
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(result).toEqual({ data: undefined });
  });

  it('throws the server error message when !ok and error body exists', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Bad input' }),
    });

    await expect(apiClient.get('/api/x')).rejects.toThrow('Bad input');
  });

  it('throws default message when !ok and body is not JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('invalid json');
      },
    });

    await expect(apiClient.get('/api/x')).rejects.toThrow('Request failed');
  });
});
