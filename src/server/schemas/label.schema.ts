import { z } from 'zod';

const LABEL_COLORS = ['red', 'amber', 'green', 'blue', 'purple', 'slate'] as const;

const createLabelSchema = z.object({
  name: z.string().trim().min(1).max(50),
  color: z.enum(LABEL_COLORS),
});

const updateLabelSchema = z
  .object({
    name: z.string().trim().min(1).max(50).optional(),
    color: z.enum(LABEL_COLORS).optional(),
  })
  .refine((d) => d.name !== undefined || d.color !== undefined, {
    message: 'At least one of name or color is required.',
  });

const attachLabelSchema = z.object({
  labelId: z.string().uuid(),
});

const labelParamsSchema = z.object({
  id: z.string().uuid(),
});

const labelBoardParamsSchema = z.object({
  boardId: z.string().uuid(),
});

const cardLabelParamsSchema = z.object({
  cardId: z.string().uuid(),
});

const cardLabelDetachParamsSchema = z.object({
  cardId: z.string().uuid(),
  labelId: z.string().uuid(),
});

export {
  LABEL_COLORS,
  createLabelSchema,
  updateLabelSchema,
  attachLabelSchema,
  labelParamsSchema,
  labelBoardParamsSchema,
  cardLabelParamsSchema,
  cardLabelDetachParamsSchema,
};
