import { z } from 'zod';

const createCardSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

const updateCardSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).nullable().optional(),
    position: z.number().int().min(0).optional(),
    listId: z.string().uuid().optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.position !== undefined ||
      data.listId !== undefined,
    { message: 'At least one of title, description, position, or listId is required' },
  );

const cardParamsSchema = z.object({
  id: z.string().uuid(),
});

const cardListParamsSchema = z.object({
  listId: z.string().uuid(),
});

export { createCardSchema, updateCardSchema, cardParamsSchema, cardListParamsSchema };
