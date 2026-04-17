import express from 'express';
import request from 'supertest';

vi.mock('../../../src/server/prisma', () => ({
  prisma: {
    label: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    boardMember: {
      findUnique: vi.fn(),
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

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(() => 'signed-jwt-token'),
    verify: vi.fn(() => ({ id: 'user-1', email: 'a@b.com' })),
  },
}));

import { prisma } from '../../../src/server/prisma';
import { labelsRouter } from '../../../src/server/routes/labels';
import { errorHandler } from '../../../src/server/middleware/errors';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/boards', labelsRouter);
  app.use('/api', labelsRouter);
  app.use(errorHandler);
  return app;
}

const boardUuid = '11111111-1111-4111-8111-111111111111';
const labelUuid = '22222222-2222-4222-8222-222222222222';
const cardUuid = '33333333-3333-4333-8333-333333333333';
const BEARER = 'Bearer valid-token';

const memberRow = { boardId: boardUuid, userId: 'user-1', role: 'member' as const };

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/boards/:boardId/labels', () => {
  it('returns labels for a member', async () => {
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(memberRow as never);
    vi.mocked(prisma.label.findMany).mockResolvedValue([
      { id: labelUuid, boardId: boardUuid, name: 'Bug', color: 'red' },
    ] as never);

    const res = await request(makeApp())
      .get(`/api/boards/${boardUuid}/labels`)
      .set('Authorization', BEARER);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('POST /api/boards/:boardId/labels', () => {
  it('creates a label and returns 201', async () => {
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(memberRow as never);
    vi.mocked(prisma.label.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.label.create).mockResolvedValue({
      id: labelUuid,
      boardId: boardUuid,
      name: 'Bug',
      color: 'red',
    } as never);

    const res = await request(makeApp())
      .post(`/api/boards/${boardUuid}/labels`)
      .set('Authorization', BEARER)
      .send({ name: 'Bug', color: 'red' });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Bug');
  });
});

describe('PATCH /api/labels/:id', () => {
  it('returns 404 when label does not exist', async () => {
    vi.mocked(prisma.label.findUnique).mockResolvedValue(null);

    const res = await request(makeApp())
      .patch(`/api/labels/${labelUuid}`)
      .set('Authorization', BEARER)
      .send({ name: 'Defect' });

    expect(res.status).toBe(404);
  });

  it('updates the label for a member', async () => {
    vi.mocked(prisma.label.findUnique)
      .mockResolvedValueOnce({
        id: labelUuid,
        boardId: boardUuid,
        name: 'Bug',
        color: 'red',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never) // getLabelWithBoard
      .mockResolvedValueOnce({
        id: labelUuid,
        boardId: boardUuid,
        name: 'Bug',
        color: 'red',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never); // updateLabel's own findUnique
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(memberRow as never);
    vi.mocked(prisma.label.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.label.update).mockResolvedValue({
      id: labelUuid,
      boardId: boardUuid,
      name: 'Defect',
      color: 'red',
    } as never);

    const res = await request(makeApp())
      .patch(`/api/labels/${labelUuid}`)
      .set('Authorization', BEARER)
      .send({ name: 'Defect' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Defect');
  });
});

describe('DELETE /api/labels/:id', () => {
  it('returns 404 when label does not exist', async () => {
    vi.mocked(prisma.label.findUnique).mockResolvedValue(null);

    const res = await request(makeApp())
      .delete(`/api/labels/${labelUuid}`)
      .set('Authorization', BEARER);

    expect(res.status).toBe(404);
  });

  it('deletes the label for a member', async () => {
    vi.mocked(prisma.label.findUnique).mockResolvedValue({
      id: labelUuid,
      boardId: boardUuid,
      name: 'Bug',
      color: 'red',
    } as never);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(memberRow as never);
    vi.mocked(prisma.label.delete).mockResolvedValue({ id: labelUuid } as never);

    const res = await request(makeApp())
      .delete(`/api/labels/${labelUuid}`)
      .set('Authorization', BEARER);

    expect(res.status).toBe(204);
  });
});

describe('POST /api/cards/:cardId/labels', () => {
  it('returns 404 when card does not exist', async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue(null);
    const res = await request(makeApp())
      .post(`/api/cards/${cardUuid}/labels`)
      .set('Authorization', BEARER)
      .send({ labelId: labelUuid });
    expect(res.status).toBe(404);
  });

  it('attaches a label for a member', async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue({
      id: cardUuid,
      listId: 'list-1',
      list: { id: 'list-1', boardId: boardUuid },
    } as never);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(memberRow as never);
    vi.mocked(prisma.label.findUnique).mockResolvedValue({
      id: labelUuid,
      boardId: boardUuid,
      name: 'Bug',
      color: 'red',
    } as never);
    vi.mocked(prisma.cardLabel.upsert).mockResolvedValue({
      cardId: cardUuid,
      labelId: labelUuid,
    } as never);

    const res = await request(makeApp())
      .post(`/api/cards/${cardUuid}/labels`)
      .set('Authorization', BEARER)
      .send({ labelId: labelUuid });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ cardId: cardUuid, labelId: labelUuid });
  });

  it('returns 400 when label belongs to another board', async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue({
      id: cardUuid,
      listId: 'list-1',
      list: { id: 'list-1', boardId: boardUuid },
    } as never);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(memberRow as never);
    vi.mocked(prisma.label.findUnique).mockResolvedValue({
      id: labelUuid,
      boardId: 'other-board',
      name: 'Bug',
      color: 'red',
    } as never);

    const res = await request(makeApp())
      .post(`/api/cards/${cardUuid}/labels`)
      .set('Authorization', BEARER)
      .send({ labelId: labelUuid });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/does not belong/i);
  });
});

describe('DELETE /api/cards/:cardId/labels/:labelId', () => {
  it('returns 404 when the card does not exist', async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue(null);

    const res = await request(makeApp())
      .delete(`/api/cards/${cardUuid}/labels/${labelUuid}`)
      .set('Authorization', BEARER);

    expect(res.status).toBe(404);
  });

  it('detaches for a member and returns 204', async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue({
      id: cardUuid,
      listId: 'list-1',
      list: { id: 'list-1', boardId: boardUuid },
    } as never);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(memberRow as never);
    vi.mocked(prisma.cardLabel.deleteMany).mockResolvedValue({ count: 1 } as never);

    const res = await request(makeApp())
      .delete(`/api/cards/${cardUuid}/labels/${labelUuid}`)
      .set('Authorization', BEARER);

    expect(res.status).toBe(204);
    expect(prisma.cardLabel.deleteMany).toHaveBeenCalledWith({
      where: { cardId: cardUuid, labelId: labelUuid },
    });
  });
});
