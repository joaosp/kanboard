import { prisma } from '../prisma';

async function createCard(listId: string, { title, description }: { title: string; description?: string }) {
  const count = await prisma.card.count({ where: { listId } });
  return prisma.card.create({
    data: { listId, title, description, position: count },
  });
}

async function getCardById(cardId: string) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      list: { select: { id: true, boardId: true } },
      cardLabels: {
        orderBy: { createdAt: 'asc' },
        include: { label: true },
      },
    },
  });

  if (!card) return card;

  const { cardLabels, ...rest } = card;
  return {
    ...rest,
    labels: cardLabels.map((cl) => cl.label),
  };
}

async function updateCard(cardId: string, data: { title?: string; description?: string | null; position?: number; listId?: string }) {
  return prisma.card.update({
    where: { id: cardId },
    data,
  });
}

async function moveCard(
  cardId: string,
  { listId: targetListId, position: requestedPosition }: { listId?: string; position: number },
) {
  return prisma.$transaction(async (tx) => {
    const card = await tx.card.findUnique({ where: { id: cardId } });
    if (!card) {
      throw new Error('Card not found');
    }

    const sourceListId = card.listId;
    const destinationListId = targetListId ?? sourceListId;
    const isCrossList = destinationListId !== sourceListId;

    // Load source cards ordered by position, excluding the moving card.
    const sourceCards = await tx.card.findMany({
      where: { listId: sourceListId, NOT: { id: cardId } },
      orderBy: { position: 'asc' },
      select: { id: true, position: true },
    });

    // Load destination cards if moving across lists, excluding the moving card if it's somehow present.
    const destinationCards = isCrossList
      ? await tx.card.findMany({
          where: { listId: destinationListId, NOT: { id: cardId } },
          orderBy: { position: 'asc' },
          select: { id: true, position: true },
        })
      : sourceCards;

    // Clamp insertion index into [0, destinationCards.length].
    const clampedPosition = Math.max(0, Math.min(requestedPosition, destinationCards.length));

    // Build the new destination ordering with the moving card inserted at clampedPosition.
    const movingEntry = { id: cardId, position: clampedPosition };
    const newDestination = [
      ...destinationCards.slice(0, clampedPosition),
      movingEntry,
      ...destinationCards.slice(clampedPosition),
    ];

    // Re-number destination contiguously; issue one update per changed position.
    for (let index = 0; index < newDestination.length; index += 1) {
      const entry = newDestination[index];
      if (!entry) continue;
      if (entry.id === cardId) {
        await tx.card.update({
          where: { id: cardId },
          data: { listId: destinationListId, position: index },
        });
      } else if (entry.position !== index) {
        await tx.card.update({
          where: { id: entry.id },
          data: { position: index },
        });
      }
    }

    // For cross-list moves, also compact the source list since the moving card left a hole.
    if (isCrossList) {
      for (let index = 0; index < sourceCards.length; index += 1) {
        const entry = sourceCards[index];
        if (!entry) continue;
        if (entry.position !== index) {
          await tx.card.update({
            where: { id: entry.id },
            data: { position: index },
          });
        }
      }
    }

    return tx.card.update({
      where: { id: cardId },
      data: {},
    });
  });
}

async function deleteCard(cardId: string) {
  return prisma.card.delete({ where: { id: cardId } });
}

export { createCard, getCardById, updateCard, moveCard, deleteCard };
