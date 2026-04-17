import { renderHook, waitFor } from '@testing-library/react';

vi.mock('../../../src/client/stores/auth', () => ({
  useAuthStore: vi.fn(),
}));
vi.mock('../../../src/client/stores/boards', () => ({
  useBoardsStore: vi.fn(),
}));
vi.mock('../../../src/client/stores/cards', () => ({
  useCardsStore: vi.fn(),
}));

import { useAuthStore } from '../../../src/client/stores/auth';
import { useBoardsStore } from '../../../src/client/stores/boards';
import { useCardsStore } from '../../../src/client/stores/cards';
import { useAuth } from '../../../src/client/hooks/useAuth';
import { useBoards } from '../../../src/client/hooks/useBoards';
import { useBoard } from '../../../src/client/hooks/useBoard';
import { useCards } from '../../../src/client/hooks/useCards';

describe('useAuth', () => {
  it('returns the auth store state', () => {
    const state = { user: { id: 'u-1' }, token: 't', isAuthenticated: true };
    vi.mocked(useAuthStore).mockReturnValue(state as never);

    const { result } = renderHook(() => useAuth());

    expect(result.current).toEqual(state);
  });
});

describe('useBoards', () => {
  it('returns the boards store state', () => {
    const state = { boards: [{ id: 'b-1' }], currentBoard: null, isLoading: false };
    vi.mocked(useBoardsStore).mockReturnValue(state as never);

    const { result } = renderHook(() => useBoards());

    expect(result.current).toEqual(state);
  });
});

describe('useBoard', () => {
  it('calls fetchBoard on mount and returns board/isLoading', async () => {
    const fetchBoard = vi.fn().mockResolvedValue(undefined);
    const currentBoard = { id: 'b-1', name: 'B' };
    vi.mocked(useBoardsStore).mockReturnValue({
      currentBoard,
      isLoading: false,
      fetchBoard,
    } as never);

    const { result } = renderHook(() => useBoard('b-1'));

    await waitFor(() => expect(fetchBoard).toHaveBeenCalledWith('b-1'));
    expect(result.current.board).toEqual(currentBoard);
    expect(result.current.isLoading).toBe(false);
  });

  it('refetches when boardId changes', async () => {
    const fetchBoard = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useBoardsStore).mockReturnValue({
      currentBoard: null,
      isLoading: false,
      fetchBoard,
    } as never);

    const { rerender } = renderHook(({ id }: { id: string }) => useBoard(id), {
      initialProps: { id: 'b-1' },
    });

    await waitFor(() => expect(fetchBoard).toHaveBeenCalledWith('b-1'));

    rerender({ id: 'b-2' });

    await waitFor(() => expect(fetchBoard).toHaveBeenCalledWith('b-2'));
  });
});

describe('useCards', () => {
  it('exposes store card actions', () => {
    const createCard = vi.fn();
    const updateCard = vi.fn();
    const deleteCard = vi.fn();
    const fetchCard = vi.fn();
    vi.mocked(useCardsStore).mockReturnValue({
      createCard,
      updateCard,
      deleteCard,
      fetchCard,
      isLoading: false,
    } as never);

    const { result } = renderHook(() => useCards());

    expect(result.current).toEqual({ createCard, updateCard, deleteCard, fetchCard });
  });
});
