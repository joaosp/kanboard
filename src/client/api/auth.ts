import { apiClient } from './client';
import { ApiResponse, User } from '../types';

interface AuthResponse {
  user: User;
  token: string;
}

export function loginApi(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
  return apiClient.post<AuthResponse>('/api/auth/login', { email, password });
}

export function registerApi(email: string, name: string, password: string): Promise<ApiResponse<AuthResponse>> {
  return apiClient.post<AuthResponse>('/api/auth/register', { email, name, password });
}
