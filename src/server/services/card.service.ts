import { prisma } from '../prisma';

async function createCard(listId: string, { title, description }: { title: string; description?: string }) {
  const count = await prisma.card.count({ where: { listId } });
  return prisma.card.create({
    data: { listId, title, description, position: count },
  });
}

async function getCardById(cardId: string) {
  return prisma.card.findUnique({
    where: { id: cardId },
    include: { list: { select: { id: true, boardId: true } } },
  });
}

async function updateCard(cardId: string, data: { title?: string; description?: string; position?: number; listId?: string }) {
  return prisma.card.update({
    where: { id: cardId },
    data,
  });
}

async function deleteCard(cardId: string) {
  return prisma.card.delete({ where: { id: cardId } });
}

export { createCard, getCardById, updateCard, deleteCard };
