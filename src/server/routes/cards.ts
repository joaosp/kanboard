import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate, validateParams } from '../middleware/validate';
import { createCardSchema, updateCardSchema, cardParamsSchema, cardListParamsSchema } from '../schemas/card.schema';
import { createCard, getCardById, updateCard, moveCard, deleteCard } from '../services/card.service';
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

    const body = req.body as {
      title?: string;
      description?: string | null;
      position?: number;
      listId?: string;
    };

    const isCrossListMove = body.listId !== undefined && body.listId !== card.list.id;

    if (isCrossListMove) {
      const targetList = await prisma.list.findUnique({ where: { id: body.listId! } });
      if (!targetList) throw createAppError('Target list not found', 404);
      if (targetList.boardId !== card.list.boardId) {
        throw createAppError('Cannot move card across boards', 409);
      }

      // Re-check membership on the target board (same board today; future-proof against cross-board moves).
      const targetMember = await prisma.boardMember.findUnique({
        where: { boardId_userId: { boardId: targetList.boardId, userId: req.user!.id } },
      });
      if (!targetMember) throw createAppError('Not a member of this board', 403);

      const position = body.position ?? 0;
      await moveCard(cardId, { listId: body.listId, position });
      const updated = await getCardById(cardId);
      res.json({ data: updated });
      return;
    }

    if (body.position !== undefined) {
      await moveCard(cardId, { position: body.position });
      const updated = await getCardById(cardId);
      res.json({ data: updated });
      return;
    }

    const { position: _position, listId: _listId, ...rest } = body;
    const updated = await updateCard(cardId, rest);
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
