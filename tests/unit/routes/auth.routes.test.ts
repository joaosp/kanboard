import express from 'express';
import request from 'supertest';

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

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(() => 'signed-jwt-token'),
    verify: vi.fn(),
  },
}));

import { prisma } from '../../../src/server/prisma';
import { authRouter } from '../../../src/server/routes/auth';
import { errorHandler } from '../../../src/server/middleware/errors';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use(errorHandler);
  return app;
}

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
});

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 201 with user and token on success', async () => {
    mockHash.mockResolvedValue('hashed');
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'user-1',
      email: 'a@b.com',
      name: 'Alice',
      passwordHash: 'hashed',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(makeApp())
      .post('/api/auth/register')
      .send({ email: 'a@b.com', name: 'Alice', password: 'secret1' });

    expect(res.status).toBe(201);
    expect(res.body.data.token).toBe('signed-jwt-token');
    expect(res.body.data.user).toMatchObject({ id: 'user-1', email: 'a@b.com', name: 'Alice' });
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('returns 400 when body is invalid', async () => {
    const res = await request(makeApp())
      .post('/api/auth/register')
      .send({ email: 'not-email', name: '', password: 'x' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with user and token on valid credentials', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      email: 'a@b.com',
      name: 'Alice',
      passwordHash: 'hashed',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockCompare.mockResolvedValue(true);

    const res = await request(makeApp())
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'secret1' });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBe('signed-jwt-token');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('returns 401 when user not found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const res = await request(makeApp())
      .post('/api/auth/login')
      .send({ email: 'nobody@b.com', password: 'secret1' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('returns 401 when password does not match', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      email: 'a@b.com',
      name: 'Alice',
      passwordHash: 'hashed',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockCompare.mockResolvedValue(false);

    const res = await request(makeApp())
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('returns 400 when body is invalid', async () => {
    const res = await request(makeApp())
      .post('/api/auth/login')
      .send({ email: 'not-email' });

    expect(res.status).toBe(400);
  });
});
