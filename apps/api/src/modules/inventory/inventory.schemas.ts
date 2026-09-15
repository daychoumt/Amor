import { z } from 'zod';

export const createMovementSchema = z
  .object({
    type: z.enum(['ENTRY', 'EXIT', 'ADJUSTMENT']),
    delta: z.coerce.number().int().refine((value) => value !== 0, 'A quantidade não pode ser zero.'),
    reason: z.string().trim().max(240).optional(),
  })
  .superRefine((data, context) => {
    if (data.type === 'ENTRY' && data.delta < 0) {
      context.addIssue({
        code: 'custom',
        path: ['delta'],
        message: 'Entradas precisam ter quantidade positiva.',
      });
    }

    if (data.type === 'EXIT' && data.delta > 0) {
      context.addIssue({
        code: 'custom',
        path: ['delta'],
        message: 'Saídas precisam ter quantidade negativa.',
      });
    }
  });
