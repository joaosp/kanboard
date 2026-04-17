import type { Request, Response, NextFunction } from 'express';
import { AppError, createAppError, errorHandler } from '../../../src/server/middleware/errors';

function createMockRes(): Partial<Response> {
  return {
    status: vi.fn().mockReturnThis() as unknown as Response['status'],
    json: vi.fn().mockReturnThis() as unknown as Response['json'],
  };
}

describe('errors middleware', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  describe('createAppError', () => {
    it('returns an AppError with the given statusCode', () => {
      const err = createAppError('nope', 404);
      expect(err).toBeInstanceOf(AppError);
      expect(err.message).toBe('nope');
      expect(err.statusCode).toBe(404);
      expect(err.isOperational).toBe(true);
    });
  });

  describe('errorHandler', () => {
    it('formats an AppError with its statusCode', () => {
      const res = createMockRes();
      const next: NextFunction = vi.fn();

      errorHandler(createAppError('forbidden', 403), {} as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'forbidden' });
      expect(consoleError).not.toHaveBeenCalled();
    });

    it('returns 500 Internal server error for unknown errors', () => {
      const res = createMockRes();
      const next: NextFunction = vi.fn();

      errorHandler(new Error('boom'), {} as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
      expect(consoleError).toHaveBeenCalled();
    });
  });
});
