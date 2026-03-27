import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate, validateParams } from '../middleware/validate';
import { createCardSchema, updateCardSchema, cardParamsSchema, cardListParamsSchema } from '../schemas/card.schema';
import { createCard, getCardById, updateCard, deleteCard } from '../services/card.service';
import { prisma } from '../prisma';
import { createAppError } from '../middleware/errors';

const router = Router();

router.post('/:listId/cards', requireAuth, validateParams(cardListParamsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listId = req.params.listId as string;
    const list = await prisma.list.findUnique({ where: { id: listId } });
    if (!list) throw createAppError('List not found', 404);

    const member = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId: list.boardId, userId: req.user!.id } },
    });
    if (!member) throw createAppError('Not a member of this board', 403);

    validate(createCardSchema)(req, res, async () => {
      try {
        const card = await createCard(listId, req.body);
        res.status(201).json({ data: card });
      } catch (err) {
        next(err);
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/cards/:id', requireAuth, validateParams(cardParamsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cardId = req.params.id as string;
    const card = await getCardById(cardId);
    if (!card) throw createAppError('Card not found', 404);

    const member = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId: card.list.boardId, userId: req.user!.id } },
    });
    if (!member) throw createAppError('Not a member of this board', 403);

    res.json({ data: card });
  } catch (err) {
    next(err);
  }
});

router.patch('/cards/:id', requireAuth, validateParams(cardParamsSchema), validate(updateCardSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cardId = req.params.id as string;
    const card = await getCardById(cardId);
    if (!card) throw createAppError('Card not found', 404);

    const member = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId: card.list.boardId, userId: req.user!.id } },
    });
    if (!member) throw createAppError('Not a member of this board', 403);

    const updated = await updateCard(cardId, req.body);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/cards/:id', requireAuth, validateParams(cardParamsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cardId = req.params.id as string;
    const card = await getCardById(cardId);
    if (!card) throw createAppError('Card not found', 404);

    const member = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId: card.list.boardId, userId: req.user!.id } },
    });
    if (!member) throw createAppError('Not a member of this board', 403);

    await deleteCard(cardId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export { router as cardsRouter };
