import { apiClient } from './client';
import { ApiResponse, Board } from '../types';

export function fetchBoardsApi(): Promise<ApiResponse<Board[]>> {
  return apiClient.get<Board[]>('/api/boards');
}

export function fetchBoardApi(id: string): Promise<ApiResponse<Board>> {
  return apiClient.get<Board>(`/api/boards/${id}`);
}

export function createBoardApi(name: string): Promise<ApiResponse<Board>> {
  return apiClient.post<Board>('/api/boards', { name });
}

export function updateBoardApi(id: string, name: string): Promise<ApiResponse<Board>> {
  return apiClient.patch<Board>(`/api/boards/${id}`, { name });
}

export function deleteBoardApi(id: string): Promise<ApiResponse<void>> {
  return apiClient.delete(`/api/boards/${id}`);
}
