import express from 'express';
import request from 'supertest';

vi.mock('../../../src/server/prisma', () => ({
  prisma: {
    board: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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
import { boardsRouter } from '../../../src/server/routes/boards';
import { errorHandler } from '../../../src/server/middleware/errors';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/boards', boardsRouter);
  app.use(errorHandler);
  return app;
}

const validUuid = '11111111-1111-4111-8111-111111111111';
const BEARER = 'Bearer valid-token';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/boards', () => {
  it('returns 401 without auth header', async () => {
    const res = await request(makeApp()).get('/api/boards');
    expect(res.status).toBe(401);
  });

  it('returns boards for the authenticated user', async () => {
    vi.mocked(prisma.board.findMany).mockResolvedValue([{ id: 'board-1', name: 'B1' }] as never);
    const res = await request(makeApp()).get('/api/boards').set('Authorization', BEARER);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(prisma.board.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { members: { some: { userId: 'user-1' } } } }),
    );
  });
});

describe('POST /api/boards', () => {
  it('returns 400 when name is missing', async () => {
    const res = await request(makeApp()).post('/api/boards').set('Authorization', BEARER).send({});
    expect(res.status).toBe(400);
  });

  it('creates a board and returns 201', async () => {
    vi.mocked(prisma.board.create).mockResolvedValue({ id: 'board-1', name: 'New' } as never);
    const res = await request(makeApp())
      .post('/api/boards')
      .set('Authorization', BEARER)
      .send({ name: 'New' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ id: 'board-1', name: 'New' });
  });
});

describe('GET /api/boards/:id', () => {
  it('returns 400 for a non-uuid id', async () => {
    const res = await request(makeApp())
      .get('/api/boards/not-a-uuid')
      .set('Authorization', BEARER);
    expect(res.status).toBe(400);
  });

  it('returns 403 when user is not a member', async () => {
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(null);
    const res = await request(makeApp())
      .get(`/api/boards/${validUuid}`)
      .set('Authorization', BEARER);
    expect(res.status).toBe(403);
  });

  it('returns the board when the user is a member', async () => {
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: validUuid,
      userId: 'user-1',
      role: 'member',
    } as never);
    vi.mocked(prisma.board.findUnique).mockResolvedValue({
      id: validUuid,
      name: 'B',
      labels: [],
      lists: [],
      members: [],
    } as never);
    const res = await request(makeApp())
      .get(`/api/boards/${validUuid}`)
      .set('Authorization', BEARER);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(validUuid);
  });
});

describe('PATCH /api/boards/:id', () => {
  it('returns 403 when user is not an admin', async () => {
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: validUuid,
      userId: 'user-1',
      role: 'member',
    } as never);
    const res = await request(makeApp())
      .patch(`/api/boards/${validUuid}`)
      .set('Authorization', BEARER)
      .send({ name: 'Renamed' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Admin access required');
  });

  it('updates the board when user is an admin', async () => {
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: validUuid,
      userId: 'user-1',
      role: 'admin',
    } as never);
    vi.mocked(prisma.board.update).mockResolvedValue({ id: validUuid, name: 'Renamed' } as never);
    const res = await request(makeApp())
      .patch(`/api/boards/${validUuid}`)
      .set('Authorization', BEARER)
      .send({ name: 'Renamed' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Renamed');
  });
});

describe('DELETE /api/boards/:id', () => {
  it('returns 403 when user is not an admin', async () => {
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: validUuid,
      userId: 'user-1',
      role: 'member',
    } as never);
    const res = await request(makeApp())
      .delete(`/api/boards/${validUuid}`)
      .set('Authorization', BEARER);
    expect(res.status).toBe(403);
  });

  it('returns 204 when admin deletes the board', async () => {
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: validUuid,
      userId: 'user-1',
      role: 'admin',
    } as never);
    vi.mocked(prisma.board.delete).mockResolvedValue({ id: validUuid } as never);
    const res = await request(makeApp())
      .delete(`/api/boards/${validUuid}`)
      .set('Authorization', BEARER);
    expect(res.status).toBe(204);
    expect(prisma.board.delete).toHaveBeenCalledWith({ where: { id: validUuid } });
  });
});
