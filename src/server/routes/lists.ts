import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate, validateParams } from '../middleware/validate';
import { requireBoardMember } from '../middleware/board-access';
import { createListSchema, updateListSchema, listParamsSchema, listBoardParamsSchema } from '../schemas/list.schema';
import { createList, updateList, deleteList } from '../services/list.service';
import { prisma } from '../prisma';
import { createAppError } from '../middleware/errors';

const router = Router();

router.post('/:boardId/lists', requireAuth, validateParams(listBoardParamsSchema), requireBoardMember('boardId'), validate(createListSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await createList(req.params.boardId as string, req.body.name);
    res.status(201).json({ data: list });
  } catch (err) {
    next(err);
  }
});

router.patch('/lists/:id', requireAuth, validateParams(listParamsSchema), validate(updateListSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listId = req.params.id as string;
    const list = await prisma.list.findUnique({ where: { id: listId } });
    if (!list) throw createAppError('List not found', 404);

    const member = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId: list.boardId, userId: req.user!.id } },
    });
    if (!member) throw createAppError('Not a member of this board', 403);

    const updated = await updateList(listId, req.body);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/lists/:id', requireAuth, validateParams(listParamsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listId = req.params.id as string;
    const list = await prisma.list.findUnique({ where: { id: listId } });
    if (!list) throw createAppError('List not found', 404);

    const member = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId: list.boardId, userId: req.user!.id } },
    });
    if (!member) throw createAppError('Not a member of this board', 403);

    await deleteList(listId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export { router as listsRouter };
