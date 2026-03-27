import { useAuthStore } from '../stores/auth';
import { ApiResponse } from '../types';

async function request<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorBody.error || 'Request failed');
  }

  if (response.status === 204) {
    return { data: undefined as T };
  }

  return response.json() as Promise<ApiResponse<T>>;
}

export const apiClient = {
  get<T>(url: string): Promise<ApiResponse<T>> {
    return request<T>(url, { method: 'GET' });
  },

  post<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<T>(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  patch<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
    return request<T>(url, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete(url: string): Promise<ApiResponse<void>> {
    return request<void>(url, { method: 'DELETE' });
  },
};
