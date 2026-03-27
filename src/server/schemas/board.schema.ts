import { z } from 'zod';

const createBoardSchema = z.object({
  name: z.string().min(1).max(100),
});

const updateBoardSchema = z.object({
  name: z.string().min(1).max(100),
});

const boardParamsSchema = z.object({
  id: z.string().uuid(),
});

export { createBoardSchema, updateBoardSchema, boardParamsSchema };
