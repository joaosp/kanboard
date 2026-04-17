import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate, validateParams } from '../middleware/validate';
import { requireBoardMember } from '../middleware/board-access';
import {
  createLabelSchema,
  updateLabelSchema,
  attachLabelSchema,
  labelParamsSchema,
  labelBoardParamsSchema,
  cardLabelParamsSchema,
  cardLabelDetachParamsSchema,
} from '../schemas/label.schema';
import {
  listBoardLabels,
  createLabel,
  updateLabel,
  deleteLabel,
  attachLabelToCard,
  detachLabelFromCard,
  getCardWithBoard,
  getLabelWithBoard,
} from '../services/label.service';
import { prisma } from '../prisma';
import { createAppError } from '../middleware/errors';

const router = Router();

router.get(
  '/:boardId/labels',
  requireAuth,
  validateParams(labelBoardParamsSchema),
  requireBoardMember('boardId'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const labels = await listBoardLabels(req.params.boardId as string);
      res.json({ data: labels });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/:boardId/labels',
  requireAuth,
  validateParams(labelBoardParamsSchema),
  requireBoardMember('boardId'),
  validate(createLabelSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const label = await createLabel(req.params.boardId as string, req.body);
      res.status(201).json({ data: label });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/labels/:id',
  requireAuth,
  validateParams(labelParamsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const labelId = req.params.id as string;
      const label = await getLabelWithBoard(labelId);
      if (!label) throw createAppError('Label not found', 404);

      const member = await prisma.boardMember.findUnique({
        where: { boardId_userId: { boardId: label.boardId, userId: req.user!.id } },
      });
      if (!member) throw createAppError('Not a member of this board', 403);

      validate(updateLabelSchema)(req, res, async () => {
        try {
          const { label: updated } = await updateLabel(labelId, req.body);
          res.json({ data: updated });
        } catch (err) {
          next(err);
        }
      });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/labels/:id',
  requireAuth,
  validateParams(labelParamsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const labelId = req.params.id as string;
      const label = await getLabelWithBoard(labelId);
      if (!label) throw createAppError('Label not found', 404);

      const member = await prisma.boardMember.findUnique({
        where: { boardId_userId: { boardId: label.boardId, userId: req.user!.id } },
      });
      if (!member) throw createAppError('Not a member of this board', 403);

      await deleteLabel(labelId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/cards/:cardId/labels',
  requireAuth,
  validateParams(cardLabelParamsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cardId = req.params.cardId as string;
      const card = await getCardWithBoard(cardId);
      if (!card) throw createAppError('Card not found', 404);

      const member = await prisma.boardMember.findUnique({
        where: { boardId_userId: { boardId: card.list.boardId, userId: req.user!.id } },
      });
      if (!member) throw createAppError('Not a member of this board', 403);

      validate(attachLabelSchema)(req, res, async () => {
        try {
          const row = await attachLabelToCard(cardId, req.body.labelId);
          res.status(200).json({ data: row });
        } catch (err) {
          next(err);
        }
      });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/cards/:cardId/labels/:labelId',
  requireAuth,
  validateParams(cardLabelDetachParamsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cardId = req.params.cardId as string;
      const labelId = req.params.labelId as string;
      const card = await getCardWithBoard(cardId);
      if (!card) throw createAppError('Card not found', 404);

      const member = await prisma.boardMember.findUnique({
        where: { boardId_userId: { boardId: card.list.boardId, userId: req.user!.id } },
      });
      if (!member) throw createAppError('Not a member of this board', 403);

      await detachLabelFromCard(cardId, labelId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

export { router as labelsRouter };
