import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { createAppError } from '../middleware/errors';

type LabelColor = 'red' | 'amber' | 'green' | 'blue' | 'purple' | 'slate';

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

async function listBoardLabels(boardId: string) {
  return prisma.label.findMany({
    where: { boardId },
    orderBy: { createdAt: 'asc' },
  });
}

async function createLabel(boardId: string, { name, color }: { name: string; color: LabelColor }) {
  const trimmed = name.trim();
  const existing = await prisma.label.findFirst({
    where: {
      boardId,
      name: { equals: trimmed, mode: 'insensitive' },
    },
  });
  if (existing) {
    throw createAppError(`A label named "${trimmed}" already exists on this board.`, 400);
  }

  try {
    return await prisma.label.create({
      data: { boardId, name: trimmed, color },
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw createAppError(`A label named "${trimmed}" already exists on this board.`, 400);
    }
    throw err;
  }
}

async function getLabelWithBoard(labelId: string) {
  return prisma.label.findUnique({
    where: { id: labelId },
    select: { id: true, boardId: true, name: true, color: true, createdAt: true, updatedAt: true },
  });
}

async function updateLabel(labelId: string, patch: { name?: string; color?: LabelColor }) {
  const current = await prisma.label.findUnique({ where: { id: labelId } });
  if (!current) throw createAppError('Label not found', 404);

  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (normalizeName(current.name) !== normalizeName(trimmed)) {
      const duplicate = await prisma.label.findFirst({
        where: {
          boardId: current.boardId,
          name: { equals: trimmed, mode: 'insensitive' },
          NOT: { id: labelId },
        },
      });
      if (duplicate) {
        throw createAppError(`A label named "${trimmed}" already exists on this board.`, 400);
      }
    }
  }

  const data: { name?: string; color?: LabelColor } = {};
  if (patch.name !== undefined) data.name = patch.name.trim();
  if (patch.color !== undefined) data.color = patch.color;

  try {
    const label = await prisma.label.update({
      where: { id: labelId },
      data,
    });
    return { label, boardId: current.boardId };
  } catch (err) {
    if (isUniqueViolation(err) && patch.name !== undefined) {
      throw createAppError(`A label named "${patch.name.trim()}" already exists on this board.`, 400);
    }
    throw err;
  }
}

async function deleteLabel(labelId: string) {
  return prisma.label.delete({ where: { id: labelId } });
}

async function getCardWithBoard(cardId: string) {
  return prisma.card.findUnique({
    where: { id: cardId },
    include: { list: { select: { id: true, boardId: true } } },
  });
}

async function attachLabelToCard(cardId: string, labelId: string) {
  const card = await getCardWithBoard(cardId);
  if (!card) throw createAppError('Card not found', 404);

  const label = await prisma.label.findUnique({ where: { id: labelId } });
  if (!label) throw createAppError('Label not found', 404);

  if (label.boardId !== card.list.boardId) {
    throw createAppError("Label does not belong to this card's board", 400);
  }

  return prisma.cardLabel.upsert({
    where: { cardId_labelId: { cardId, labelId } },
    create: { cardId, labelId },
    update: {},
  });
}

async function detachLabelFromCard(cardId: string, labelId: string) {
  return prisma.cardLabel.deleteMany({ where: { cardId, labelId } });
}

export {
  listBoardLabels,
  createLabel,
  updateLabel,
  deleteLabel,
  attachLabelToCard,
  detachLabelFromCard,
  getCardWithBoard,
  getLabelWithBoard,
};
