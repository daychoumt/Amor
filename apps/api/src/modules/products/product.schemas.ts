import { z } from 'zod';

export const createProductSchema = z.object({
  sku: z.string().trim().min(2).max(40).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  costPrice: z.coerce.number().min(0),
  salePrice: z.coerce.number().min(0),
  minimumStock: z.coerce.number().int().min(0).default(0),
  categoryId: z.string().trim().min(1).optional(),
  supplierId: z.string().trim().min(1).optional(),
});

export const listProductsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  lowStock: z.enum(['true', 'false']).optional(),
});
