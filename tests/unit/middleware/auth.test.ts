import type { Request, Response, NextFunction } from 'express';

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}));

import jwt from 'jsonwebtoken';
import { requireAuth } from '../../../src/server/middleware/auth';

function createMockReq(authHeader?: string): Partial<Request> {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
  } as Partial<Request>;
}

function createMockRes(): Partial<Response> {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis() as unknown as Response['status'],
    json: vi.fn().mockReturnThis() as unknown as Response['json'],
  };
  return res;
}

describe('requireAuth middleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
    vi.clearAllMocks();
  });

  it('should return 401 if no Authorization header', () => {
    const req = createMockReq();
    const res = createMockRes();

    requireAuth(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if token is invalid', () => {
    const req = createMockReq('Bearer invalid-token');
    const res = createMockRes();

    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new Error('invalid token');
    });

    requireAuth(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should set req.user and call next() with valid token', () => {
    const req = createMockReq('Bearer valid-token');
    const res = createMockRes();
    const payload = { id: 'user-1', email: 'test@example.com' };

    vi.mocked(jwt.verify).mockReturnValue(payload as unknown as ReturnType<typeof jwt.verify>);

    requireAuth(req as Request, res as Response, next);

    expect(req.user).toEqual({ id: 'user-1', email: 'test@example.com' });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
