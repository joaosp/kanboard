import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema } from '../schemas/auth.schema';
import { registerUser, loginUser, generateToken } from '../services/auth.service';
import { createAppError } from '../middleware/errors';

const router = Router();

router.post('/register', validate(registerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await registerUser(req.body);
    const token = generateToken(user);
    res.status(201).json({ data: { user, token } });
  } catch (err) {
    next(err);
  }
});

router.post('/login', validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await loginUser(req.body);
    if (!user) {
      throw createAppError('Invalid email or password', 401);
    }
    const token = generateToken(user);
    res.json({ data: { user, token } });
  } catch (err) {
    next(err);
  }
});

export { router as authRouter };
