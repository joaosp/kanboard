vi.mock('../../../src/client/api/boards', () => ({
  fetchBoardsApi: vi.fn(),
  fetchBoardApi: vi.fn(),
  createBoardApi: vi.fn(),
  updateBoardApi: vi.fn(),
  deleteBoardApi: vi.fn(),
}));

import { useBoardsStore } from '../../../src/client/stores/boards';
import {
  fetchBoardsApi,
  fetchBoardApi,
  createBoardApi,
  updateBoardApi,
  deleteBoardApi,
} from '../../../src/client/api/boards';
import { Board, Card, List } from '../../../src/client/types';

function makeCard(id: string, listId: string, position: number, title = id): Card {
  return {
    id,
    listId,
    title,
    description: null,
    position,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  };
}

function makeList(id: string, cards: Card[], position = 0, name = id): List {
  return {
    id,
    boardId: 'board-1',
    name,
    position,
    cards,
  };
}

function makeBoard(lists: List[]): Board {
  return {
    id: 'board-1',
    name: 'Board 1',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    lists,
  };
}

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

  it('fetchBoards resets isLoading on failure', async () => {
    vi.mocked(fetchBoardsApi).mockRejectedValue(new Error('boom'));

    await expect(useBoardsStore.getState().fetchBoards()).rejects.toThrow('boom');
    expect(useBoardsStore.getState().isLoading).toBe(false);
  });

  it('fetchBoard sets currentBoard', async () => {
    const board = { id: 'board-1', name: 'B', lists: [] };
    vi.mocked(fetchBoardApi).mockResolvedValue({ data: board as never });

    await useBoardsStore.getState().fetchBoard('board-1');

    expect(fetchBoardApi).toHaveBeenCalledWith('board-1');
    expect(useBoardsStore.getState().currentBoard).toEqual(board);
  });

  it('createBoard appends the new board to the list and returns it', async () => {
    useBoardsStore.setState({
      boards: [{ id: 'board-1', name: 'A' } as never],
    });
    vi.mocked(createBoardApi).mockResolvedValue({ data: { id: 'board-2', name: 'B' } as never });

    const result = await useBoardsStore.getState().createBoard('B');

    expect(createBoardApi).toHaveBeenCalledWith('B');
    expect(result).toMatchObject({ id: 'board-2' });
    expect(useBoardsStore.getState().boards).toHaveLength(2);
  });

  it('updateBoard renames the matching board in the list', async () => {
    useBoardsStore.setState({
      boards: [
        { id: 'board-1', name: 'Old' } as never,
        { id: 'board-2', name: 'Other' } as never,
      ],
    });
    vi.mocked(updateBoardApi).mockResolvedValue({ data: { id: 'board-1', name: 'New' } as never });

    await useBoardsStore.getState().updateBoard('board-1', 'New');

    expect(updateBoardApi).toHaveBeenCalledWith('board-1', 'New');
    expect(useBoardsStore.getState().boards[0]).toMatchObject({ id: 'board-1', name: 'New' });
    expect(useBoardsStore.getState().boards[1]).toMatchObject({ id: 'board-2', name: 'Other' });
  });

  it('updateBoard also renames currentBoard when it matches', async () => {
    useBoardsStore.setState({
      boards: [{ id: 'board-1', name: 'Old' } as never],
      currentBoard: { id: 'board-1', name: 'Old' } as never,
    });
    vi.mocked(updateBoardApi).mockResolvedValue({ data: { id: 'board-1', name: 'New' } as never });

    await useBoardsStore.getState().updateBoard('board-1', 'New');

    expect(useBoardsStore.getState().currentBoard?.name).toBe('New');
  });

  it('updateBoard leaves currentBoard untouched when it does not match', async () => {
    useBoardsStore.setState({
      boards: [{ id: 'board-1', name: 'Old' } as never],
      currentBoard: { id: 'board-2', name: 'Other' } as never,
    });
    vi.mocked(updateBoardApi).mockResolvedValue({ data: { id: 'board-1', name: 'New' } as never });

    await useBoardsStore.getState().updateBoard('board-1', 'New');

    expect(useBoardsStore.getState().currentBoard?.name).toBe('Other');
  });

  it('deleteBoard removes the board and clears currentBoard when it matches', async () => {
    useBoardsStore.setState({
      boards: [{ id: 'board-1' } as never, { id: 'board-2' } as never],
      currentBoard: { id: 'board-1' } as never,
    });
    vi.mocked(deleteBoardApi).mockResolvedValue({ data: undefined } as never);

    await useBoardsStore.getState().deleteBoard('board-1');

    expect(deleteBoardApi).toHaveBeenCalledWith('board-1');
    expect(useBoardsStore.getState().boards).toEqual([{ id: 'board-2' }]);
    expect(useBoardsStore.getState().currentBoard).toBeNull();
  });

  it('deleteBoard leaves currentBoard untouched when it does not match', async () => {
    useBoardsStore.setState({
      boards: [{ id: 'board-1' } as never, { id: 'board-2' } as never],
      currentBoard: { id: 'board-2', name: 'X' } as never,
    });
    vi.mocked(deleteBoardApi).mockResolvedValue({ data: undefined } as never);

    await useBoardsStore.getState().deleteBoard('board-1');

    expect(useBoardsStore.getState().currentBoard).toMatchObject({ id: 'board-2' });
  });

  describe('applyCardMove', () => {
    it('reorders a card within its list and renumbers positions 0..N-1', () => {
      const listA = makeList('list-1', [
        makeCard('card-1', 'list-1', 0),
        makeCard('card-2', 'list-1', 1),
        makeCard('card-3', 'list-1', 2),
      ]);
      useBoardsStore.setState({ currentBoard: makeBoard([listA]) });

      useBoardsStore.getState().applyCardMove('card-3', 'list-1', 0);

      const updated = useBoardsStore.getState().currentBoard!;
      const cards = updated.lists![0]!.cards!;
      expect(cards.map((c) => c.id)).toEqual(['card-3', 'card-1', 'card-2']);
      expect(cards.map((c) => c.position)).toEqual([0, 1, 2]);
    });

    it('clamps an out-of-range position to the end of the list', () => {
      const listA = makeList('list-1', [
        makeCard('card-1', 'list-1', 0),
        makeCard('card-2', 'list-1', 1),
      ]);
      useBoardsStore.setState({ currentBoard: makeBoard([listA]) });

      useBoardsStore.getState().applyCardMove('card-1', 'list-1', 99);

      const updated = useBoardsStore.getState().currentBoard!;
      const cards = updated.lists![0]!.cards!;
      expect(cards.map((c) => c.id)).toEqual(['card-2', 'card-1']);
      expect(cards.map((c) => c.position)).toEqual([0, 1]);
    });

    it('moves a card across lists and renumbers both lists', () => {
      const listA = makeList(
        'list-1',
        [
          makeCard('a-1', 'list-1', 0),
          makeCard('a-2', 'list-1', 1),
          makeCard('a-3', 'list-1', 2),
        ],
        0,
        'A',
      );
      const listB = makeList(
        'list-2',
        [makeCard('b-1', 'list-2', 0), makeCard('b-2', 'list-2', 1)],
        1,
        'B',
      );
      useBoardsStore.setState({ currentBoard: makeBoard([listA, listB]) });

      useBoardsStore.getState().applyCardMove('a-2', 'list-2', 1);

      const updated = useBoardsStore.getState().currentBoard!;
      const sourceCards = updated.lists!.find((l) => l.id === 'list-1')!.cards!;
      const targetCards = updated.lists!.find((l) => l.id === 'list-2')!.cards!;

      expect(sourceCards.map((c) => c.id)).toEqual(['a-1', 'a-3']);
      expect(sourceCards.map((c) => c.position)).toEqual([0, 1]);

      expect(targetCards.map((c) => c.id)).toEqual(['b-1', 'a-2', 'b-2']);
      expect(targetCards.map((c) => c.position)).toEqual([0, 1, 2]);
      expect(targetCards[1]!.listId).toBe('list-2');
    });

    it('is a no-op when there is no current board', () => {
      useBoardsStore.getState().applyCardMove('card-x', 'list-1', 0);
      expect(useBoardsStore.getState().currentBoard).toBeNull();
    });

    it('is a no-op when the card id is unknown', () => {
      const listA = makeList('list-1', [makeCard('card-1', 'list-1', 0)]);
      const board = makeBoard([listA]);
      useBoardsStore.setState({ currentBoard: board });

      useBoardsStore.getState().applyCardMove('missing', 'list-1', 0);

      expect(useBoardsStore.getState().currentBoard).toBe(board);
    });
  });

  describe('restoreBoardSnapshot', () => {
    it('replaces currentBoard with the given snapshot', () => {
      const original = makeBoard([makeList('list-1', [makeCard('card-1', 'list-1', 0)])]);
      const mutated = makeBoard([makeList('list-1', [makeCard('card-2', 'list-1', 0)])]);
      useBoardsStore.setState({ currentBoard: mutated });

      useBoardsStore.getState().restoreBoardSnapshot(original);

      expect(useBoardsStore.getState().currentBoard).toBe(original);
    });

    it('accepts null to clear the current board', () => {
      useBoardsStore.setState({
        currentBoard: makeBoard([]),
      });

      useBoardsStore.getState().restoreBoardSnapshot(null);

      expect(useBoardsStore.getState().currentBoard).toBeNull();
    });
  });
});
