import { registerSchema, loginSchema } from '../../../src/server/schemas/auth.schema';

describe('auth schemas', () => {
  describe('registerSchema', () => {
    it('accepts a valid payload', () => {
      const result = registerSchema.safeParse({
        email: 'a@b.com',
        name: 'Alice',
        password: 'secret1',
      });
      expect(result.success).toBe(true);
    });

    it('rejects an invalid email', () => {
      const result = registerSchema.safeParse({ email: 'not-an-email', name: 'A', password: 'secret1' });
      expect(result.success).toBe(false);
    });

    it('rejects passwords shorter than 6 characters', () => {
      const result = registerSchema.safeParse({ email: 'a@b.com', name: 'A', password: 'hi' });
      expect(result.success).toBe(false);
    });

    it('rejects empty name', () => {
      const result = registerSchema.safeParse({ email: 'a@b.com', name: '', password: 'secret1' });
      expect(result.success).toBe(false);
    });

    it('rejects name longer than 100 characters', () => {
      const result = registerSchema.safeParse({
        email: 'a@b.com',
        name: 'x'.repeat(101),
        password: 'secret1',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('accepts a valid payload', () => {
      const result = loginSchema.safeParse({ email: 'a@b.com', password: 'x' });
      expect(result.success).toBe(true);
    });

    it('rejects empty password', () => {
      const result = loginSchema.safeParse({ email: 'a@b.com', password: '' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email', () => {
      const result = loginSchema.safeParse({ email: 'nope', password: 'x' });
      expect(result.success).toBe(false);
    });
  });
});
