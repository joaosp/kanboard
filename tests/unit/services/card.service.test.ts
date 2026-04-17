vi.mock('../../../src/server/prisma', () => ({
  prisma: {
    card: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '../../../src/server/prisma';
import {
  createCard,
  getCardById,
  updateCard,
  moveCard,
  deleteCard,
} from '../../../src/server/services/card.service';

describe('card.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCardById', () => {
    it('hydrates card.labels from cardLabels and strips the join field', async () => {
      const bugLabel = { id: 'label-1', boardId: 'board-1', name: 'Bug', color: 'red' };
      const urgentLabel = { id: 'label-2', boardId: 'board-1', name: 'Urgent', color: 'amber' };

      vi.mocked(prisma.card.findUnique).mockResolvedValue({
        id: 'card-1',
        listId: 'list-1',
        title: 'Ship auth',
        list: { id: 'list-1', boardId: 'board-1' },
        cardLabels: [
          { cardId: 'card-1', labelId: 'label-1', label: bugLabel },
          { cardId: 'card-1', labelId: 'label-2', label: urgentLabel },
        ],
      } as never);

      const result = await getCardById('card-1');

      expect(prisma.card.findUnique).toHaveBeenCalledWith({
        where: { id: 'card-1' },
        include: {
          list: { select: { id: true, boardId: true } },
          cardLabels: {
            orderBy: { createdAt: 'asc' },
            include: { label: true },
          },
        },
      });

      expect(result).toMatchObject({
        id: 'card-1',
        title: 'Ship auth',
        list: { id: 'list-1', boardId: 'board-1' },
        labels: [bugLabel, urgentLabel],
      });
      expect(result).not.toHaveProperty('cardLabels');
    });

    it('returns empty labels when the card has none', async () => {
      vi.mocked(prisma.card.findUnique).mockResolvedValue({
        id: 'card-1',
        listId: 'list-1',
        title: 'Plain card',
        list: { id: 'list-1', boardId: 'board-1' },
        cardLabels: [],
      } as never);

      const result = await getCardById('card-1');

      expect(result?.labels).toEqual([]);
    });

    it('returns null when the card is not found', async () => {
      vi.mocked(prisma.card.findUnique).mockResolvedValue(null);

      const result = await getCardById('missing');

      expect(result).toBeNull();
    });
  });

  describe('createCard', () => {
    it('assigns position equal to the existing card count in the list', async () => {
      vi.mocked(prisma.card.count).mockResolvedValue(2);
      const created = { id: 'card-3', listId: 'list-1', title: 'Third', position: 2 };
      vi.mocked(prisma.card.create).mockResolvedValue(created as never);

      const result = await createCard('list-1', { title: 'Third', description: 'hello' });

      expect(prisma.card.count).toHaveBeenCalledWith({ where: { listId: 'list-1' } });
      expect(prisma.card.create).toHaveBeenCalledWith({
        data: { listId: 'list-1', title: 'Third', description: 'hello', position: 2 },
      });
      expect(result).toEqual(created);
    });

    it('creates a card without description when not provided', async () => {
      vi.mocked(prisma.card.count).mockResolvedValue(0);
      vi.mocked(prisma.card.create).mockResolvedValue({ id: 'card-1' } as never);

      await createCard('list-1', { title: 'First' });

      expect(prisma.card.create).toHaveBeenCalledWith({
        data: { listId: 'list-1', title: 'First', description: undefined, position: 0 },
      });
    });
  });

  describe('updateCard', () => {
    it('passes partial updates through to prisma', async () => {
      vi.mocked(prisma.card.update).mockResolvedValue({ id: 'card-1' } as never);

      await updateCard('card-1', { title: 'New', position: 5, listId: 'list-2' });

      expect(prisma.card.update).toHaveBeenCalledWith({
        where: { id: 'card-1' },
        data: { title: 'New', position: 5, listId: 'list-2' },
      });
    });
  });

  describe('deleteCard', () => {
    it('deletes by id', async () => {
      vi.mocked(prisma.card.delete).mockResolvedValue({ id: 'card-1' } as never);

      await deleteCard('card-1');

      expect(prisma.card.delete).toHaveBeenCalledWith({ where: { id: 'card-1' } });
    });
  });

  describe('moveCard', () => {
    type TxMocks = {
      card: {
        findUnique: ReturnType<typeof vi.fn>;
        findMany: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
      };
    };

    function mockTransaction(): TxMocks {
      const tx: TxMocks = {
        card: {
          findUnique: vi.fn(),
          findMany: vi.fn(),
          update: vi.fn().mockResolvedValue({ id: 'ignored' }),
        },
      };
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: unknown) => {
        if (typeof cb !== 'function') throw new Error('expected callback tx');
        return (cb as (t: TxMocks) => Promise<unknown>)(tx);
      });
      return tx;
    }

    it('rebalances positions 0..N-1 on a same-list reorder and rewrites only changed rows', async () => {
      const tx = mockTransaction();
      // Moving card-2 from position 1 to position 0 within list-1.
      tx.card.findUnique.mockResolvedValue({
        id: 'card-2',
        listId: 'list-1',
        position: 1,
      });
      // Source cards (excluding moving card-2), ordered by position asc.
      tx.card.findMany.mockResolvedValue([
        { id: 'card-1', position: 0 },
        { id: 'card-3', position: 2 },
      ]);

      await moveCard('card-2', { position: 0 });

      // The moving card update must set listId + position.
      expect(tx.card.update).toHaveBeenCalledWith({
        where: { id: 'card-2' },
        data: { listId: 'list-1', position: 0 },
      });
      // card-1 was at position 0, now must shift to position 1.
      expect(tx.card.update).toHaveBeenCalledWith({
        where: { id: 'card-1' },
        data: { position: 1 },
      });
      // card-3 was at position 2, must shift to position 2 -> skipped (already at 2 in new order).
      // Actually new order is [card-2, card-1, card-3], so card-3 should be at index 2, which
      // matches its existing position; the update must NOT be called for card-3 with position: 2.
      const updateCalls = tx.card.update.mock.calls.map((c) => c[0]);
      expect(updateCalls).not.toContainEqual({
        where: { id: 'card-3' },
        data: { position: 2 },
      });
    });

    it('clamps an out-of-range position to the end of the list', async () => {
      const tx = mockTransaction();
      tx.card.findUnique.mockResolvedValue({
        id: 'card-1',
        listId: 'list-1',
        position: 0,
      });
      tx.card.findMany.mockResolvedValue([
        { id: 'card-2', position: 1 },
        { id: 'card-3', position: 2 },
      ]);

      // Requested position 99 clamps to 2 (length of source cards excluding moving card).
      await moveCard('card-1', { position: 99 });

      expect(tx.card.update).toHaveBeenCalledWith({
        where: { id: 'card-1' },
        data: { listId: 'list-1', position: 2 },
      });
      // card-2 should shift from 1 to 0.
      expect(tx.card.update).toHaveBeenCalledWith({
        where: { id: 'card-2' },
        data: { position: 0 },
      });
      // card-3 should shift from 2 to 1.
      expect(tx.card.update).toHaveBeenCalledWith({
        where: { id: 'card-3' },
        data: { position: 1 },
      });
    });

    it('removes from source list, inserts at clamped target position, renumbers both lists on a cross-list move', async () => {
      const tx = mockTransaction();
      tx.card.findUnique.mockResolvedValue({
        id: 'card-2',
        listId: 'list-1',
        position: 1,
      });

      // Source list-1 cards excluding the moving card-2 (already in position order).
      // Destination list-2 cards excluding card-2.
      tx.card.findMany
        .mockResolvedValueOnce([
          { id: 'card-1', position: 0 },
          { id: 'card-3', position: 2 },
        ])
        .mockResolvedValueOnce([
          { id: 'card-a', position: 0 },
          { id: 'card-b', position: 1 },
        ]);

      // Insert card-2 at target position 1 in list-2.
      await moveCard('card-2', { listId: 'list-2', position: 1 });

      // Moving card lands in list-2 at index 1.
      expect(tx.card.update).toHaveBeenCalledWith({
        where: { id: 'card-2' },
        data: { listId: 'list-2', position: 1 },
      });
      // Destination list-2 new order: [card-a, card-2, card-b] -> card-b goes from 1 to 2.
      expect(tx.card.update).toHaveBeenCalledWith({
        where: { id: 'card-b' },
        data: { position: 2 },
      });

      // Source list-1 must compact: card-1 stays at 0 (no update), card-3 shifts 2 -> 1.
      expect(tx.card.update).toHaveBeenCalledWith({
        where: { id: 'card-3' },
        data: { position: 1 },
      });

      // Sanity: source side queries once for list-1, destination side queries once for list-2.
      expect(tx.card.findMany).toHaveBeenCalledWith({
        where: { listId: 'list-1', NOT: { id: 'card-2' } },
        orderBy: { position: 'asc' },
        select: { id: true, position: true },
      });
      expect(tx.card.findMany).toHaveBeenCalledWith({
        where: { listId: 'list-2', NOT: { id: 'card-2' } },
        orderBy: { position: 'asc' },
        select: { id: true, position: true },
      });
    });

    it('throws if the card does not exist', async () => {
      const tx = mockTransaction();
      tx.card.findUnique.mockResolvedValue(null);

      await expect(moveCard('missing', { position: 0 })).rejects.toThrow('Card not found');
    });
  });
});
