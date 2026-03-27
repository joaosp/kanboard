import bcrypt from 'bcryptjs';
const { hash } = bcrypt;
import { prisma } from '../src/server/prisma.ts';

async function main() {
  const demoPassword = await hash('demo123', 10);
  const adminPassword = await hash('admin123', 10);

  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@example.com',
      name: 'Demo User',
      passwordHash: demoPassword,
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Admin User',
      passwordHash: adminPassword,
    },
  });

  const boardAlpha = await prisma.board.create({
    data: {
      name: 'Project Alpha',
      members: {
        create: [
          { userId: adminUser.id, role: 'admin' },
          { userId: demoUser.id, role: 'member' },
        ],
      },
      lists: {
        create: [
          {
            name: 'To Do',
            position: 0,
            cards: {
              create: [
                { title: 'Set up CI/CD pipeline', position: 0 },
                { title: 'Design database schema', position: 1 },
                { title: 'Write API documentation', position: 2 },
              ],
            },
          },
          {
            name: 'In Progress',
            position: 1,
            cards: {
              create: [
                { title: 'Implement user authentication', position: 0 },
                { title: 'Build dashboard layout', position: 1 },
              ],
            },
          },
          {
            name: 'Done',
            position: 2,
            cards: {
              create: [
                { title: 'Initialize project repository', position: 0 },
              ],
            },
          },
        ],
      },
    },
  });

  const boardBeta = await prisma.board.create({
    data: {
      name: 'Project Beta',
      members: {
        create: [
          { userId: adminUser.id, role: 'admin' },
          { userId: demoUser.id, role: 'member' },
        ],
      },
      lists: {
        create: [
          {
            name: 'To Do',
            position: 0,
            cards: {
              create: [
                { title: 'Research caching strategies', position: 0 },
                { title: 'Plan sprint retrospective', position: 1 },
              ],
            },
          },
          {
            name: 'In Progress',
            position: 1,
            cards: {
              create: [
                { title: 'Refactor error handling middleware', position: 0 },
              ],
            },
          },
          {
            name: 'Done',
            position: 2,
            cards: {
              create: [
                { title: 'Set up development environment', position: 0 },
              ],
            },
          },
        ],
      },
    },
  });

  console.warn('Seed complete:', {
    users: [demoUser.id, adminUser.id],
    boards: [boardAlpha.id, boardBeta.id],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
