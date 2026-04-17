import { prisma } from '../prisma';

async function getUserBoards(userId: string) {
  return prisma.board.findMany({
    where: { members: { some: { userId } } },
    include: {
      members: {
        include: { user: { select: { id: true, email: true, name: true } } },
      },
    },
  });
}

async function getBoardById(boardId: string) {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      labels: { orderBy: { createdAt: 'asc' } },
      lists: {
        orderBy: { position: 'asc' },
        include: {
          cards: {
            orderBy: { position: 'asc' },
            include: {
              cardLabels: {
                orderBy: { createdAt: 'asc' },
                include: { label: true },
              },
            },
          },
        },
      },
      members: {
        include: { user: { select: { id: true, email: true, name: true } } },
      },
    },
  });

  if (!board) return board;

  return {
    ...board,
    lists: board.lists.map((list) => ({
      ...list,
      cards: list.cards.map((card) => {
        const { cardLabels, ...rest } = card;
        return {
          ...rest,
          labels: cardLabels.map((cl) => cl.label),
        };
      }),
    })),
  };
}

async function createBoard(name: string, userId: string) {
  return prisma.board.create({
    data: {
      name,
      members: {
        create: { userId, role: 'admin' },
      },
    },
  });
}

async function updateBoard(boardId: string, name: string) {
  return prisma.board.update({
    where: { id: boardId },
    data: { name },
  });
}

async function deleteBoard(boardId: string) {
  return prisma.board.delete({ where: { id: boardId } });
}

export { getUserBoards, getBoardById, createBoard, updateBoard, deleteBoard };
