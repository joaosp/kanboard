import { Prisma } from '@prisma/client';

vi.mock('../../../src/server/prisma', () => ({
  prisma: {
    label: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    card: {
      findUnique: vi.fn(),
    },
    cardLabel: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from '../../../src/server/prisma';
import {
  listBoardLabels,
  createLabel,
  updateLabel,
  deleteLabel,
  attachLabelToCard,
  detachLabelFromCard,
} from '../../../src/server/services/label.service';
import { AppError } from '../../../src/server/middleware/errors';

describe('label.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listBoardLabels', () => {
    it('calls findMany ordered by createdAt asc', async () => {
      const mockLabels = [
        { id: 'label-1', boardId: 'board-1', name: 'Bug', color: 'red' },
      ];
      vi.mocked(prisma.label.findMany).mockResolvedValue(mockLabels as never);

      const result = await listBoardLabels('board-1');

      expect(prisma.label.findMany).toHaveBeenCalledWith({
        where: { boardId: 'board-1' },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toEqual(mockLabels);
    });
  });

  describe('createLabel', () => {
    it('inserts a label and returns the row', async () => {
      vi.mocked(prisma.label.findFirst).mockResolvedValue(null);
      const mockLabel = { id: 'label-1', boardId: 'board-1', name: 'Bug', color: 'red' };
      vi.mocked(prisma.label.create).mockResolvedValue(mockLabel as never);

      const result = await createLabel('board-1', { name: 'Bug', color: 'red' });

      expect(prisma.label.findFirst).toHaveBeenCalledWith({
        where: {
          boardId: 'board-1',
          name: { equals: 'Bug', mode: 'insensitive' },
        },
      });
      expect(prisma.label.create).toHaveBeenCalledWith({
        data: { boardId: 'board-1', name: 'Bug', color: 'red' },
      });
      expect(result).toEqual(mockLabel);
    });

    it('throws AppError(400) when a case-insensitive duplicate name exists', async () => {
      vi.mocked(prisma.label.findFirst).mockResolvedValue({
        id: 'label-existing',
        boardId: 'board-1',
        name: 'bug',
        color: 'red',
      } as never);

      await expect(createLabel('board-1', { name: 'Bug', color: 'red' })).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(prisma.label.create).not.toHaveBeenCalled();
    });

    it('re-throws a P2002 prisma error as AppError(400)', async () => {
      vi.mocked(prisma.label.findFirst).mockResolvedValue(null);
      const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: 'test',
      });
      vi.mocked(prisma.label.create).mockRejectedValue(p2002);

      const err = await createLabel('board-1', { name: 'Bug', color: 'red' }).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).statusCode).toBe(400);
    });
  });

  describe('updateLabel', () => {
    it('updates name and color and returns the label with boardId', async () => {
      vi.mocked(prisma.label.findUnique).mockResolvedValue({
        id: 'label-1',
        boardId: 'board-1',
        name: 'Bug',
        color: 'red',
      } as never);
      vi.mocked(prisma.label.findFirst).mockResolvedValue(null);
      const updated = { id: 'label-1', boardId: 'board-1', name: 'Defect', color: 'amber' };
      vi.mocked(prisma.label.update).mockResolvedValue(updated as never);

      const result = await updateLabel('label-1', { name: 'Defect', color: 'amber' });

      expect(prisma.label.update).toHaveBeenCalledWith({
        where: { id: 'label-1' },
        data: { name: 'Defect', color: 'amber' },
      });
      expect(result).toEqual({ label: updated, boardId: 'board-1' });
    });

    it('throws AppError(404) when the label does not exist', async () => {
      vi.mocked(prisma.label.findUnique).mockResolvedValue(null);

      await expect(updateLabel('missing', { name: 'X' })).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('throws AppError(400) on case-insensitive rename conflict (excluding current row)', async () => {
      vi.mocked(prisma.label.findUnique).mockResolvedValue({
        id: 'label-1',
        boardId: 'board-1',
        name: 'Bug',
        color: 'red',
      } as never);
      vi.mocked(prisma.label.findFirst).mockResolvedValue({
        id: 'label-2',
        boardId: 'board-1',
        name: 'urgent',
        color: 'amber',
      } as never);

      await expect(updateLabel('label-1', { name: 'Urgent' })).rejects.toMatchObject({
        statusCode: 400,
      });

      expect(prisma.label.findFirst).toHaveBeenCalledWith({
        where: {
          boardId: 'board-1',
          name: { equals: 'Urgent', mode: 'insensitive' },
          NOT: { id: 'label-1' },
        },
      });
      expect(prisma.label.update).not.toHaveBeenCalled();
    });

    it('skips the duplicate check when renaming to the same name (case-insensitive)', async () => {
      vi.mocked(prisma.label.findUnique).mockResolvedValue({
        id: 'label-1',
        boardId: 'board-1',
        name: 'Bug',
        color: 'red',
      } as never);
      vi.mocked(prisma.label.update).mockResolvedValue({
        id: 'label-1',
        boardId: 'board-1',
        name: 'bug',
        color: 'red',
      } as never);

      await updateLabel('label-1', { name: 'bug' });

      expect(prisma.label.findFirst).not.toHaveBeenCalled();
      expect(prisma.label.update).toHaveBeenCalled();
    });
  });

  describe('deleteLabel', () => {
    it('calls prisma.label.delete', async () => {
      vi.mocked(prisma.label.delete).mockResolvedValue({ id: 'label-1' } as never);

      await deleteLabel('label-1');

      expect(prisma.label.delete).toHaveBeenCalledWith({ where: { id: 'label-1' } });
    });
  });

  describe('attachLabelToCard', () => {
    const mockCard = {
      id: 'card-1',
      listId: 'list-1',
      list: { id: 'list-1', boardId: 'board-1' },
    };

    it('upserts on composite PK', async () => {
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as never);
      vi.mocked(prisma.label.findUnique).mockResolvedValue({
        id: 'label-1',
        boardId: 'board-1',
        name: 'Bug',
        color: 'red',
      } as never);
      const row = { cardId: 'card-1', labelId: 'label-1', createdAt: new Date() };
      vi.mocked(prisma.cardLabel.upsert).mockResolvedValue(row as never);

      const result = await attachLabelToCard('card-1', 'label-1');

      expect(prisma.cardLabel.upsert).toHaveBeenCalledWith({
        where: { cardId_labelId: { cardId: 'card-1', labelId: 'label-1' } },
        create: { cardId: 'card-1', labelId: 'label-1' },
        update: {},
      });
      expect(result).toEqual(row);
    });

    it('is idempotent: a second attach returns the existing row without error', async () => {
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as never);
      vi.mocked(prisma.label.findUnique).mockResolvedValue({
        id: 'label-1',
        boardId: 'board-1',
        name: 'Bug',
        color: 'red',
      } as never);
      const existing = { cardId: 'card-1', labelId: 'label-1', createdAt: new Date() };
      vi.mocked(prisma.cardLabel.upsert).mockResolvedValue(existing as never);

      const first = await attachLabelToCard('card-1', 'label-1');
      const second = await attachLabelToCard('card-1', 'label-1');

      expect(first).toEqual(existing);
      expect(second).toEqual(existing);
      expect(prisma.cardLabel.upsert).toHaveBeenCalledTimes(2);
    });

    it('throws AppError(400) when label belongs to a different board', async () => {
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as never);
      vi.mocked(prisma.label.findUnique).mockResolvedValue({
        id: 'label-2',
        boardId: 'other-board',
        name: 'Urgent',
        color: 'amber',
      } as never);

      await expect(attachLabelToCard('card-1', 'label-2')).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(prisma.cardLabel.upsert).not.toHaveBeenCalled();
    });

    it('throws AppError(404) when card is missing', async () => {
      vi.mocked(prisma.card.findUnique).mockResolvedValue(null);

      await expect(attachLabelToCard('missing', 'label-1')).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('throws AppError(404) when label is missing', async () => {
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as never);
      vi.mocked(prisma.label.findUnique).mockResolvedValue(null);

      await expect(attachLabelToCard('card-1', 'missing')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('detachLabelFromCard', () => {
    it('deletes the matching join row', async () => {
      vi.mocked(prisma.cardLabel.deleteMany).mockResolvedValue({ count: 1 } as never);

      await detachLabelFromCard('card-1', 'label-1');

      expect(prisma.cardLabel.deleteMany).toHaveBeenCalledWith({
        where: { cardId: 'card-1', labelId: 'label-1' },
      });
    });

    it('is idempotent: returns silently when no row exists (count: 0)', async () => {
      vi.mocked(prisma.cardLabel.deleteMany).mockResolvedValue({ count: 0 } as never);

      await expect(detachLabelFromCard('card-1', 'label-1')).resolves.not.toThrow();
    });
  });

});
