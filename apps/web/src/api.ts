import type { NewProduct, Product } from './types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333';
const DEMO_MODE = import.meta.env.VITE_DEMO === 'true';
const STORAGE_KEY = 'stockflow:demo:products';

const seedProducts: Product[] = [
  {
    id: 'demo-1',
    sku: 'CAF-001',
    name: 'Café Premium 500g',
    description: 'Produto demonstrativo',
    costPrice: '18.90',
    salePrice: '29.90',
    currentStock: 18,
    minimumStock: 8,
    category: { id: 'cat-1', name: 'Alimentos' },
    supplier: { id: 'sup-1', name: 'Fornecedor Demo' },
  },
  {
    id: 'demo-2',
    sku: 'AGU-002',
    name: 'Água Mineral 500ml',
    description: 'Produto demonstrativo',
    costPrice: '1.20',
    salePrice: '3.50',
    currentStock: 6,
    minimumStock: 10,
    category: { id: 'cat-2', name: 'Bebidas' },
    supplier: { id: 'sup-1', name: 'Fornecedor Demo' },
  },
  {
    id: 'demo-3',
    sku: 'CHO-003',
    name: 'Chocolate 90g',
    description: 'Produto demonstrativo',
    costPrice: '4.80',
    salePrice: '8.90',
    currentStock: 24,
    minimumStock: 6,
    category: { id: 'cat-3', name: 'Doces' },
    supplier: { id: 'sup-2', name: 'Distribuidora Demo' },
  },
];

function cloneSeed() {
  return seedProducts.map((product) => ({
    ...product,
    category: product.category ? { ...product.category } : null,
    supplier: product.supplier ? { ...product.supplier } : null,
  }));
}

function readDemoProducts(): Product[] {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    const initial = cloneSeed();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  try {
    return JSON.parse(saved) as Product[];
  } catch {
    const initial = cloneSeed();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
}

function writeDemoProducts(products: Product[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? 'Não foi possível concluir a operação.');
  }

  return response.json() as Promise<T>;
}

export async function getProducts(search = '') {
  if (DEMO_MODE) {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    const products = readDemoProducts();
    if (!term) return products;

    return products.filter(
      (product) =>
        product.name.toLocaleLowerCase('pt-BR').includes(term) ||
        product.sku.toLocaleLowerCase('pt-BR').includes(term),
    );
  }

  const url = new URL('/products', API_URL);
  if (search) url.searchParams.set('search', search);

  const response = await fetch(url);
  return parseResponse<Product[]>(response);
}

export async function createProduct(input: NewProduct) {
  if (DEMO_MODE) {
    const products = readDemoProducts();
    const normalizedSku = input.sku.trim().toUpperCase();

    if (products.some((product) => product.sku.toUpperCase() === normalizedSku)) {
      throw new Error('Já existe um produto com este SKU.');
    }

    const product: Product = {
      id: crypto.randomUUID(),
      sku: normalizedSku,
      name: input.name.trim(),
      costPrice: input.costPrice.toFixed(2),
      salePrice: input.salePrice.toFixed(2),
      currentStock: 0,
      minimumStock: input.minimumStock,
      category: null,
      supplier: null,
    };

    products.unshift(product);
    writeDemoProducts(products);
    return product;
  }

  const response = await fetch(`${API_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  return parseResponse<Product>(response);
}

export async function moveStock(productId: string, delta: number, reason: string) {
  if (DEMO_MODE) {
    const products = readDemoProducts();
    const index = products.findIndex((product) => product.id === productId);

    if (index < 0) throw new Error('Produto não encontrado.');

    const nextStock = products[index].currentStock + delta;
    if (nextStock < 0) {
      throw new Error('A saída informada é maior que o estoque disponível.');
    }

    products[index] = { ...products[index], currentStock: nextStock };
    writeDemoProducts(products);
    void reason;

    return { product: products[index] };
  }

  const response = await fetch(`${API_URL}/products/${productId}/movements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: delta > 0 ? 'ENTRY' : 'EXIT',
      delta,
      reason,
    }),
  });

  return parseResponse<{ product: Product }>(response);
}
