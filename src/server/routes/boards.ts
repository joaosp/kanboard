import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate, validateParams } from '../middleware/validate';
import { requireBoardMember, requireBoardAdmin } from '../middleware/board-access';
import { createBoardSchema, updateBoardSchema, boardParamsSchema } from '../schemas/board.schema';
import { getUserBoards, getBoardById, createBoard, updateBoard, deleteBoard } from '../services/board.service';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const boards = await getUserBoards(req.user!.id);
    res.json({ data: boards });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, validate(createBoardSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const board = await createBoard(req.body.name, req.user!.id);
    res.status(201).json({ data: board });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, validateParams(boardParamsSchema), requireBoardMember(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const board = await getBoardById(req.params.id as string);
    res.json({ data: board });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireAuth, validateParams(boardParamsSchema), requireBoardAdmin(), validate(updateBoardSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const board = await updateBoard(req.params.id as string, req.body.name);
    res.json({ data: board });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, validateParams(boardParamsSchema), requireBoardAdmin(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteBoard(req.params.id as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export { router as boardsRouter };
