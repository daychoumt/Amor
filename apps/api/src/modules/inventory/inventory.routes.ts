import { Router } from 'express';
import { createMovementSchema } from './inventory.schemas.js';
import { createStockMovement } from './inventory.service.js';

export const inventoryRoutes = Router();

inventoryRoutes.post('/products/:productId/movements', async (request, response, next) => {
  try {
    const input = createMovementSchema.parse(request.body);
    const result = await createStockMovement({
      productId: request.params.productId,
      ...input,
    });

    return response.status(201).json(result);
  } catch (error) {
    return next(error);
  }
});
