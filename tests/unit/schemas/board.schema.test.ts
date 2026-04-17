import { createBoardSchema, updateBoardSchema, boardParamsSchema } from '../../../src/server/schemas/board.schema';

const validUuid = '11111111-1111-4111-8111-111111111111';

describe('board schemas', () => {
  describe('createBoardSchema', () => {
    it('accepts a valid name', () => {
      expect(createBoardSchema.safeParse({ name: 'My Board' }).success).toBe(true);
    });

    it('rejects an empty name', () => {
      expect(createBoardSchema.safeParse({ name: '' }).success).toBe(false);
    });

    it('rejects a name longer than 100 characters', () => {
      expect(createBoardSchema.safeParse({ name: 'x'.repeat(101) }).success).toBe(false);
    });
  });

  describe('updateBoardSchema', () => {
    it('requires name', () => {
      expect(updateBoardSchema.safeParse({}).success).toBe(false);
    });

    it('accepts a valid name', () => {
      expect(updateBoardSchema.safeParse({ name: 'Renamed' }).success).toBe(true);
    });
  });

  describe('boardParamsSchema', () => {
    it('accepts a uuid id', () => {
      expect(boardParamsSchema.safeParse({ id: validUuid }).success).toBe(true);
    });

    it('rejects a non-uuid id', () => {
      expect(boardParamsSchema.safeParse({ id: 'not-a-uuid' }).success).toBe(false);
    });
  });
});
