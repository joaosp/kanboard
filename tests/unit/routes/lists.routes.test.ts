import express from 'express';
import request from 'supertest';

vi.mock('../../../src/server/prisma', () => ({
  prisma: {
    list: {
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
    boardMember: {
      findUnique: vi.fn(),
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
import { listsRouter } from '../../../src/server/routes/lists';
import { errorHandler } from '../../../src/server/middleware/errors';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/boards', listsRouter);
  app.use('/api', listsRouter);
  app.use(errorHandler);
  return app;
}

const boardUuid = '11111111-1111-4111-8111-111111111111';
const listUuid = '22222222-2222-4222-8222-222222222222';
const BEARER = 'Bearer valid-token';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/boards/:boardId/lists', () => {
  it('returns 401 without auth', async () => {
    const res = await request(makeApp()).post(`/api/boards/${boardUuid}/lists`).send({ name: 'Todo' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for non-uuid boardId', async () => {
    const res = await request(makeApp())
      .post('/api/boards/not-a-uuid/lists')
      .set('Authorization', BEARER)
      .send({ name: 'Todo' });
    expect(res.status).toBe(400);
  });

  it('returns 403 when user is not a member of the board', async () => {
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(null);
    const res = await request(makeApp())
      .post(`/api/boards/${boardUuid}/lists`)
      .set('Authorization', BEARER)
      .send({ name: 'Todo' });
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid body', async () => {
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: boardUuid,
      userId: 'user-1',
      role: 'member',
    } as never);
    const res = await request(makeApp())
      .post(`/api/boards/${boardUuid}/lists`)
      .set('Authorization', BEARER)
      .send({ name: '' });
    expect(res.status).toBe(400);
  });

  it('creates a list and returns 201', async () => {
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: boardUuid,
      userId: 'user-1',
      role: 'member',
    } as never);
    vi.mocked(prisma.list.count).mockResolvedValue(0);
    vi.mocked(prisma.list.create).mockResolvedValue({
      id: listUuid,
      boardId: boardUuid,
      name: 'Todo',
      position: 0,
    } as never);

    const res = await request(makeApp())
      .post(`/api/boards/${boardUuid}/lists`)
      .set('Authorization', BEARER)
      .send({ name: 'Todo' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: 'Todo', position: 0 });
  });
});

describe('PATCH /api/lists/:id', () => {
  it('returns 404 when list does not exist', async () => {
    vi.mocked(prisma.list.findUnique).mockResolvedValue(null);
    const res = await request(makeApp())
      .patch(`/api/lists/${listUuid}`)
      .set('Authorization', BEARER)
      .send({ name: 'Renamed' });
    expect(res.status).toBe(404);
  });

  it('returns 403 when user is not a member of the list board', async () => {
    vi.mocked(prisma.list.findUnique).mockResolvedValue({
      id: listUuid,
      boardId: boardUuid,
      name: 'x',
      position: 0,
    } as never);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(null);
    const res = await request(makeApp())
      .patch(`/api/lists/${listUuid}`)
      .set('Authorization', BEARER)
      .send({ name: 'Renamed' });
    expect(res.status).toBe(403);
  });

  it('updates the list for a member', async () => {
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
    vi.mocked(prisma.list.update).mockResolvedValue({
      id: listUuid,
      boardId: boardUuid,
      name: 'Renamed',
      position: 0,
    } as never);

    const res = await request(makeApp())
      .patch(`/api/lists/${listUuid}`)
      .set('Authorization', BEARER)
      .send({ name: 'Renamed' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Renamed');
  });

  it('returns 400 for invalid body', async () => {
    const res = await request(makeApp())
      .patch(`/api/lists/${listUuid}`)
      .set('Authorization', BEARER)
      .send({ position: -1 });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/lists/:id', () => {
  it('returns 404 when list does not exist', async () => {
    vi.mocked(prisma.list.findUnique).mockResolvedValue(null);
    const res = await request(makeApp())
      .delete(`/api/lists/${listUuid}`)
      .set('Authorization', BEARER);
    expect(res.status).toBe(404);
  });

  it('returns 403 when user is not a member', async () => {
    vi.mocked(prisma.list.findUnique).mockResolvedValue({
      id: listUuid,
      boardId: boardUuid,
      name: 'x',
      position: 0,
    } as never);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(null);
    const res = await request(makeApp())
      .delete(`/api/lists/${listUuid}`)
      .set('Authorization', BEARER);
    expect(res.status).toBe(403);
  });

  it('returns 204 for a member', async () => {
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
    vi.mocked(prisma.list.delete).mockResolvedValue({ id: listUuid } as never);

    const res = await request(makeApp())
      .delete(`/api/lists/${listUuid}`)
      .set('Authorization', BEARER);

    expect(res.status).toBe(204);
    expect(prisma.list.delete).toHaveBeenCalledWith({ where: { id: listUuid } });
  });
});
