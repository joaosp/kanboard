vi.mock('../../../src/server/prisma', () => ({
  prisma: {
    list: {
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from '../../../src/server/prisma';
import { createList, updateList, deleteList } from '../../../src/server/services/list.service';

describe('list.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createList', () => {
    it('assigns position equal to the existing list count', async () => {
      vi.mocked(prisma.list.count).mockResolvedValue(3);
      const created = { id: 'list-4', boardId: 'board-1', name: 'Done', position: 3 };
      vi.mocked(prisma.list.create).mockResolvedValue(created as never);

      const result = await createList('board-1', 'Done');

      expect(prisma.list.count).toHaveBeenCalledWith({ where: { boardId: 'board-1' } });
      expect(prisma.list.create).toHaveBeenCalledWith({
        data: { boardId: 'board-1', name: 'Done', position: 3 },
      });
      expect(result).toEqual(created);
    });

    it('uses position 0 for the first list on a board', async () => {
      vi.mocked(prisma.list.count).mockResolvedValue(0);
      vi.mocked(prisma.list.create).mockResolvedValue({ id: 'list-1' } as never);

      await createList('board-1', 'Todo');

      expect(prisma.list.create).toHaveBeenCalledWith({
        data: { boardId: 'board-1', name: 'Todo', position: 0 },
      });
    });
  });

  describe('updateList', () => {
    it('passes partial updates through to prisma', async () => {
      vi.mocked(prisma.list.update).mockResolvedValue({ id: 'list-1' } as never);

      await updateList('list-1', { name: 'Renamed', position: 5 });

      expect(prisma.list.update).toHaveBeenCalledWith({
        where: { id: 'list-1' },
        data: { name: 'Renamed', position: 5 },
      });
    });

    it('accepts a name-only update', async () => {
      vi.mocked(prisma.list.update).mockResolvedValue({ id: 'list-1' } as never);

      await updateList('list-1', { name: 'Renamed' });

      expect(prisma.list.update).toHaveBeenCalledWith({
        where: { id: 'list-1' },
        data: { name: 'Renamed' },
      });
    });
  });

  describe('deleteList', () => {
    it('deletes by id', async () => {
      vi.mocked(prisma.list.delete).mockResolvedValue({ id: 'list-1' } as never);

      await deleteList('list-1');

      expect(prisma.list.delete).toHaveBeenCalledWith({ where: { id: 'list-1' } });
    });
  });
});
