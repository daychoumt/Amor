import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error-handler.js';

type CreateProductInput = {
  sku: string;
  name: string;
  description?: string;
  costPrice: number;
  salePrice: number;
  minimumStock: number;
  categoryId?: string;
  supplierId?: string;
};

export async function listProducts(search?: string, lowStock = false) {
  const where: Prisma.ProductWhereInput = {
    active: true,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const products = await prisma.product.findMany({
    where,
    include: {
      category: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  });

  return lowStock
    ? products.filter((product) => product.currentStock <= product.minimumStock)
    : products;
}

export async function createProduct(input: CreateProductInput) {
  const existing = await prisma.product.findUnique({ where: { sku: input.sku } });

  if (existing) {
    throw new AppError('Já existe um produto com este SKU.', 409);
  }

  return prisma.product.create({
    data: input,
    include: {
      category: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
    },
  });
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      supplier: true,
      movements: {
        take: 20,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!product) {
    throw new AppError('Produto não encontrado.', 404);
  }

  return product;
}
