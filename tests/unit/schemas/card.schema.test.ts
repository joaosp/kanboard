import {
  createCardSchema,
  updateCardSchema,
  cardParamsSchema,
  cardListParamsSchema,
} from '../../../src/server/schemas/card.schema';

const validUuid = '11111111-1111-4111-8111-111111111111';

describe('card schemas', () => {
  describe('createCardSchema', () => {
    it('accepts title without description', () => {
      expect(createCardSchema.safeParse({ title: 'Hello' }).success).toBe(true);
    });

    it('accepts title with description', () => {
      expect(createCardSchema.safeParse({ title: 'Hello', description: 'world' }).success).toBe(true);
    });

    it('rejects empty title', () => {
      expect(createCardSchema.safeParse({ title: '' }).success).toBe(false);
    });

    it('rejects title over 200 characters', () => {
      expect(createCardSchema.safeParse({ title: 'x'.repeat(201) }).success).toBe(false);
    });

    it('rejects description over 2000 characters', () => {
      expect(
        createCardSchema.safeParse({ title: 'ok', description: 'x'.repeat(2001) }).success,
      ).toBe(false);
    });
  });

  describe('updateCardSchema', () => {
    it('rejects an empty body', () => {
      expect(updateCardSchema.safeParse({}).success).toBe(false);
    });

    it('accepts null description', () => {
      expect(updateCardSchema.safeParse({ description: null }).success).toBe(true);
    });

    it('accepts partial updates', () => {
      expect(
        updateCardSchema.safeParse({ title: 'New', position: 2, listId: validUuid }).success,
      ).toBe(true);
    });

    it('accepts only position', () => {
      expect(updateCardSchema.safeParse({ position: 3 }).success).toBe(true);
    });

    it('accepts listId + position for a cross-list move', () => {
      expect(
        updateCardSchema.safeParse({ listId: validUuid, position: 0 }).success,
      ).toBe(true);
    });

    it('rejects negative position', () => {
      expect(updateCardSchema.safeParse({ position: -1 }).success).toBe(false);
    });

    it('rejects non-integer position', () => {
      expect(updateCardSchema.safeParse({ position: 1.5 }).success).toBe(false);
    });

    it('rejects non-uuid listId', () => {
      expect(updateCardSchema.safeParse({ listId: 'nope' }).success).toBe(false);
    });
  });

  describe('cardParamsSchema', () => {
    it('accepts a uuid', () => {
      expect(cardParamsSchema.safeParse({ id: validUuid }).success).toBe(true);
    });

    it('rejects a non-uuid', () => {
      expect(cardParamsSchema.safeParse({ id: 'nope' }).success).toBe(false);
    });
  });

  describe('cardListParamsSchema', () => {
    it('accepts a uuid listId', () => {
      expect(cardListParamsSchema.safeParse({ listId: validUuid }).success).toBe(true);
    });

    it('rejects a non-uuid listId', () => {
      expect(cardListParamsSchema.safeParse({ listId: 'nope' }).success).toBe(false);
    });
  });
});
