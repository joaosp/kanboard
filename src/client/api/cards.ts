import { apiClient } from './client';
import { ApiResponse, Card } from '../types';

export function createCardApi(listId: string, data: { title: string; description?: string }): Promise<ApiResponse<Card>> {
  return apiClient.post<Card>(`/api/lists/${listId}/cards`, data);
}

export function fetchCardApi(id: string): Promise<ApiResponse<Card>> {
  return apiClient.get<Card>(`/api/cards/${id}`);
}

export function updateCardApi(id: string, data: Partial<Pick<Card, 'title' | 'description' | 'position' | 'listId'>>): Promise<ApiResponse<Card>> {
  return apiClient.patch<Card>(`/api/cards/${id}`, data);
}

export function deleteCardApi(id: string): Promise<ApiResponse<void>> {
  return apiClient.delete(`/api/cards/${id}`);
}
