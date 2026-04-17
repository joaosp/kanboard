import { apiClient } from './client';
import { ApiResponse, CardLabel, Label, LabelColor } from '../types';

export function fetchBoardLabelsApi(boardId: string): Promise<ApiResponse<Label[]>> {
  return apiClient.get<Label[]>(`/api/boards/${boardId}/labels`);
}

export function createLabelApi(
  boardId: string,
  data: { name: string; color: LabelColor },
): Promise<ApiResponse<Label>> {
  return apiClient.post<Label>(`/api/boards/${boardId}/labels`, data);
}

export function updateLabelApi(
  labelId: string,
  patch: { name?: string; color?: LabelColor },
): Promise<ApiResponse<Label>> {
  return apiClient.patch<Label>(`/api/labels/${labelId}`, patch);
}

export function deleteLabelApi(labelId: string): Promise<ApiResponse<void>> {
  return apiClient.delete(`/api/labels/${labelId}`);
}

export function attachLabelApi(cardId: string, labelId: string): Promise<ApiResponse<CardLabel>> {
  return apiClient.post<CardLabel>(`/api/cards/${cardId}/labels`, { labelId });
}

export function detachLabelApi(cardId: string, labelId: string): Promise<ApiResponse<void>> {
  return apiClient.delete(`/api/cards/${cardId}/labels/${labelId}`);
}
