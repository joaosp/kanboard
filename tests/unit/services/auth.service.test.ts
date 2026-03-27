vi.mock('../../../src/server/prisma', () => ({
  prisma: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

const { mockHash, mockCompare } = vi.hoisted(() => ({
  mockHash: vi.fn(),
  mockCompare: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: { hash: mockHash, compare: mockCompare },
  hash: mockHash,
  compare: mockCompare,
}));

import { prisma } from '../../../src/server/prisma';
import { registerUser, loginUser } from '../../../src/server/services/auth.service';

describe('auth.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should hash password and create user', async () => {
      mockHash.mockResolvedValue('hashed-password' as never);
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await registerUser({
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
      });

      expect(mockHash).toHaveBeenCalledWith('password123', 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { email: 'test@example.com', name: 'Test User', passwordHash: 'hashed-password' },
      });
      expect(result).toEqual(expect.objectContaining({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
      }));
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw on duplicate email', async () => {
      mockHash.mockResolvedValue('hashed-password' as never);
      vi.mocked(prisma.user.create).mockRejectedValue(
        new Error('Unique constraint failed on the fields: (`email`)')
      );

      await expect(
        registerUser({ email: 'dup@example.com', name: 'Dup', password: 'pass' })
      ).rejects.toThrow();
    });
  });

  describe('loginUser', () => {
    it('should return user for valid credentials', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockCompare.mockResolvedValue(true as never);

      const result = await loginUser({ email: 'test@example.com', password: 'password123' });

      expect(result).toEqual(expect.objectContaining({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
      }));
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should return null for wrong password', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockCompare.mockResolvedValue(false as never);

      const result = await loginUser({ email: 'test@example.com', password: 'wrong' });

      expect(result).toBeNull();
    });

    it('should return null for non-existent email', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await loginUser({ email: 'nobody@example.com', password: 'pass' });

      expect(result).toBeNull();
    });
  });
});
