import express from 'express';
import request from 'supertest';

vi.mock('../../../src/server/prisma', () => ({
  prisma: {
    card: {
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    list: {
      findUnique: vi.fn(),
    },
    boardMember: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(() => 'signed-jwt-token'),
    verify: vi.fn(() => ({ id: 'user-1', email: 'a@b.com' })),
  },
}));

import { prisma } from '../../../src/server/prisma';
import { cardsRouter } from '../../../src/server/routes/cards';
import { errorHandler } from '../../../src/server/middleware/errors';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/lists', cardsRouter);
  app.use('/api', cardsRouter);
  app.use(errorHandler);
  return app;
}

const listUuid = '22222222-2222-4222-8222-222222222222';
const boardUuid = '11111111-1111-4111-8111-111111111111';
const cardUuid = '33333333-3333-4333-8333-333333333333';
const BEARER = 'Bearer valid-token';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/lists/:listId/cards', () => {
  it('returns 401 without auth', async () => {
    const res = await request(makeApp())
      .post(`/api/lists/${listUuid}/cards`)
      .send({ title: 'New' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for a non-uuid listId', async () => {
    const res = await request(makeApp())
      .post('/api/lists/not-a-uuid/cards')
      .set('Authorization', BEARER)
      .send({ title: 'New' });
    expect(res.status).toBe(400);
  });

  it('returns 404 when list does not exist', async () => {
    vi.mocked(prisma.list.findUnique).mockResolvedValue(null);
    const res = await request(makeApp())
      .post(`/api/lists/${listUuid}/cards`)
      .set('Authorization', BEARER)
      .send({ title: 'New' });
    expect(res.status).toBe(404);
  });

  it('returns 403 when user is not a board member', async () => {
    vi.mocked(prisma.list.findUnique).mockResolvedValue({
      id: listUuid,
      boardId: boardUuid,
      name: 'x',
      position: 0,
    } as never);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(null);
    const res = await request(makeApp())
      .post(`/api/lists/${listUuid}/cards`)
      .set('Authorization', BEARER)
      .send({ title: 'New' });
    expect(res.status).toBe(403);
  });

  it('creates the card for a member', async () => {
    vi.mocked(prisma.list.findUnique).mockResolvedValue({
      id: listUuid,
      boardId: boardUuid,
      name: 'x',
      position: 0,
    } as never);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: boardUuid,
      userId: 'user-1',
      role: 'member',
    } as never);
    vi.mocked(prisma.card.count).mockResolvedValue(1);
    vi.mocked(prisma.card.create).mockResolvedValue({
      id: cardUuid,
      listId: listUuid,
      title: 'New',
      position: 1,
    } as never);

    const res = await request(makeApp())
      .post(`/api/lists/${listUuid}/cards`)
      .set('Authorization', BEARER)
      .send({ title: 'New' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ title: 'New', position: 1 });
  });

  it('returns 400 when body is invalid', async () => {
    vi.mocked(prisma.list.findUnique).mockResolvedValue({
      id: listUuid,
      boardId: boardUuid,
      name: 'x',
      position: 0,
    } as never);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: boardUuid,
      userId: 'user-1',
      role: 'member',
    } as never);

    const res = await request(makeApp())
      .post(`/api/lists/${listUuid}/cards`)
      .set('Authorization', BEARER)
      .send({ title: '' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/cards/:id', () => {
  it('returns 404 when card does not exist', async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue(null);
    const res = await request(makeApp())
      .get(`/api/cards/${cardUuid}`)
      .set('Authorization', BEARER);
    expect(res.status).toBe(404);
  });

  it('returns 403 when user is not a member of the card board', async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue({
      id: cardUuid,
      listId: listUuid,
      title: 'c',
      list: { id: listUuid, boardId: boardUuid },
      cardLabels: [],
    } as never);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(null);
    const res = await request(makeApp())
      .get(`/api/cards/${cardUuid}`)
      .set('Authorization', BEARER);
    expect(res.status).toBe(403);
  });

  it('returns the card for a member', async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue({
      id: cardUuid,
      listId: listUuid,
      title: 'c',
      list: { id: listUuid, boardId: boardUuid },
      cardLabels: [],
    } as never);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: boardUuid,
      userId: 'user-1',
      role: 'member',
    } as never);
    const res = await request(makeApp())
      .get(`/api/cards/${cardUuid}`)
      .set('Authorization', BEARER);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(cardUuid);
  });
});

describe('PATCH /api/cards/:id', () => {
  it('returns 404 when card does not exist', async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue(null);
    const res = await request(makeApp())
      .patch(`/api/cards/${cardUuid}`)
      .set('Authorization', BEARER)
      .send({ title: 'Renamed' });
    expect(res.status).toBe(404);
  });

  it('returns 403 when user is not a member', async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue({
      id: cardUuid,
      listId: listUuid,
      title: 'c',
      list: { id: listUuid, boardId: boardUuid },
      cardLabels: [],
    } as never);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(null);
    const res = await request(makeApp())
      .patch(`/api/cards/${cardUuid}`)
      .set('Authorization', BEARER)
      .send({ title: 'Renamed' });
    expect(res.status).toBe(403);
  });

  it('updates the card for a member', async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue({
      id: cardUuid,
      listId: listUuid,
      title: 'c',
      list: { id: listUuid, boardId: boardUuid },
      cardLabels: [],
    } as never);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: boardUuid,
      userId: 'user-1',
      role: 'member',
    } as never);
    vi.mocked(prisma.card.update).mockResolvedValue({
      id: cardUuid,
      title: 'Renamed',
    } as never);

    const res = await request(makeApp())
      .patch(`/api/cards/${cardUuid}`)
      .set('Authorization', BEARER)
      .send({ title: 'Renamed' });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Renamed');
  });

  it('returns 400 for invalid body', async () => {
    const res = await request(makeApp())
      .patch(`/api/cards/${cardUuid}`)
      .set('Authorization', BEARER)
      .send({ position: -1 });
    expect(res.status).toBe(400);
  });

  it('returns 400 for an empty body', async () => {
    const res = await request(makeApp())
      .patch(`/api/cards/${cardUuid}`)
      .set('Authorization', BEARER)
      .send({});
    expect(res.status).toBe(400);
  });

  describe('cross-list moves', () => {
    const otherListUuid = '44444444-4444-4444-8444-444444444444';
    const otherBoardUuid = '55555555-5555-4555-8555-555555555555';

    function mockMoveTransaction(updatedCard: Record<string, unknown>): void {
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: unknown) => {
        if (typeof cb !== 'function') return updatedCard;
        type Tx = {
          card: {
            findUnique: ReturnType<typeof vi.fn>;
            findMany: ReturnType<typeof vi.fn>;
            update: ReturnType<typeof vi.fn>;
          };
        };
        const tx: Tx = {
          card: {
            findUnique: vi.fn().mockResolvedValue({
              id: cardUuid,
              listId,
              position: 0,
            }),
            findMany: vi.fn().mockResolvedValue([]),
            update: vi.fn().mockResolvedValue(updatedCard),
          },
        };
        return (cb as (t: Tx) => Promise<unknown>)(tx);
      });
    }

    // The card currently lives in `listUuid` on board `boardUuid`.
    const listId = listUuid;

    function mockCardOnBoard(): void {
      vi.mocked(prisma.card.findUnique).mockResolvedValue({
        id: cardUuid,
        listId,
        title: 'c',
        list: { id: listId, boardId: boardUuid },
        cardLabels: [],
      } as never);
    }

    it('returns 404 when the target listId does not exist', async () => {
      mockCardOnBoard();
      vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
        boardId: boardUuid,
        userId: 'user-1',
        role: 'member',
      } as never);
      vi.mocked(prisma.list.findUnique).mockResolvedValue(null);

      const res = await request(makeApp())
        .patch(`/api/cards/${cardUuid}`)
        .set('Authorization', BEARER)
        .send({ listId: otherListUuid, position: 0 });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/Target list not found/i);
    });

    it('returns 409 when the target list belongs to a different board', async () => {
      mockCardOnBoard();
      vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
        boardId: boardUuid,
        userId: 'user-1',
        role: 'member',
      } as never);
      vi.mocked(prisma.list.findUnique).mockResolvedValue({
        id: otherListUuid,
        boardId: otherBoardUuid,
        name: 'other',
        position: 0,
      } as never);

      const res = await request(makeApp())
        .patch(`/api/cards/${cardUuid}`)
        .set('Authorization', BEARER)
        .send({ listId: otherListUuid, position: 0 });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/across boards/i);
    });

    it('returns 403 when user is not a member of the target board', async () => {
      mockCardOnBoard();
      // First membership check (source board): member.
      // Second membership check (target board): not a member.
      vi.mocked(prisma.boardMember.findUnique)
        .mockResolvedValueOnce({
          boardId: boardUuid,
          userId: 'user-1',
          role: 'member',
        } as never)
        .mockResolvedValueOnce(null);
      // Target list is on the same board today — the plan re-checks membership to future-proof.
      vi.mocked(prisma.list.findUnique).mockResolvedValue({
        id: otherListUuid,
        boardId: boardUuid,
        name: 'other',
        position: 0,
      } as never);

      const res = await request(makeApp())
        .patch(`/api/cards/${cardUuid}`)
        .set('Authorization', BEARER)
        .send({ listId: otherListUuid, position: 0 });

      expect(res.status).toBe(403);
    });

    it('returns 200 and the updated card on a successful cross-list move', async () => {
      // First findUnique (auth): card on source list. Second findUnique (post-move): card on target list.
      vi.mocked(prisma.card.findUnique)
        .mockResolvedValueOnce({
          id: cardUuid,
          listId,
          title: 'c',
          list: { id: listId, boardId: boardUuid },
          cardLabels: [],
        } as never)
        .mockResolvedValueOnce({
          id: cardUuid,
          listId: otherListUuid,
          title: 'c',
          list: { id: otherListUuid, boardId: boardUuid },
          cardLabels: [],
        } as never);
      vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
        boardId: boardUuid,
        userId: 'user-1',
        role: 'member',
      } as never);
      vi.mocked(prisma.list.findUnique).mockResolvedValue({
        id: otherListUuid,
        boardId: boardUuid,
        name: 'other',
        position: 1,
      } as never);
      mockMoveTransaction({ id: cardUuid, listId: otherListUuid, position: 0 });

      const res = await request(makeApp())
        .patch(`/api/cards/${cardUuid}`)
        .set('Authorization', BEARER)
        .send({ listId: otherListUuid, position: 0 });

      expect(res.status).toBe(200);
      expect(res.body.data.listId).toBe(otherListUuid);
    });

    it('returns 200 on a same-list reorder', async () => {
      vi.mocked(prisma.card.findUnique)
        .mockResolvedValueOnce({
          id: cardUuid,
          listId,
          title: 'c',
          list: { id: listId, boardId: boardUuid },
          cardLabels: [],
        } as never)
        .mockResolvedValueOnce({
          id: cardUuid,
          listId,
          title: 'c',
          list: { id: listId, boardId: boardUuid },
          cardLabels: [],
        } as never);
      vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
        boardId: boardUuid,
        userId: 'user-1',
        role: 'member',
      } as never);
      mockMoveTransaction({ id: cardUuid, listId, position: 2 });

      const res = await request(makeApp())
        .patch(`/api/cards/${cardUuid}`)
        .set('Authorization', BEARER)
        .send({ position: 2 });

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(cardUuid);
    });
  });
});

describe('DELETE /api/cards/:id', () => {
  it('returns 404 when card does not exist', async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue(null);
    const res = await request(makeApp())
      .delete(`/api/cards/${cardUuid}`)
      .set('Authorization', BEARER);
    expect(res.status).toBe(404);
  });

  it('returns 403 when user is not a member', async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue({
      id: cardUuid,
      listId: listUuid,
      title: 'c',
      list: { id: listUuid, boardId: boardUuid },
      cardLabels: [],
    } as never);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(null);
    const res = await request(makeApp())
      .delete(`/api/cards/${cardUuid}`)
      .set('Authorization', BEARER);
    expect(res.status).toBe(403);
  });

  it('returns 204 for a member', async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue({
      id: cardUuid,
      listId: listUuid,
      title: 'c',
      list: { id: listUuid, boardId: boardUuid },
      cardLabels: [],
    } as never);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: boardUuid,
      userId: 'user-1',
      role: 'member',
    } as never);
    vi.mocked(prisma.card.delete).mockResolvedValue({ id: cardUuid } as never);

    const res = await request(makeApp())
      .delete(`/api/cards/${cardUuid}`)
      .set('Authorization', BEARER);

    expect(res.status).toBe(204);
    expect(prisma.card.delete).toHaveBeenCalledWith({ where: { id: cardUuid } });
  });
});
