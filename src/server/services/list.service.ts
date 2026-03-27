import { prisma } from '../prisma';

async function createList(boardId: string, name: string) {
  const count = await prisma.list.count({ where: { boardId } });
  return prisma.list.create({
    data: { boardId, name, position: count },
  });
}

async function updateList(listId: string, data: { name?: string; position?: number }) {
  return prisma.list.update({
    where: { id: listId },
    data,
  });
}

async function deleteList(listId: string) {
  return prisma.list.delete({ where: { id: listId } });
}

export { createList, updateList, deleteList };
