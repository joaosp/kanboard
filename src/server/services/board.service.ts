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
  return prisma.board.findUnique({
    where: { id: boardId },
    include: {
      lists: {
        orderBy: { position: 'asc' },
        include: {
          cards: { orderBy: { position: 'asc' } },
        },
      },
      members: {
        include: { user: { select: { id: true, email: true, name: true } } },
      },
    },
  });
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
