vi.mock('../../../src/server/prisma', () => ({
  prisma: {
    board: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from '../../../src/server/prisma';
import { getUserBoards, getBoardById, createBoard, deleteBoard } from '../../../src/server/services/board.service';

describe('board.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserBoards', () => {
    it('should return boards where user is member', async () => {
      const mockBoards = [
        { id: 'board-1', name: 'Board 1', members: [] },
        { id: 'board-2', name: 'Board 2', members: [] },
      ];
      vi.mocked(prisma.board.findMany).mockResolvedValue(mockBoards as never);

      const result = await getUserBoards('user-1');

      expect(prisma.board.findMany).toHaveBeenCalledWith({
        where: { members: { some: { userId: 'user-1' } } },
        include: {
          members: {
            include: { user: { select: { id: true, email: true, name: true } } },
          },
        },
      });
      expect(result).toEqual(mockBoards);
    });
  });

  describe('createBoard', () => {
    it('should create board with admin membership', async () => {
      const mockBoard = { id: 'board-1', name: 'New Board' };
      vi.mocked(prisma.board.create).mockResolvedValue(mockBoard as never);

      const result = await createBoard('New Board', 'user-1');

      expect(prisma.board.create).toHaveBeenCalledWith({
        data: {
          name: 'New Board',
          members: {
            create: { userId: 'user-1', role: 'admin' },
          },
        },
      });
      expect(result).toEqual(mockBoard);
    });
  });

  describe('getBoardById', () => {
    it('should return board with hydrated labels on board and on every card', async () => {
      const bugLabel = { id: 'label-1', boardId: 'board-1', name: 'Bug', color: 'red' };
      const urgentLabel = { id: 'label-2', boardId: 'board-1', name: 'Urgent', color: 'amber' };

      const mockBoard = {
        id: 'board-1',
        name: 'Board 1',
        labels: [bugLabel, urgentLabel],
        lists: [
          {
            id: 'list-1',
            name: 'Todo',
            cards: [
              {
                id: 'card-1',
                title: 'Ship auth',
                cardLabels: [
                  { cardId: 'card-1', labelId: 'label-1', label: bugLabel },
                  { cardId: 'card-1', labelId: 'label-2', label: urgentLabel },
                ],
              },
              {
                id: 'card-2',
                title: 'No labels here',
                cardLabels: [],
              },
            ],
          },
        ],
        members: [{ userId: 'user-1', user: { id: 'user-1', email: 'a@b.com', name: 'A' } }],
      };
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as never);

      const result = await getBoardById('board-1');

      expect(prisma.board.findUnique).toHaveBeenCalledWith({
        where: { id: 'board-1' },
        include: {
          labels: { orderBy: { createdAt: 'asc' } },
          lists: {
            orderBy: { position: 'asc' },
            include: {
              cards: {
                orderBy: { position: 'asc' },
                include: {
                  cardLabels: {
                    orderBy: { createdAt: 'asc' },
                    include: { label: true },
                  },
                },
              },
            },
          },
          members: {
            include: { user: { select: { id: true, email: true, name: true } } },
          },
        },
      });

      expect(result?.labels).toEqual([bugLabel, urgentLabel]);
      expect(result?.lists[0]?.cards[0]?.labels).toEqual([bugLabel, urgentLabel]);
      expect(result?.lists[0]?.cards[1]?.labels).toEqual([]);
      // cardLabels should not leak onto the returned card.
      expect(result?.lists[0]?.cards[0]).not.toHaveProperty('cardLabels');
    });

    it('returns null when the board is not found', async () => {
      vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

      const result = await getBoardById('missing');

      expect(result).toBeNull();
    });
  });

  describe('deleteBoard', () => {
    it('should delete board', async () => {
      vi.mocked(prisma.board.delete).mockResolvedValue({ id: 'board-1' } as never);

      await deleteBoard('board-1');

      expect(prisma.board.delete).toHaveBeenCalledWith({ where: { id: 'board-1' } });
    });
  });
});
