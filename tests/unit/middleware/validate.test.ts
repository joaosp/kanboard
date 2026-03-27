import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../../../src/server/middleware/validate';

const testSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
});

function createMockReq(body: unknown): Partial<Request> {
  return { body } as Partial<Request>;
}

function createMockRes(): Partial<Response> {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis() as unknown as Response['status'],
    json: vi.fn().mockReturnThis() as unknown as Response['json'],
  };
  return res;
}

describe('validate middleware', () => {
  let next: NextFunction;
  const middleware = validate(testSchema);

  beforeEach(() => {
    next = vi.fn();
  });

  it('should call next() for valid body', () => {
    const req = createMockReq({ name: 'John', email: 'john@example.com' });
    const res = createMockRes();

    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 400 with error message for invalid body', () => {
    const req = createMockReq({ name: 'John', email: 'not-an-email' });
    const res = createMockRes();

    middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('Invalid email') });
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle missing fields', () => {
    const req = createMockReq({});
    const res = createMockRes();

    middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: expect.any(String) });
    expect(next).not.toHaveBeenCalled();
  });
});
