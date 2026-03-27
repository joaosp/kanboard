import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors.map((e) => e.message).join(', ') });
      return;
    }
    req.body = result.data;
    next();
  };
}

function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({ error: result.error.errors.map((e) => e.message).join(', ') });
      return;
    }
    next();
  };
}

export { validate, validateParams };
