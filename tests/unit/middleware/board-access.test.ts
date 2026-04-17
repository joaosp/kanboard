import type { Request, Response, NextFunction } from 'express';

vi.mock('../../../src/server/prisma', () => ({
  prisma: {
    boardMember: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from '../../../src/server/prisma';
import { requireBoardMember, requireBoardAdmin } from '../../../src/server/middleware/board-access';

function createMockRes(): Partial<Response> {
  return {
    status: vi.fn().mockReturnThis() as unknown as Response['status'],
    json: vi.fn().mockReturnThis() as unknown as Response['json'],
  };
}

describe('requireBoardMember', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
    vi.clearAllMocks();
  });

  it('returns 403 when boardId param is missing', async () => {
    const req = { params: {}, user: { id: 'user-1', email: 'a@b.com' } } as unknown as Request;
    const res = createMockRes();

    await requireBoardMember()(req, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when user is missing', async () => {
    const req = { params: { id: 'board-1' } } as unknown as Request;
    const res = createMockRes();

    await requireBoardMember()(req, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when user is not a member', async () => {
    const req = {
      params: { id: 'board-1' },
      user: { id: 'user-1', email: 'a@b.com' },
    } as unknown as Request;
    const res = createMockRes();
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(null);

    await requireBoardMember()(req, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not a member of this board' });
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches boardId and calls next when user is a member', async () => {
    const req = {
      params: { id: 'board-1' },
      user: { id: 'user-1', email: 'a@b.com' },
    } as unknown as Request;
    const res = createMockRes();
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: 'board-1',
      userId: 'user-1',
      role: 'member',
    } as never);

    await requireBoardMember()(req, res as Response, next);

    expect(req.boardId).toBe('board-1');
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('supports a custom param name', async () => {
    const req = {
      params: { boardId: 'board-7' },
      user: { id: 'user-1', email: 'a@b.com' },
    } as unknown as Request;
    const res = createMockRes();
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: 'board-7',
      userId: 'user-1',
      role: 'member',
    } as never);

    await requireBoardMember('boardId')(req, res as Response, next);

    expect(prisma.boardMember.findUnique).toHaveBeenCalledWith({
      where: { boardId_userId: { boardId: 'board-7', userId: 'user-1' } },
    });
    expect(req.boardId).toBe('board-7');
    expect(next).toHaveBeenCalled();
  });
});

describe('requireBoardAdmin', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
    vi.clearAllMocks();
  });

  it('returns 403 when boardId param is missing', async () => {
    const req = { params: {}, user: { id: 'user-1', email: 'a@b.com' } } as unknown as Request;
    const res = createMockRes();

    await requireBoardAdmin()(req, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied' });
  });

  it('returns 403 when user is missing', async () => {
    const req = { params: { id: 'board-1' } } as unknown as Request;
    const res = createMockRes();

    await requireBoardAdmin()(req, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied' });
  });

  it('returns 403 when user is a member but not an admin', async () => {
    const req = {
      params: { id: 'board-1' },
      user: { id: 'user-1', email: 'a@b.com' },
    } as unknown as Request;
    const res = createMockRes();
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: 'board-1',
      userId: 'user-1',
      role: 'member',
    } as never);

    await requireBoardAdmin()(req, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Admin access required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when user has no membership', async () => {
    const req = {
      params: { id: 'board-1' },
      user: { id: 'user-1', email: 'a@b.com' },
    } as unknown as Request;
    const res = createMockRes();
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue(null);

    await requireBoardAdmin()(req, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Admin access required' });
  });

  it('attaches boardId and calls next when user is an admin', async () => {
    const req = {
      params: { id: 'board-1' },
      user: { id: 'user-1', email: 'a@b.com' },
    } as unknown as Request;
    const res = createMockRes();
    vi.mocked(prisma.boardMember.findUnique).mockResolvedValue({
      boardId: 'board-1',
      userId: 'user-1',
      role: 'admin',
    } as never);

    await requireBoardAdmin()(req, res as Response, next);

    expect(req.boardId).toBe('board-1');
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
