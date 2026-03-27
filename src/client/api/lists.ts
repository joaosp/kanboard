import { apiClient } from './client';
import { ApiResponse, List } from '../types';

export function createListApi(boardId: string, name: string): Promise<ApiResponse<List>> {
  return apiClient.post<List>(`/api/boards/${boardId}/lists`, { name });
}

export function updateListApi(id: string, data: Partial<Pick<List, 'name' | 'position'>>): Promise<ApiResponse<List>> {
  return apiClient.patch<List>(`/api/lists/${id}`, data);
}

export function deleteListApi(id: string): Promise<ApiResponse<void>> {
  return apiClient.delete(`/api/lists/${id}`);
}
