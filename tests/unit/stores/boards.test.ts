vi.mock('../../../src/client/api/boards', () => ({
  fetchBoardsApi: vi.fn(),
  fetchBoardApi: vi.fn(),
  createBoardApi: vi.fn(),
  updateBoardApi: vi.fn(),
  deleteBoardApi: vi.fn(),
}));

import { useBoardsStore } from '../../../src/client/stores/boards';
import { fetchBoardsApi } from '../../../src/client/api/boards';

describe('useBoardsStore', () => {
  beforeEach(() => {
    useBoardsStore.setState({ boards: [], currentBoard: null, isLoading: false });
    vi.clearAllMocks();
  });

  it('initial state has empty boards', () => {
    const state = useBoardsStore.getState();
    expect(state.boards).toEqual([]);
    expect(state.currentBoard).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it('fetchBoards populates boards array', async () => {
    const mockBoards = [
      { id: 'board-1', name: 'Board 1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      { id: 'board-2', name: 'Board 2', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    ];
    vi.mocked(fetchBoardsApi).mockResolvedValue({ data: mockBoards });

    await useBoardsStore.getState().fetchBoards();

    const state = useBoardsStore.getState();
    expect(state.boards).toEqual(mockBoards);
    expect(state.isLoading).toBe(false);
    expect(fetchBoardsApi).toHaveBeenCalledOnce();
  });
});
