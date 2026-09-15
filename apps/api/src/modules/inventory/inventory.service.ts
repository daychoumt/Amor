import type { MovementType } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error-handler.js';

type CreateMovementInput = {
  productId: string;
  type: MovementType;
  delta: number;
  reason?: string;
};

export async function createStockMovement(input: CreateMovementInput) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: input.productId },
      select: { id: true, active: true },
    });

    if (!product || !product.active) {
      throw new AppError('Produto não encontrado.', 404);
    }

    if (input.delta < 0) {
      const requiredStock = Math.abs(input.delta);
      const result = await tx.product.updateMany({
        where: {
          id: input.productId,
          active: true,
          currentStock: { gte: requiredStock },
        },
        data: {
          currentStock: { increment: input.delta },
        },
      });

      if (result.count === 0) {
        throw new AppError('Estoque insuficiente para esta saída.', 422);
      }
    } else {
      await tx.product.update({
        where: { id: input.productId },
        data: { currentStock: { increment: input.delta } },
      });
    }

    const movement = await tx.stockMovement.create({
      data: {
        productId: input.productId,
        type: input.type,
        delta: input.delta,
        reason: input.reason,
      },
    });

    const updatedProduct = await tx.product.findUniqueOrThrow({
      where: { id: input.productId },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    return { movement, product: updatedProduct };
  });
}
