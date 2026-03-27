import bcrypt from 'bcryptjs';
const { hash, compare } = bcrypt;
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';

async function registerUser({ email, name, password }: { email: string; name: string; password: string }) {
  const passwordHash = await hash(password, 10);
  const user = await prisma.user.create({
    data: { email, name, passwordHash },
  });
  const { passwordHash: _hash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

async function loginUser({ email, password }: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const valid = await compare(password, user.passwordHash);
  if (!valid) return null;

  const { passwordHash: _pw, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

function generateToken(user: { id: string; email: string }): string {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET!, { expiresIn: '7d' });
}

export { registerUser, loginUser, generateToken };
