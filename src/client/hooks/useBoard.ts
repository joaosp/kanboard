import { useEffect } from 'react';
import { useBoardsStore } from '../stores/boards';

export function useBoard(boardId: string) {
  const { currentBoard, isLoading, fetchBoard } = useBoardsStore();

  useEffect(() => {
    fetchBoard(boardId);
  }, [boardId, fetchBoard]);

  return { board: currentBoard, isLoading };
}
