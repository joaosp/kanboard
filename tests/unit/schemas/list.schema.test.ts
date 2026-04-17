import {
  createListSchema,
  updateListSchema,
  listParamsSchema,
  listBoardParamsSchema,
} from '../../../src/server/schemas/list.schema';

const validUuid = '11111111-1111-4111-8111-111111111111';

describe('list schemas', () => {
  describe('createListSchema', () => {
    it('accepts a valid name', () => {
      expect(createListSchema.safeParse({ name: 'Todo' }).success).toBe(true);
    });

    it('rejects empty name', () => {
      expect(createListSchema.safeParse({ name: '' }).success).toBe(false);
    });

    it('rejects name over 100 characters', () => {
      expect(createListSchema.safeParse({ name: 'x'.repeat(101) }).success).toBe(false);
    });
  });

  describe('updateListSchema', () => {
    it('accepts empty object', () => {
      expect(updateListSchema.safeParse({}).success).toBe(true);
    });

    it('accepts name-only update', () => {
      expect(updateListSchema.safeParse({ name: 'Done' }).success).toBe(true);
    });

    it('accepts position-only update', () => {
      expect(updateListSchema.safeParse({ position: 3 }).success).toBe(true);
    });

    it('rejects negative position', () => {
      expect(updateListSchema.safeParse({ position: -1 }).success).toBe(false);
    });

    it('rejects non-integer position', () => {
      expect(updateListSchema.safeParse({ position: 2.5 }).success).toBe(false);
    });
  });

  describe('listParamsSchema', () => {
    it('accepts a uuid id', () => {
      expect(listParamsSchema.safeParse({ id: validUuid }).success).toBe(true);
    });

    it('rejects non-uuid id', () => {
      expect(listParamsSchema.safeParse({ id: 'nope' }).success).toBe(false);
    });
  });

  describe('listBoardParamsSchema', () => {
    it('accepts a uuid boardId', () => {
      expect(listBoardParamsSchema.safeParse({ boardId: validUuid }).success).toBe(true);
    });

    it('rejects non-uuid boardId', () => {
      expect(listBoardParamsSchema.safeParse({ boardId: 'nope' }).success).toBe(false);
    });
  });
});
