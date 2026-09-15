import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const electronics = await prisma.category.upsert({
    where: { name: 'Eletrônicos' },
    update: {},
    create: { name: 'Eletrônicos' },
  });

  const office = await prisma.category.upsert({
    where: { name: 'Escritório' },
    update: {},
    create: { name: 'Escritório' },
  });

  const products = [
    {
      sku: 'MOU-001',
      name: 'Mouse sem fio',
      costPrice: 48.9,
      salePrice: 89.9,
      currentStock: 18,
      minimumStock: 6,
      categoryId: electronics.id,
    },
    {
      sku: 'TEC-001',
      name: 'Teclado mecânico',
      costPrice: 169.9,
      salePrice: 289.9,
      currentStock: 7,
      minimumStock: 5,
      categoryId: electronics.id,
    },
    {
      sku: 'CAD-001',
      name: 'Caderno executivo',
      costPrice: 18.5,
      salePrice: 34.9,
      currentStock: 4,
      minimumStock: 8,
      categoryId: office.id,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: product,
      create: product,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
