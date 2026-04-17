import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

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
      count: vi.fn(),
    },
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(() => ({ id: 'user-1', email: 'user@example.com' })),
  },
}));

import { prisma } from '../../../src/server/prisma';
import { labelsRouter } from '../../../src/server/routes/labels';
import { errorHandler } from '../../../src/server/middleware/errors';

function buildApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use('/api/boards', labelsRouter);
  app.use('/api', labelsRouter);
  app.use(errorHandler);
  return app;
}

async function startServer(app: express.Express): Promise<{ server: Server; port: number }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address() as AddressInfo;
      resolve({ server, port: address.port });
    });
  });
}

async function stopServer(server: Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

describe('label route access — non-member receives 403', () => {
  let server: Server;
  let port: number;

  beforeEach(async () => {
    vi.clearAllMocks();
    const app = buildApp();
    const started = await startServer(app);
    server = started.server;
    port = started.port;
  });

  afterEach(async () => {
    await stopServer(server);
  });

  it('GET /api/boards/:boardId/labels returns 403 when the user is not a member', async () => {
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(null);

    const res = await fetch(
      `http://127.0.0.1:${port}/api/boards/11111111-1111-1111-1111-111111111111/labels`,
      { headers: { Authorization: 'Bearer test-token' } },
    );

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/member/i);
    expect(prisma.label.findMany).not.toHaveBeenCalled();
  });

  it('PATCH /api/labels/:id returns 403 when the user is not a board member', async () => {
    vi.mocked(prisma.label.findUnique).mockResolvedValue({
      id: '22222222-2222-2222-2222-222222222222',
      boardId: '33333333-3333-3333-3333-333333333333',
      name: 'Bug',
      color: 'red',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(null);

    const res = await fetch(
      `http://127.0.0.1:${port}/api/labels/22222222-2222-2222-2222-222222222222`,
      {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Defect' }),
      },
    );

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/member/i);
    expect(prisma.label.update).not.toHaveBeenCalled();
  });

  it('POST /api/cards/:cardId/labels returns 403 when the user is not a board member', async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue({
      id: '44444444-4444-4444-4444-444444444444',
      listId: 'list-1',
      list: { id: 'list-1', boardId: '33333333-3333-3333-3333-333333333333' },
    } as never);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(null);

    const res = await fetch(
      `http://127.0.0.1:${port}/api/cards/44444444-4444-4444-4444-444444444444/labels`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ labelId: '55555555-5555-5555-5555-555555555555' }),
      },
    );

    expect(res.status).toBe(403);
    expect(prisma.cardLabel.upsert).not.toHaveBeenCalled();
  });

  it('POST /api/boards/:boardId/labels returns 403 when the user is not a member', async () => {
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(null);

    const res = await fetch(
      `http://127.0.0.1:${port}/api/boards/11111111-1111-1111-1111-111111111111/labels`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Bug', color: 'red' }),
      },
    );

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/member/i);
    expect(prisma.label.create).not.toHaveBeenCalled();
  });

  it('DELETE /api/labels/:id returns 403 when the user is not a board member', async () => {
    vi.mocked(prisma.label.findUnique).mockResolvedValue({
      id: '22222222-2222-2222-2222-222222222222',
      boardId: '33333333-3333-3333-3333-333333333333',
      name: 'Bug',
      color: 'red',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(null);

    const res = await fetch(
      `http://127.0.0.1:${port}/api/labels/22222222-2222-2222-2222-222222222222`,
      {
        method: 'DELETE',
        headers: { Authorization: 'Bearer test-token' },
      },
    );

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/member/i);
    expect(prisma.label.delete).not.toHaveBeenCalled();
  });

  it('DELETE /api/cards/:cardId/labels/:labelId returns 403 when the user is not a board member', async () => {
    vi.mocked(prisma.card.findUnique).mockResolvedValue({
      id: '44444444-4444-4444-4444-444444444444',
      listId: 'list-1',
      list: { id: 'list-1', boardId: '33333333-3333-3333-3333-333333333333' },
    } as never);
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(null);

    const res = await fetch(
      `http://127.0.0.1:${port}/api/cards/44444444-4444-4444-4444-444444444444/labels/55555555-5555-5555-5555-555555555555`,
      {
        method: 'DELETE',
        headers: { Authorization: 'Bearer test-token' },
      },
    );

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/member/i);
    expect(prisma.cardLabel.deleteMany).not.toHaveBeenCalled();
  });
});
