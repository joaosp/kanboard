import { z } from 'zod';

const createListSchema = z.object({
  name: z.string().min(1).max(100),
});

const updateListSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  position: z.number().int().min(0).optional(),
});

const listParamsSchema = z.object({
  id: z.string().uuid(),
});

const listBoardParamsSchema = z.object({
  boardId: z.string().uuid(),
});

export { createListSchema, updateListSchema, listParamsSchema, listBoardParamsSchema };
